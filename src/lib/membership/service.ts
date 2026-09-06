import { createHash, randomBytes, randomUUID } from 'crypto';
import type { ActorContext, Invitation, Membership, Role } from '@/domain/security';
import { adminDb } from '@/lib/firebase/admin';
import { ensureInvitationIdentity, passwordSetupLink } from './account-access';
import { buildInvitationEmailHtml, invitationAcceptUrl, invitationDownloadUrl, invitationSignInUrl, pulseDistributionLinks, pulseInvitationAcceptUrl } from './invitation-email';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { invitationAcceptSchema, invitationActionSchema, invitationCreateSchema, pulseInvitationResolveSchema } from './schemas';
import { identityFromRequest, type IdentityContext } from '@/lib/auth/session';
import { systemActor } from '@/lib/automation/system-actor';

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


async function invitationGovernanceNotifyOnce(orgId: string, key: string, payload: { title: string; message: string; targetUid?: string; targetRole?: string; entityId: string; priority?: 'normal' | 'high' }) {
  const db = adminDb();
  const dedupeRef = db.doc(`organizations/${orgId}/notificationDedupe/${hashToken(key)}`);
  try {
    await dedupeRef.create({ key, createdAt: now() });
    const id = randomUUID();
    await db.doc(`organizations/${orgId}/notifications/${id}`).create({
      id,
      type: 'membership.invitation.governance',
      category: 'identity',
      title: payload.title,
      message: payload.message,
      targetUid: payload.targetUid,
      targetRole: payload.targetRole || (payload.targetUid ? undefined : 'hr_admin'),
      priority: payload.priority || 'normal',
      entityType: 'invitation',
      entityId: payload.entityId,
      status: 'unread',
      inAppVisible: true,
      emailStatus: 'disabled',
      emailAttempts: 0,
      createdAt: now(),
      updatedAt: now(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function processInvitationGovernance(orgId: string, limit = 500) {
  const db = adminDb();
  const timestamp = now();
  const soon = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const snap = await db.collection(`organizations/${orgId}/invitations`)
    .where('status', '==', 'pending')
    .limit(Math.max(1, Math.min(limit, 1000)))
    .get();
  const summary = { scanned: snap.size, expired: 0, expiringSoon: 0, tokenIndexesDeleted: 0, notifications: 0 };
  const actor = systemActor(orgId, 'system:invitation-governance');

  for (const doc of snap.docs) {
    const invitation = doc.data() as Invitation;
    if (invitation.expiresAt <= timestamp) {
      const tokenQuery = await db.collection(`organizations/${orgId}/invitationTokenIndex`).where('invitationId', '==', invitation.id).limit(20).get();
      const after = { ...invitation, status: 'expired' as const, expiredAt: timestamp };
      const audit = buildAudit(actor, { action: 'membership.invitation.expire', entityType: 'invitation', entityId: invitation.id, before: invitation, after });
      const batch = db.batch();
      batch.set(doc.ref, { status: 'expired', expiredAt: timestamp, updatedAt: timestamp }, { merge: true });
      if (invitation.membershipCreatedByInvitation && invitation.authUid) {
        batch.set(db.doc(`organizations/${orgId}/memberships/${invitation.authUid}`), { status: 'inactive', activationPending: false, updatedAt: timestamp }, { merge: true });
      }
      batch.set(db.doc(`organizations/${orgId}/invitationEmailIndex/${emailKey(invitation.email)}`), { invitationId: invitation.id, email: invitation.email, status: 'expired', updatedAt: timestamp }, { merge: true });
      for (const tokenDoc of tokenQuery.docs) batch.delete(tokenDoc.ref);
      batch.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
      await batch.commit();
      summary.expired += 1;
      summary.tokenIndexesDeleted += tokenQuery.size;
      if (await invitationGovernanceNotifyOnce(orgId, `invitation-expired:${invitation.id}:${invitation.expiresAt}`, {
        title: 'Invitation expired',
        message: `The pending invitation for ${invitation.email} expired and its remaining token index was removed. Create or resend an invitation only after reviewing current access need.`,
        targetUid: invitation.invitedBy,
        entityId: invitation.id,
        priority: 'normal',
      })) summary.notifications += 1;
      continue;
    }

    if (invitation.expiresAt <= soon) {
      summary.expiringSoon += 1;
      if (await invitationGovernanceNotifyOnce(orgId, `invitation-expiring:${invitation.id}:${invitation.expiresAt}`, {
        title: 'Invitation expires soon',
        message: `The invitation for ${invitation.email} expires within 48 hours. OPSIQO will not rotate or resend credentials automatically; review the access need before resending.`,
        targetUid: invitation.invitedBy,
        entityId: invitation.id,
        priority: 'normal',
      })) summary.notifications += 1;
    }
  }

  return summary;
}

async function organizationInvitationContext(orgId: string) {
  const snap = await adminDb().doc(`organizations/${orgId}`).get();
  const data = snap.data() as Record<string, unknown> | undefined;
  const supportEmail = [
    data?.supportEmail,
    data?.hrEmail,
    data?.contactEmail,
  ].map((value) => String(value || '').trim()).find(Boolean) || undefined;
  return {
    name: String(data?.name || 'Your organization'),
    supportEmail,
  };
}

async function deliverInvitation(input: {
  orgId: string;
  email: string;
  role: Role;
  inviteUrl: string;
  passwordSetupUrl: string;
  expiresAt: string;
  experience?: 'standard' | 'pulse';
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_FROM_EMAIL;
  const downloadUrl = invitationDownloadUrl();
  const signInUrl = invitationSignInUrl(input.orgId);
  const links = pulseDistributionLinks();

  if (!apiKey || !from) {
    return {
      delivery: 'manual' as const,
      inviteUrl: input.inviteUrl,
      passwordSetupUrl: input.passwordSetupUrl,
      downloadUrl,
      signInUrl,
      iosUrl: links.ios || undefined,
      androidUrl: links.android || undefined,
    };
  }

  const org = await organizationInvitationContext(input.orgId);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: input.experience === 'pulse'
        ? `Welcome to OPSIQO Pulse â€“ ${org.name}`
        : `${org.name} invited you to OPSIQO`,
      html: buildInvitationEmailHtml({
        organizationName: org.name,
        role: input.role,
        passwordSetupUrl: input.passwordSetupUrl,
        signInUrl,
        acceptUrl: input.inviteUrl,
        downloadUrl,
        expiresAt: input.expiresAt,
        experience: input.experience || 'standard',
        iosUrl: links.ios || undefined,
        androidUrl: links.android || undefined,
        supportEmail: org.supportEmail,
      }),
    }),
  });

  if (!response.ok) {
    return {
      delivery: 'manual' as const,
      inviteUrl: input.inviteUrl,
      passwordSetupUrl: input.passwordSetupUrl,
      downloadUrl,
      signInUrl,
      iosUrl: links.ios || undefined,
      androidUrl: links.android || undefined,
      deliveryError: `Email provider returned ${response.status}.`,
    };
  }

  return {
    delivery: 'email' as const,
    inviteUrl: input.inviteUrl,
    downloadUrl,
    signInUrl,
    iosUrl: links.ios || undefined,
    androidUrl: links.android || undefined,
  };
}

async function resolveInvitationWorker(orgId: string, invitation: Pick<Invitation, 'workerId' | 'email'>) {
  const db = adminDb();
  let workerId = invitation.workerId;
  if (!workerId) {
    const index = await db.doc(`organizations/${orgId}/workEmailIndex/${emailKey(invitation.email)}`).get();
    workerId = index.data()?.workerId as string | undefined;
  }
  if (!workerId) return { workerId: undefined, displayName: undefined, personId: undefined };
  const workerSnap = await db.doc(`organizations/${orgId}/workers/${workerId}`).get();
  if (!workerSnap.exists) throw new ApiError(409, 'The employee linked to this invitation no longer exists.', 'invitation_worker_missing');
  const worker = workerSnap.data() as { displayName?: string; workEmail?: string; personId?: string };
  const workerEmail = String(worker.workEmail || '').trim().toLowerCase();
  if (workerEmail && workerEmail !== invitation.email.trim().toLowerCase()) {
    throw new ApiError(409, 'The invitation email no longer matches the linked employee work email.', 'invitation_worker_email_mismatch');
  }
  return { workerId, displayName: worker.displayName, personId: worker.personId };
}

async function provisionInvitationAccess(actor: ActorContext, invitation: Invitation, token: string) {
  const db = adminDb();
  const timestamp = now();
  const worker = await resolveInvitationWorker(actor.orgId, invitation);
  const identity = await ensureInvitationIdentity(invitation.email, worker.displayName);
  const signInUrl = invitationSignInUrl(actor.orgId);
  const setupUrl = await passwordSetupLink(invitation.email, signInUrl);
  let membershipCreatedByInvitation = false;

  await db.runTransaction(async (tx) => {
    const invitationRef = db.doc(`organizations/${actor.orgId}/invitations/${invitation.id}`);
    const invitationSnap = await tx.get(invitationRef);
    if (!invitationSnap.exists) throw new ApiError(404, 'Invitation not found.', 'invitation_not_found');
    const currentInvitation = invitationSnap.data() as Invitation;
    if (currentInvitation.status !== 'pending') throw new ApiError(409, `Invitation is ${currentInvitation.status}.`, 'invitation_not_pending');

    const membershipRef = db.doc(`organizations/${actor.orgId}/memberships/${identity.uid}`);
    const membershipSnap = await tx.get(membershipRef);
    const existingMembership = membershipSnap.exists ? membershipSnap.data() as Membership : undefined;
    if (existingMembership?.status === 'active') {
      if (existingMembership.role !== invitation.role) {
        throw new ApiError(409, 'This Firebase identity already has active organization access with a different role. Change access through governed membership controls instead of an invitation.', 'existing_membership_role_conflict');
      }
      if (worker.workerId && existingMembership.workerId && existingMembership.workerId !== worker.workerId) {
        throw new ApiError(409, 'This Firebase identity is already linked to a different employee in this organization.', 'existing_membership_worker_conflict');
      }
    } else {
      membershipCreatedByInvitation = true;
    }

    const membership: Membership = {
      uid: identity.uid,
      workerId: worker.workerId || existingMembership?.workerId,
      role: invitation.role,
      status: 'active',
      orgUnitScope: existingMembership?.orgUnitScope,
      provisionedByInvitationId: membershipCreatedByInvitation ? invitation.id : existingMembership?.provisionedByInvitationId,
      activationPending: membershipCreatedByInvitation ? true : existingMembership?.activationPending,
      createdAt: existingMembership?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    tx.set(membershipRef, membership, { merge: true });
    if (worker.personId) {
      tx.set(db.doc(`organizations/${actor.orgId}/people/${worker.personId}`), { authUid: identity.uid, updatedAt: timestamp }, { merge: true });
    }
    tx.set(invitationRef, {
      workerId: worker.workerId || currentInvitation.workerId || null,
      authUid: identity.uid,
      accountStatus: 'password_setup_pending',
      authProvisionedAt: timestamp,
      passwordSetupGeneratedAt: timestamp,
      membershipCreatedByInvitation,
      updatedAt: timestamp,
    }, { merge: true });

    const audit = buildAudit(actor, {
      action: 'membership.invitation.provision_access',
      entityType: 'membership',
      entityId: identity.uid,
      before: existingMembership,
      after: membership,
      metadata: { invitationId: invitation.id, workerId: worker.workerId || null, authIdentityCreated: identity.created },
    });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  });

  const inviteUrl = invitation.experience === 'pulse'
    ? pulseInvitationAcceptUrl(actor.orgId, token)
    : invitationAcceptUrl(actor.orgId, token);
  const delivery = await deliverInvitation({
    orgId: actor.orgId,
    email: invitation.email,
    role: invitation.role,
    inviteUrl,
    passwordSetupUrl: setupUrl,
    expiresAt: invitation.expiresAt,
    experience: invitation.experience || 'standard',
  });
  const deliveryTimestamp = now();
  await db.doc(`organizations/${actor.orgId}/invitations/${invitation.id}`).set({
    deliveryStatus: delivery.delivery,
    lastDeliveryAt: deliveryTimestamp,
    deliveryError: 'deliveryError' in delivery ? delivery.deliveryError || null : null,
    updatedAt: deliveryTimestamp,
  }, { merge: true });

  return { ...delivery, authIdentity: identity.created ? 'created' as const : 'reused' as const };
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
    experience: input.experience,
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
      const workerEmail = String(workerSnap.data()?.workEmail || '').trim().toLowerCase();
      if (workerEmail && workerEmail !== email) {
        throw new ApiError(409, 'The invitation email must match the linked employee work email.', 'invitation_worker_email_mismatch');
      }
    }
    tx.create(invitationRef, invitation);
    tx.set(emailIndexRef, { invitationId: id, email, status: 'pending', expiresAt, updatedAt: timestamp });
    tx.create(tokenIndexRef, { invitationId: id, createdAt: timestamp, expiresAt });
    const audit = buildAudit(actor, { action: 'membership.invite', entityType: 'invitation', entityId: id, after: invitation });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  });

  try {
    const delivery = await provisionInvitationAccess(actor, invitation, token);
    const provisioned = await invitationRef.get();
    return { invitation: provisioned.data() as Invitation, ...delivery };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invitation account provisioning failed.';
    await invitationRef.set({ accountStatus: 'provisioning_failed', deliveryStatus: 'failed', deliveryError: message.slice(0, 500), updatedAt: now() }, { merge: true });
    throw error;
  }
}

