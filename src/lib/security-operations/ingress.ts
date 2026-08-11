import { createHash } from 'node:crypto';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { systemActor } from '@/lib/automation/system-actor';
import { ingestSecurityEvent } from './service';
import { verifySecurityIngressSignature } from './crypto';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();

function secretForOrg(orgId: string) {
  const mapped = String(process.env.OPSIQO_SECURITY_EVENT_INGEST_SECRETS_JSON || '').trim();
  if (mapped) {
    try {
      const map = JSON.parse(mapped) as Record<string, string>;
      const secret = String(map[orgId] || '').trim();
      if (secret.length >= 32) return secret;
    } catch {
      throw new ApiError(
        503,
        'Per-organization security ingress secret configuration is invalid.',
        'security_ingest_config_invalid',
      );
    }
  }

  const secret = String(process.env.OPSIQO_SECURITY_EVENT_INGEST_SECRET || '').trim();
  const boundOrgId = String(process.env.OPSIQO_SECURITY_EVENT_INGEST_ORG_ID || '').trim();
  if (process.env.NODE_ENV === 'production' && (!boundOrgId || boundOrgId !== orgId)) {
    throw new ApiError(
      403,
      'Single-tenant security ingress secret is not bound to this organization.',
      'security_ingest_org_not_allowed',
    );
  }
  return secret;
}

export async function ingestSignedSecurityEvent(input: {
  orgId: string;
  timestamp: string;
  signature: string;
  body: string;
  correlationId?: string;
}) {
  const secret = secretForOrg(input.orgId);
  if (secret.length < 32) {
    throw new ApiError(503, 'Security event ingestion is not configured.', 'security_ingest_not_configured');
  }
  if (Buffer.byteLength(input.body, 'utf8') > 1024 * 1024) {
    throw new ApiError(413, 'Security event payload exceeds the 1 MiB limit.', 'payload_too_large');
  }

  const timestampMs = Number(input.timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    throw new ApiError(
      401,
      'Security event timestamp is outside the allowed replay window.',
      'stale_security_event',
    );
  }
  if (!verifySecurityIngressSignature(secret, input.timestamp, input.body, input.signature)) {
    throw new ApiError(401, 'Invalid security event signature.', 'invalid_security_signature');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.body);
  } catch {
    throw new ApiError(400, 'Security event body must be JSON.', 'invalid_json');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Security event body must be a JSON object.', 'invalid_security_event');
  }

  const db = adminDb();
  const signatureHash = sha(`${input.orgId}:${input.timestamp}:${input.signature.toLowerCase()}`);
  const signatureRef = db.doc(
    `organizations/${input.orgId}/securityEventSignatureIndex/${signatureHash}`,
  );
  const claim = await db.runTransaction(async (tx: any) => {
    const existing = await tx.get(signatureRef);
    const data = existing.exists ? existing.data() : undefined;
    if (data?.status === 'completed' && data.eventId) {
      return { duplicate: true, eventId: String(data.eventId) };
    }
    if (
      data?.status === 'processing' &&
      new Date(String(data.processingUntil || 0)).getTime() > Date.now()
    ) {
      throw new ApiError(
        409,
        'Security event delivery is already being processed.',
        'security_event_processing',
      );
    }
    tx.set(
      signatureRef,
      {
        id: signatureHash,
        signatureHash: sha(input.signature),
        timestamp: timestampMs,
        status: 'processing',
        processingUntil: new Date(Date.now() + 120_000).toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: data?.createdAt || now(),
        updatedAt: now(),
      },
      { merge: false },
    );
    return { duplicate: false, eventId: undefined };
  });

  if (claim.duplicate && claim.eventId) {
    const existingEvent = await db
      .doc(`organizations/${input.orgId}/securityEvents/${claim.eventId}`)
      .get();
    if (existingEvent.exists) return existingEvent.data();
    throw new ApiError(
      409,
      'Security event replay index references unavailable evidence.',
      'security_event_replay_inconsistent',
    );
  }

  try {
    const actor = systemActor(input.orgId, 'system:security-event-ingress');
    const event = await ingestSecurityEvent(actor, {
      ...(payload as Record<string, unknown>),
      source: 'siem',
      correlationId:
        input.correlationId || String((payload as Record<string, unknown>).correlationId || signatureHash),
    });
    await signatureRef.set(
      {
        status: 'completed',
        eventId: event.id,
        processingUntil: null,
        completedAt: now(),
        updatedAt: now(),
      },
      { merge: true },
    );
    return event;
  } catch (error) {
    await signatureRef.set(
      {
        status: 'rejected',
        processingUntil: null,
        errorCode: error instanceof ApiError ? error.code : 'security_event_processing_failed',
        updatedAt: now(),
      },
      { merge: true },
    );
    throw error;
  }
}
