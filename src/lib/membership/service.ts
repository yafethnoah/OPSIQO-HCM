import { createHash, randomBytes, randomUUID } from 'crypto';
import type { ActorContext, Invitation, Membership, Role } from '@/domain/security';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { invitationAcceptSchema, invitationActionSchema, invitationCreateSchema } from './schemas';
import { identityFromRequest } from '@/lib/auth/session';

const now = () => new Date().toISOString();
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const emailKey = (value: string) => encodeURIComponent(value.trim().toLowerCase());

function mayInviteRole(actorRole: Role, invitedRole: Role) {
  if (actorRole === 'super_admin' || actorRole === 'org_admin') return true;
  if (actorRole === 'hr_admin') return ['hr_partner', 'manager', 'employee'].includes(invitedRole);
  if (actorRole === 'hr_partner') return ['manager', 'employee'].includes(invitedRole);
  return false;
}

export async function listInvitations(actor: ActorContext) {
  const snap = await adminDb().collection(`organizations/${actor.orgId}/invitations`).orderBy('createdAt', 'desc').limit(100).get();
  return snap.docs.map((d) => {
    const invitation = d.data() as Invitation;
    if (invitation.status === 'pending' && invitation.expiresAt < now()) return { ...invitation, status: 'expired' as const };
    return invitation;
  });
}

async function deliverInvitation(email: string, role: Role, inviteUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_FROM_EMAIL;
  if (!apiKey || !from) return { delivery: 'manual' as const, inviteUrl };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'You are invited to OPSIQO HCM',
      html: `<p>You have been invited to OPSIQO HCM as <strong>${role.replaceAll('_', ' ')}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This invitation expires automatically.</p>`,
    }),
  });
  if (!response.ok) return { delivery: 'manual' as const, inviteUrl, deliveryError: `Email provider returned ${response.status}.` };
  return { delivery: 'email' as const, inviteUrl };
}