export async function actOnInvitation(actor: ActorContext, invitationId: string, raw: unknown) {
  const input = invitationActionSchema.parse(raw);
  if (input.action === 'revoke') return revokeInvitation(actor, invitationId, input.reason);
  return resendInvitation(actor, invitationId, input.expiresInDays, input.experience);
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
    tx.update(invitationRef, { status: 'revoked', revokedAt: timestamp, revokedByUid: actor.uid, revokeReason: reason || null, updatedAt: timestamp });
    if (invitation.membershipCreatedByInvitation && invitation.authUid) {
      tx.set(db.doc(`organizations/${actor.orgId}/memberships/${invitation.authUid}`), { status: 'inactive', activationPending: false, updatedAt: timestamp }, { merge: true });
    }
    for (const snap of tokenSnaps) if (snap.exists) tx.delete(snap.ref);
    tx.set(db.doc(`organizations/${actor.orgId}/invitationEmailIndex/${emailKey(invitation.email)}`), { invitationId, email: invitation.email, status: 'revoked', updatedAt: timestamp }, { merge: true });
    const audit = buildAudit(actor, { action: 'membership.invitation.revoke', entityType: 'invitation', entityId: invitationId, before: invitation, after: result, metadata: { reason: reason || null } });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  });
  return { invitation: result };
}

