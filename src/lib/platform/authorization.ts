import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { identityFromRequest, type IdentityContext } from '@/lib/auth/session';

export type PlatformAdministratorSource =
  | 'registry'
  | 'environment_allowlist'
  | 'bootstrap_founder'
  | 'super_admin_membership'
  | 'local_emulator';

export interface PlatformAdministratorContext {
  uid: string;
  email: string;
  source: PlatformAdministratorSource;
  identity: IdentityContext;
}

function normalizedEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function platformAdminEmailAllowlist(): Set<string> {
  return new Set(
    String(process.env.OPSIQO_PLATFORM_ADMIN_EMAILS || '')
      .split(',')
      .map(normalizedEmail)
      .filter(Boolean),
  );
}

async function isRegisteredPlatformAdministrator(uid: string): Promise<boolean> {
  const snap = await adminDb().doc(`platformAdministrators/${uid}`).get();
  if (!snap.exists) return false;
  return String(snap.data()?.status || 'active') === 'active';
}

async function isBootstrapFounder(uid: string): Promise<boolean> {
  const snap = await adminDb().doc('_system/firstOrganizationBootstrap').get();
  return snap.exists && snap.data()?.claimedByUid === uid;
}

async function hasActiveSuperAdminMembership(uid: string): Promise<boolean> {
  const snap = await adminDb()
    .collectionGroup('memberships')
    .where('uid', '==', uid)
    .where('status', '==', 'active')
    .limit(50)
    .get();

  return snap.docs.some((doc) => doc.data()?.role === 'super_admin');
}

function enforcePlatformAdministratorIdentity(identity: IdentityContext): void {
  const localEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)
    && process.env.OPSIQO_LOCAL_PLATFORM_ADMIN === 'true';

  if (localEmulator) return;

  const email = normalizedEmail(identity.email);
  if (!email) {
    throw new ApiError(403, 'A platform administrator must have an authenticated email identity.', 'platform_admin_email_required');
  }

  if (identity.emailVerified !== true) {
    throw new ApiError(403, 'A verified email is required for platform administration.', 'verified_email_required');
  }

  const requireMfa = process.env.OPSIQO_REQUIRE_PLATFORM_ADMIN_MFA !== 'false';
  if (requireMfa && !identity.mfaVerified) {
    throw new ApiError(403, 'Multi-factor authentication is required for OPSIQO platform administration.', 'mfa_required');
  }
}

export async function platformAdministratorFromRequest(request: Request): Promise<PlatformAdministratorContext> {
  const identity = await identityFromRequest(request);
  enforcePlatformAdministratorIdentity(identity);

  const email = normalizedEmail(identity.email);
  const localEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)
    && process.env.OPSIQO_LOCAL_PLATFORM_ADMIN === 'true';

  if (localEmulator) {
    return { uid: identity.uid, email: email || 'local-platform-admin@opsiqo.local', source: 'local_emulator', identity };
  }

  if (email && platformAdminEmailAllowlist().has(email)) {
    return { uid: identity.uid, email, source: 'environment_allowlist', identity };
  }

  if (await isRegisteredPlatformAdministrator(identity.uid)) {
    return { uid: identity.uid, email, source: 'registry', identity };
  }

  if (await isBootstrapFounder(identity.uid)) {
    return { uid: identity.uid, email, source: 'bootstrap_founder', identity };
  }

  if (await hasActiveSuperAdminMembership(identity.uid)) {
    return { uid: identity.uid, email, source: 'super_admin_membership', identity };
  }

  throw new ApiError(403, 'Platform administrator authorization is required.', 'platform_admin_required');
}