function invitationUrl(orgId: string, token: string) {
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/accept-invite?orgId=${encodeURIComponent(orgId)}&token=${encodeURIComponent(token)}`;
}

export async function createInvitation(actor: ActorContext, raw: unknown) {
  const input = invitationCreateSchema.parse(raw);
  if (!mayInviteRole(actor.role, input.role)) throw new ApiError(403, `Role ${actor.role} cannot invite ${input.role}.`, 'role_escalation_blocked');
  const db = adminDb();
  const timestamp = now();
  const email = input.email.trim().toLowerCase();
  const id = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
  const invitation: Invitation = {
    id,
    email,
    role: input.role,
    status: 'pending',
    workerId: input.workerId,
    invitedBy: actor.uid,
    expiresAt,
    createdAt: timestamp,
    lastSentAt: timestamp,
    sendCount: 1,
  };
  const emailIndexRef = db.doc(`organizations/${actor.orgId}/invitationEmailIndex/${emailKey(email)}`);
  const tokenIndexRef = db.doc(`organizations/${actor.orgId}/invitationTokenIndex/${tokenHash}`);
  const invitationRef = db.doc(`organizations/${actor.orgId}/invitations/${id}`);

  await db.runTransaction(async (tx) => {
    const existingIndex = await tx.get(emailIndexRef);
    if (existingIndex.exists) {
      const existingId = existingIndex.data()?.invitationId as string | undefined;
      if (existingId) {
        const existing = await tx.get(db.doc(`organizations/${actor.orgId}/invitations/${existingId}`));
        const data = existing.data() as Invitation | undefined;
        if (data?.status === 'pending' && data.expiresAt > timestamp) {
          throw new ApiError(409, 'A valid pending invitation already exists for this email.', 'invitation_exists');
        }
      }
    }
    if (input.workerId) {
      const workerSnap = await tx.get(db.doc(`organizations/${actor.orgId}/workers/${input.workerId}`));
      if (!workerSnap.exists) throw new ApiError(400, 'Linked worker does not exist.', 'invalid_worker');
    }
    tx.create(invitationRef, invitation);
    tx.set(emailIndexRef, { invitationId: id, email, status: 'pending', expiresAt, updatedAt: timestamp });
    tx.create(tokenIndexRef, { invitationId: id, createdAt: timestamp, expiresAt });
    const audit = buildAudit(actor, { action: 'membership.invite', entityType: 'invitation', entityId: id, after: invitation });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  });

  const inviteUrl = invitationUrl(actor.orgId, token);
  const delivery = await deliverInvitation(email, input.role, inviteUrl);
  return { invitation, ...delivery };
}

export async function actOnInvitation(actor: ActorContext, invitationId: string, raw: unknown) {
  const input = invitationActionSchema.parse(raw);
  if (input.action === 'revoke') return revokeInvitation(actor, invitationId, input.reason);
  return resendInvitation(actor, invitationId, input.expiresInDays);
}

async function revokeInvitation(actor: ActorContext, invitationId: string, reason?: string) {
  const db = adminDb();
  const invitationRef = db.doc(`organizations/${actor.orgId}/invitations/${invitationId}`);
  const tokenQuery = await db.collection(`organizations/${actor.orgId}/invitationTokenIndex`).where('invitationId', '==', invitationId).get();
  const tokenRefs = tokenQuery.docs.map((d) => d.ref);
  const timestamp = now();
  let result!: Invitation;

  await db.runTransaction(async (tx) => {
    const invitationSnap = await tx.get(invitationRef);
    const tokenSnaps: any[] = [];
    for (const ref of tokenRefs) tokenSnaps.push(await tx.get(ref));
    if (!invitationSnap.exists) throw new ApiError(404, 'Invitation not found.', 'invitation_not_found');
    const invitation = invitationSnap.data() as Invitation;
    if (!mayInviteRole(actor.role, invitation.role)) throw new ApiError(403, `Role ${actor.role} cannot revoke an invitation for ${invitation.role}.`, 'role_escalation_blocked');
    if (invitation.status === 'accepted') throw new ApiError(409, 'Accepted invitations cannot be revoked.', 'invitation_accepted');
    if (invitation.status === 'revoked') throw new ApiError(409, 'Invitation is already revoked.', 'invitation_revoked');
    result = { ...invitation, status: 'revoked', revokedAt: timestamp, revokedByUid: actor.uid, revokeReason: reason };
    tx.update(invitationRef, { status: 'revoked', revokedAt: timestamp, revokedByUid: actor.uid, revokeReason: reason || null });
    for (const snap of tokenSnaps) if (snap.exists) tx.delete(snap.ref);
    tx.set(db.doc(`organizations/${actor.orgId}/invitationEmailIndex/${emailKey(invitation.email)}`), { invitationId, email: invitation.email, status: 'revoked', updatedAt: timestamp }, { merge: true });
    const audit = buildAudit(actor, { action: 'membership.invitation.revoke', entityType: 'invitation', entityId: invitationId, before: invitation, after: result, metadata: { reason: reason || null } });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  });
  return { invitation: result };
}

async function resendInvitation(actor: ActorContext, invitationId: string, expiresInDays: number) {
  const db = adminDb();
  const invitationRef = db.doc(`organizations/${actor.orgId}/invitations/${invitationId}`);
  const tokenQuery = await db.collection(`organizations/${actor.orgId}/invitationTokenIndex`).where('invitationId', '==', invitationId).get();
  const tokenRefs = tokenQuery.docs.map((d) => d.ref);
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const tokenIndexRef = db.doc(`organizations/${actor.orgId}/invitationTokenIndex/${tokenHash}`);
  const timestamp = now();
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
  let result!: Invitation;

  await db.runTransaction(async (tx) => {
    const invitationSnap = await tx.get(invitationRef);
    const oldTokenSnaps: any[] = [];
    for (const ref of tokenRefs) oldTokenSnaps.push(await tx.get(ref));
    const newTokenSnap = await tx.get(tokenIndexRef);
    if (!invitationSnap.exists) throw new ApiError(404, 'Invitation not found.', 'invitation_not_found');
    if (newTokenSnap.exists) throw new ApiError(409, 'Generated token collision. Retry the request.', 'token_collision');
    const invitation = invitationSnap.data() as Invitation;
    if (!mayInviteRole(actor.role, invitation.role)) throw new ApiError(403, `Role ${actor.role} cannot resend an invitation for ${invitation.role}.`, 'role_escalation_blocked');
    if (invitation.status === 'accepted') throw new ApiError(409, 'Accepted invitations cannot be resent.', 'invitation_accepted');
    if (invitation.status === 'revoked') throw new ApiError(409, 'Revoked invitations cannot be resent. Create a new invitation.', 'invitation_revoked');
    result = { ...invitation, status: 'pending', expiresAt, lastSentAt: timestamp, sendCount: Number(invitation.sendCount || 1) + 1 };
    tx.update(invitationRef, { status: 'pending', expiresAt, lastSentAt: timestamp, sendCount: result.sendCount });
    for (const snap of oldTokenSnaps) if (snap.exists) tx.delete(snap.ref);
    tx.create(tokenIndexRef, { invitationId, createdAt: timestamp, expiresAt });
    tx.set(db.doc(`organizations/${actor.orgId}/invitationEmailIndex/${emailKey(invitation.email)}`), { invitationId, email: invitation.email, status: 'pending', expiresAt, updatedAt: timestamp }, { merge: true });
    const audit = buildAudit(actor, { action: 'membership.invitation.resend', entityType: 'invitation', entityId: invitationId, before: invitation, after: result, metadata: { rotatedToken: true } });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  });

  const inviteUrl = invitationUrl(actor.orgId, token);
  const delivery = await deliverInvitation(result.email, result.role, inviteUrl);
  return { invitation: result, ...delivery };
}

export async function acceptInvitation(request: Request, orgId: string, raw: unknown) {
  const input = invitationAcceptSchema.parse(raw);
  const identity = await identityFromRequest(request);
  const authenticatedEmail = identity.email?.trim().toLowerCase();
  if (!authenticatedEmail) throw new ApiError(409, 'Authenticated account has no email address.', 'email_required');

  const db = adminDb();
  const tokenHash = hashToken(input.token);
  const tokenIndexRef = db.doc(`organizations/${orgId}/invitationTokenIndex/${tokenHash}`);
  const tokenIndexSnap = await tokenIndexRef.get();
  if (!tokenIndexSnap.exists) throw new ApiError(404, 'Invitation token is invalid.', 'invalid_invitation');
  const invitationId = tokenIndexSnap.data()?.invitationId as string;
  const invitationRef = db.doc(`organizations/${orgId}/invitations/${invitationId}`);
  const timestamp = now();
  let membership!: Membership;

  await db.runTransaction(async (tx) => {
    const invitationSnap = await tx.get(invitationRef);
    if (!invitationSnap.exists) throw new ApiError(404, 'Invitation not found.', 'invalid_invitation');
    const invitation = invitationSnap.data() as Invitation;
    if (invitation.status !== 'pending') throw new ApiError(409, `Invitation is ${invitation.status}.`, 'invitation_not_pending');
    if (invitation.expiresAt <= timestamp) throw new ApiError(410, 'Invitation has expired.', 'invitation_expired');
    if (invitation.email !== authenticatedEmail) throw new ApiError(403, 'Invitation email does not match the signed-in account.', 'invitation_email_mismatch');

    let workerId = invitation.workerId;
    if (!workerId) {
      const workIndex = await tx.get(db.doc(`organizations/${orgId}/workEmailIndex/${emailKey(authenticatedEmail)}`));
      workerId = workIndex.data()?.workerId as string | undefined;
    }
    let linkedPersonId: string | undefined;
    if (workerId) {
      const workerSnap = await tx.get(db.doc(`organizations/${orgId}/workers/${workerId}`));
      linkedPersonId = workerSnap.data()?.personId as string | undefined;
    }

    membership = {
      uid: identity.uid,
      workerId,
      role: invitation.role,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    tx.set(db.doc(`organizations/${orgId}/memberships/${identity.uid}`), membership, { merge: true });
    tx.update(invitationRef, { status: 'accepted', acceptedAt: timestamp, acceptedByUid: identity.uid });
    tx.set(db.doc(`organizations/${orgId}/invitationEmailIndex/${emailKey(authenticatedEmail)}`), { invitationId, email: authenticatedEmail, status: 'accepted', updatedAt: timestamp }, { merge: true });
    tx.delete(tokenIndexRef);
    if (linkedPersonId) tx.set(db.doc(`organizations/${orgId}/people/${linkedPersonId}`), { authUid: identity.uid, updatedAt: timestamp }, { merge: true });

    const actor: ActorContext = { uid: identity.uid, orgId, workerId, role: invitation.role, permissions: [] };
    const audit = buildAudit(actor, { action: 'membership.accept_invitation', entityType: 'membership', entityId: identity.uid, after: membership, metadata: { invitationId } });
    tx.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
  });

  return membership;
}
