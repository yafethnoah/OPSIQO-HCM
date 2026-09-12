import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import {
  DEFAULT_PULSE_INVITATION_SETTINGS,
  type PulseInvitationSettings,
} from '@/domain/pulse-invitation-settings';
import { adminDb } from '@/lib/firebase/admin';
import { buildAudit } from '@/lib/audit/service';

const now = () => new Date().toISOString();

function isOptionalHttpsUrl(value: string) {
  if (!value) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

const templateText = (max: number) => z.string().trim().min(1).max(max);

export const pulseInvitationSettingsSchema = z.object({
  emailSubject: templateText(200),
  heading: templateText(240),
  introText: templateText(1500),
  iosAppUrl: z.string().trim().max(2048).refine(isOptionalHttpsUrl, 'iOS app URL must be blank or use HTTPS.'),
  androidAppUrl: z.string().trim().max(2048).refine(isOptionalHttpsUrl, 'Android app URL must be blank or use HTTPS.'),
  iosButtonLabel: templateText(80),
  androidButtonLabel: templateText(80),
  landingPath: z.enum(['/time', '/employee', '/home', '/dashboard']),
  webButtonLabel: templateText(80),
  passwordInstruction: templateText(1500),
  activationInstruction: templateText(1500),
  signInInstruction: templateText(1000),
  mfaInstruction: templateText(1000),
  permissionsInstruction: templateText(1500),
  attendanceInstruction: templateText(1500),
  supportText: templateText(1500),
});

export async function getPulseInvitationSettingsByOrgId(orgId: string): Promise<PulseInvitationSettings> {
  const snap = await adminDb().doc(`organizations/${orgId}/settings/pulseInvitation`).get();
  return snap.exists
    ? ({ ...DEFAULT_PULSE_INVITATION_SETTINGS, ...snap.data() } as PulseInvitationSettings)
    : DEFAULT_PULSE_INVITATION_SETTINGS;
}

export async function getPulseInvitationSettings(actor: ActorContext) {
  return getPulseInvitationSettingsByOrgId(actor.orgId);
}

export async function updatePulseInvitationSettings(actor: ActorContext, raw: unknown) {
  const input = pulseInvitationSettingsSchema.parse(raw);
  const ref = adminDb().doc(`organizations/${actor.orgId}/settings/pulseInvitation`);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? beforeSnap.data() : null;
  const next: PulseInvitationSettings = {
    id: 'pulse-invitation',
    ...input,
    updatedAt: now(),
    updatedBy: actor.uid,
  };
  const audit = buildAudit(actor, {
    action: 'membership.pulse_invitation_settings.update',
    entityType: 'settings',
    entityId: 'pulseInvitation',
    before,
    after: next,
  });
  const batch = adminDb().batch();
  batch.set(ref, next, { merge: true });
  batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return next;
}