async function resendInvitation(actor: ActorContext, invitationId: string, expiresInDays: number, experience?: 'standard' | 'pulse') {
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
    result = {
      ...invitation,
      experience: experience || invitation.experience || 'standard',
      status: 'pending',
      expiresAt,
      lastSentAt: timestamp,
      sendCount: Number(invitation.sendCount || 1) + 1,
    };
    tx.update(invitationRef, {
      experience: result.experience,
      status: 'pending',
      expiresAt,
      lastSentAt: timestamp,
      sendCount: result.sendCount,
      updatedAt: timestamp,
    });
    for (const snap of oldTokenSnaps) if (snap.exists) tx.delete(snap.ref);
    tx.create(tokenIndexRef, { invitationId, createdAt: timestamp, expiresAt });
    tx.set(db.doc(`organizations/${actor.orgId}/invitationEmailIndex/${emailKey(invitation.email)}`), { invitationId, email: invitation.email, status: 'pending', expiresAt, updatedAt: timestamp }, { merge: true });
    const audit = buildAudit(actor, { action: 'membership.invitation.resend', entityType: 'invitation', entityId: invitationId, before: invitation, after: result, metadata: { rotatedToken: true } });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  });

  try {
    const delivery = await provisionInvitationAccess(actor, result, token);
    const provisioned = await invitationRef.get();
    return { invitation: provisioned.data() as Invitation, ...delivery };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invitation account provisioning failed.';
    await invitationRef.set({ accountStatus: 'provisioning_failed', deliveryStatus: 'failed', deliveryError: message.slice(0, 500), updatedAt: now() }, { merge: true });
    throw error;
  }
}

