import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase/admin';

type ResendDeliveryStatus =
  | 'submitted'
  | 'sent'
  | 'delivered'
  | 'delivery_delayed'
  | 'bounced'
  | 'complained'
  | 'failed'
  | 'suppressed';

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: {
    id?: string;
    email_id?: string;
    created_at?: string;
    reason?: string;
    bounce?: { message?: string };
  };
};

const webhookEventKey = (value: string) => createHash('sha256').update(value).digest('hex');
const messageKey = (value: string) => encodeURIComponent(value);
const terminalFailure = new Set<ResendDeliveryStatus>(['bounced', 'complained', 'failed', 'suppressed']);

function secretBytes(secret: string) {
  const payload = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  try {
    const decoded = Buffer.from(payload, 'base64');
    return decoded.length ? decoded : Buffer.from(payload, 'utf8');
  } catch {
    return Buffer.from(payload, 'utf8');
  }
}

function signatureCandidates(header: string) {
  return header
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.startsWith('v1,') ? part.slice(3) : part);
}

export function verifyResendWebhookSignature(rawBody: string, headers: Headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) throw new Error('RESEND_WEBHOOK_SECRET is not configured.');

  const id = headers.get('svix-id') || '';
  const timestamp = headers.get('svix-timestamp') || '';
  const signature = headers.get('svix-signature') || '';
  if (!id || !timestamp || !signature) throw new Error('Missing Resend webhook signature headers.');

  const unix = Number(timestamp);
  if (!Number.isFinite(unix)) throw new Error('Invalid Resend webhook timestamp.');
  if (Math.abs(Math.floor(Date.now() / 1000) - unix) > 300) throw new Error('Stale Resend webhook timestamp.');

  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secretBytes(secret)).update(signed).digest();

  const valid = signatureCandidates(signature).some((candidate) => {
    try {
      const actual = Buffer.from(candidate, 'base64');
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  });
  if (!valid) throw new Error('Invalid Resend webhook signature.');
  return { id, timestamp };
}

function statusFromEvent(type: string): ResendDeliveryStatus | undefined {
  switch (type) {
    case 'email.sent': return 'sent';
    case 'email.delivered': return 'delivered';
    case 'email.delivery_delayed': return 'delivery_delayed';
    case 'email.bounced': return 'bounced';
    case 'email.complained': return 'complained';
    case 'email.failed': return 'failed';
    case 'email.suppressed': return 'suppressed';
    default: return undefined;
  }
}

export async function processResendWebhook(rawBody: string, headers: Headers) {
  const verified = verifyResendWebhookSignature(rawBody, headers);
  const event = JSON.parse(rawBody) as ResendWebhookEvent;
  const type = String(event.type || '');
  const providerMessageId = String(event.data?.email_id || event.data?.id || '');
  if (!providerMessageId) return { processed: false, reason: 'missing_message_id' as const };

  const db = adminDb();
  const indexRef = db.doc(`invitationDeliveryMessageIndex/${messageKey(providerMessageId)}`);
  const indexSnap = await indexRef.get();
  if (!indexSnap.exists) return { processed: false, reason: 'unknown_message_id' as const };

  const orgId = String(indexSnap.data()?.orgId || '');
  const invitationId = String(indexSnap.data()?.invitationId || '');
  if (!orgId || !invitationId) return { processed: false, reason: 'invalid_message_index' as const };

  const eventAt = String(event.created_at || event.data?.created_at || new Date().toISOString());
  const parsedEventMs = Date.parse(eventAt);
  const eventMs = Number.isFinite(parsedEventMs) ? parsedEventMs : Date.now();
  const dedupeRef = db.doc(`resendWebhookEvents/${webhookEventKey(verified.id)}`);
  const invitationRef = db.doc(`organizations/${orgId}/invitations/${invitationId}`);
  let duplicate = false;

  await db.runTransaction(async (tx) => {
    const [dedupeSnap, invitationSnap] = await Promise.all([tx.get(dedupeRef), tx.get(invitationRef)]);
    if (dedupeSnap.exists) {
      duplicate = true;
      return;
    }

    const invitation = invitationSnap.data() as {
      deliveryStatus?: ResendDeliveryStatus | 'manual';
      lastDeliveryEventAt?: string;
    } | undefined;

    const patch: Record<string, unknown> = {
      providerMessageId,
      deliveryProvider: 'resend',
      lastDeliveryAt: new Date(eventMs).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const previousEventMs = invitation?.lastDeliveryEventAt ? Date.parse(invitation.lastDeliveryEventAt) : 0;
    const currentStatus = invitation?.deliveryStatus;
    const proposed = statusFromEvent(type);
    const isNewerOrEqual = !Number.isFinite(previousEventMs) || eventMs >= previousEventMs;

    if (isNewerOrEqual) {
      patch.lastDeliveryEventAt = new Date(eventMs).toISOString();
      if (proposed) patch.deliveryStatus = proposed;
      if ((type === 'email.opened' || type === 'email.clicked') && !terminalFailure.has(currentStatus as ResendDeliveryStatus)) {
        patch.deliveryStatus = 'delivered';
      }
    }

    if (type === 'email.opened') patch.deliveryOpenedAt = new Date(eventMs).toISOString();
    if (type === 'email.clicked') patch.deliveryClickedAt = new Date(eventMs).toISOString();

    if (type === 'email.bounced' || type === 'email.failed' || type === 'email.suppressed') {
      patch.deliveryError = String(event.data?.reason || event.data?.bounce?.message || type).slice(0, 500);
    } else if (proposed === 'delivered' || type === 'email.opened' || type === 'email.clicked') {
      patch.deliveryError = null;
    }

    if (invitationSnap.exists) tx.set(invitationRef, patch, { merge: true });
    tx.create(dedupeRef, {
      id: verified.id,
      provider: 'resend',
      providerMessageId,
      orgId,
      invitationId,
      eventType: type,
      eventAt: new Date(eventMs).toISOString(),
      createdAt: new Date().toISOString(),
    });
  });

  return { processed: !duplicate, duplicate, invitationId, eventType: type };
}
