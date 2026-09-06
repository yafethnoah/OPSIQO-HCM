import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import type { ActorContext, Invitation, Membership } from '@/domain/security';
import { invitationDownloadUrl, pulseDistributionLinks } from './invitation-email';

const emailKey = (value: string) => encodeURIComponent(value.trim().toLowerCase());

function firebaseErrorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
}

export async function ensureInvitationIdentity(email: string, displayName?: string) {
  const auth = adminAuth();
  try {
    const existing = await auth.getUserByEmail(email);
    if (existing.disabled) throw new ApiError(409, 'The Firebase account for this email is disabled. Review access before sending an invitation.', 'auth_user_disabled');
    if (displayName && !existing.displayName) await auth.updateUser(existing.uid, { displayName });
    return { uid: existing.uid, created: false };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (firebaseErrorCode(error) !== 'auth/user-not-found') throw error;
    const created = await auth.createUser({ email, displayName: displayName || undefined, emailVerified: false, disabled: false });
    return { uid: created.uid, created: true };
  }
}

export async function passwordSetupLink(email: string, continueUrl: string) {
  try {
    return await adminAuth().generatePasswordResetLink(email, { url: continueUrl, handleCodeInApp: false });
  } catch (error) {
    throw new ApiError(502, `Firebase could not create the password-setup link for this invitation${firebaseErrorCode(error) ? ` (${firebaseErrorCode(error)})` : ''}.`, 'password_setup_link_failed');
  }
}

export async function getEmployeeAccountAccess(actor: ActorContext, workerId: string) {
  const db = adminDb();
  const workerSnap = await db.doc(`organizations/${actor.orgId}/workers/${workerId}`).get();
  if (!workerSnap.exists) throw new ApiError(404, 'Employee not found.', 'employee_not_found');
  const worker = workerSnap.data() as { id: string; personId?: string; workEmail?: string };
  const email = String(worker.workEmail || '').trim().toLowerCase();

  let invitation: Invitation | null = null;
  if (email) {
    const indexSnap = await db.doc(`organizations/${actor.orgId}/invitationEmailIndex/${emailKey(email)}`).get();
    const invitationId = indexSnap.data()?.invitationId as string | undefined;
    if (invitationId) {
      const invitationSnap = await db.doc(`organizations/${actor.orgId}/invitations/${invitationId}`).get();
      if (invitationSnap.exists) invitation = invitationSnap.data() as Invitation;
    }
  }

  if (!invitation) {
    const workerInvites = await db.collection(`organizations/${actor.orgId}/invitations`)
      .where('workerId', '==', workerId)
      .limit(25)
      .get();
    invitation = workerInvites.docs
      .map((doc) => doc.data() as Invitation)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
  }

  let authUid = invitation?.authUid;
  if (!authUid && worker.personId) {
    const personSnap = await db.doc(`organizations/${actor.orgId}/people/${worker.personId}`).get();
    authUid = personSnap.data()?.authUid as string | undefined;
  }

  let firebaseIdentity: 'missing' | 'ready' | 'disabled' = 'missing';
  let emailVerified = false;
  let lastSignInAt: string | undefined;

  if (authUid || email) {
    try {
      const record = authUid ? await adminAuth().getUser(authUid) : await adminAuth().getUserByEmail(email);
      authUid = record.uid;
      firebaseIdentity = record.disabled ? 'disabled' : 'ready';
      emailVerified = record.emailVerified;
      lastSignInAt = record.metadata.lastSignInTime ? new Date(record.metadata.lastSignInTime).toISOString() : undefined;
    } catch (error) {
      if (firebaseErrorCode(error) !== 'auth/user-not-found') throw error;
    }
  }

  let membership: Membership | null = null;
  if (authUid) {
    const membershipSnap = await db.doc(`organizations/${actor.orgId}/memberships/${authUid}`).get();
    if (membershipSnap.exists) membership = membershipSnap.data() as Membership;
  }

  const status = firebaseIdentity === 'disabled'
    ? 'suspended'
    : membership?.status === 'active' && lastSignInAt
      ? 'active'
      : membership?.status === 'active'
        ? 'provisioned'
        : invitation?.status === 'pending'
          ? 'invited'
          : 'not_invited';

  return {
    workerId,
    email: email || invitation?.email || '',
    status,
    firebaseIdentity,
    emailVerified,
    lastSignInAt,
    membership: membership ? { role: membership.role, status: membership.status } : null,
    invitation,
    downloadUrl: invitationDownloadUrl(),
    pulse: {
      appName: 'OPSIQO Pulse',
      iosUrl: pulseDistributionLinks().ios || null,
      androidUrl: pulseDistributionLinks().android || null,
    },
  };
}