export async function resolvePulseInvitation(raw: unknown) {
  const input = pulseInvitationResolveSchema.parse(raw);
  const db = adminDb();
  const tokenHash = hashToken(input.token);
  const tokenIndexRef = db.doc(`organizations/${input.orgId}/invitationTokenIndex/${tokenHash}`);
  const tokenIndexSnap = await tokenIndexRef.get();

  if (!tokenIndexSnap.exists) {
    throw new ApiError(404, 'Invitation is invalid or expired.', 'invalid_invitation');
  }

  const invitationId = String(tokenIndexSnap.data()?.invitationId || '');
  if (!invitationId) {
    throw new ApiError(404, 'Invitation is invalid or expired.', 'invalid_invitation');
  }

  const invitationRef = db.doc(`organizations/${input.orgId}/invitations/${invitationId}`);
  const invitationSnap = await invitationRef.get();
  if (!invitationSnap.exists) {
    throw new ApiError(404, 'Invitation is invalid or expired.', 'invalid_invitation');
  }

  const invitation = invitationSnap.data() as Invitation;
  const timestamp = now();

  if (invitation.status !== 'pending' || invitation.expiresAt <= timestamp) {
    throw new ApiError(410, 'Invitation is invalid or expired.', 'invitation_expired');
  }

  if (invitation.experience !== 'pulse') {
    throw new ApiError(404, 'Invitation is invalid or expired.', 'invalid_invitation');
  }

  const eventId = randomUUID();
  const batch = db.batch();
  batch.set(invitationRef, {
    openedAt: invitation.openedAt || timestamp,
    lastOpenedAt: timestamp,
    openCount: Number(invitation.openCount || 0) + 1,
    updatedAt: timestamp,
  }, { merge: true });
  batch.create(
    db.doc(`organizations/${input.orgId}/mobileInvitationEvents/${eventId}`),
    {
      id: eventId,
      invitationId,
      eventType: 'opened',
      createdAt: timestamp,
    },
  );
  await batch.commit();

  const org = await organizationInvitationContext(input.orgId);
  const links = pulseDistributionLinks();

  return {
    appName: 'OPSIQO Pulse',
    organizationName: org.name,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    workerMatched: Boolean(invitation.workerId),
    iosUrl: links.ios || invitationDownloadUrl(),
    iosDirect: Boolean(links.ios),
    androidUrl: links.android || invitationDownloadUrl(),
    androidDirect: Boolean(links.android),
    supportEmail: org.supportEmail || null,
  };
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
    if (invitation.status === 'accepted') {
      if (invitation.acceptedByUid && invitation.acceptedByUid !== identity.uid) {
        throw new ApiError(409, 'Invitation was already accepted by a different identity.', 'invitation_already_accepted');
      }
      const existingMembershipSnap = await tx.get(db.doc(`organizations/${orgId}/memberships/${identity.uid}`));
      if (!existingMembershipSnap.exists) throw new ApiError(409, 'Invitation is accepted but the organization membership is missing.', 'accepted_membership_missing');
      membership = existingMembershipSnap.data() as Membership;
      return;
    }
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

    const membershipRef = db.doc(`organizations/${orgId}/memberships/${identity.uid}`);
    const existingMembershipSnap = await tx.get(membershipRef);
    const existingMembership = existingMembershipSnap.exists ? existingMembershipSnap.data() as Membership : undefined;
    membership = {
      uid: identity.uid,
      workerId: workerId || existingMembership?.workerId,
      role: invitation.role,
      status: 'active',
      orgUnitScope: existingMembership?.orgUnitScope,
      provisionedByInvitationId: existingMembership?.provisionedByInvitationId || invitation.id,
      activationPending: false,
      createdAt: existingMembership?.createdAt || timestamp,
      updatedAt: timestamp,
    };
    tx.set(membershipRef, membership, { merge: true });
    tx.update(invitationRef, { status: 'accepted', accountStatus: 'active', acceptedAt: timestamp, acceptedByUid: identity.uid, authUid: identity.uid, updatedAt: timestamp });
    tx.set(db.doc(`organizations/${orgId}/invitationEmailIndex/${emailKey(authenticatedEmail)}`), { invitationId, email: authenticatedEmail, status: 'accepted', updatedAt: timestamp }, { merge: true });
    tx.delete(tokenIndexRef);
    if (linkedPersonId) tx.set(db.doc(`organizations/${orgId}/people/${linkedPersonId}`), { authUid: identity.uid, updatedAt: timestamp }, { merge: true });

    const actor: ActorContext = { uid: identity.uid, orgId, workerId, role: invitation.role, permissions: [] };
    const audit = buildAudit(actor, { action: 'membership.accept_invitation', entityType: 'membership', entityId: identity.uid, after: membership, metadata: { invitationId } });
    tx.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
  });

  return membership;
}

export async function reconcileProvisionedInvitationForIdentity(identity: IdentityContext, orgId: string) {
  const email = identity.email?.trim().toLowerCase();
  if (!email || identity.demo) return 'none' as const;
  const db = adminDb();
  const emailIndexRef = db.doc(`organizations/${orgId}/invitationEmailIndex/${emailKey(email)}`);
  const emailIndexSnap = await emailIndexRef.get();
  if (!emailIndexSnap.exists || emailIndexSnap.data()?.status !== 'pending') return 'none' as const;
  const invitationId = emailIndexSnap.data()?.invitationId as string | undefined;
  if (!invitationId) return 'none' as const;
  const invitationRef = db.doc(`organizations/${orgId}/invitations/${invitationId}`);
  const invitationSnap = await invitationRef.get();
  if (!invitationSnap.exists) return 'none' as const;
  const invitation = invitationSnap.data() as Invitation;
  if (invitation.status !== 'pending') return 'none' as const;
  if (invitation.authUid && invitation.authUid !== identity.uid) return 'none' as const;

  const membershipRef = db.doc(`organizations/${orgId}/memberships/${identity.uid}`);
  const membershipSnap = await membershipRef.get();
  if (!membershipSnap.exists) return 'none' as const;
  const membership = membershipSnap.data() as Membership;
  if (membership.status !== 'active') return 'none' as const;

  const timestamp = now();
  const tokenQuery = await db.collection(`organizations/${orgId}/invitationTokenIndex`).where('invitationId', '==', invitationId).limit(20).get();

  if (invitation.expiresAt <= timestamp) {
    const batch = db.batch();
    batch.set(invitationRef, { status: 'expired', expiredAt: timestamp, updatedAt: timestamp }, { merge: true });
    if (invitation.membershipCreatedByInvitation) batch.set(membershipRef, { status: 'inactive', activationPending: false, updatedAt: timestamp }, { merge: true });
    batch.set(emailIndexRef, { invitationId, email, status: 'expired', updatedAt: timestamp }, { merge: true });
    for (const tokenDoc of tokenQuery.docs) batch.delete(tokenDoc.ref);
    await batch.commit();
    return 'expired' as const;
  }

  const actor: ActorContext = { uid: identity.uid, orgId, workerId: membership.workerId, role: membership.role, permissions: [] };
  const audit = buildAudit(actor, {
    action: 'membership.invitation.auto_activate',
    entityType: 'membership',
    entityId: identity.uid,
    before: membership,
    after: membership,
    metadata: { invitationId, activationMethod: 'authenticated_email_match' },
  });
  const batch = db.batch();
  batch.set(membershipRef, { activationPending: false, updatedAt: timestamp }, { merge: true });
  batch.set(invitationRef, { status: 'accepted', accountStatus: 'active', acceptedAt: timestamp, acceptedByUid: identity.uid, authUid: identity.uid, updatedAt: timestamp }, { merge: true });
  batch.set(emailIndexRef, { invitationId, email, status: 'accepted', updatedAt: timestamp }, { merge: true });
  for (const tokenDoc of tokenQuery.docs) batch.delete(tokenDoc.ref);
  batch.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return 'accepted' as const;
}
