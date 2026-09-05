import type { ActorContext, Membership, Permission, Role } from '@/domain/security';
import { adminAppCheck, adminAuth, adminDb } from '@/lib/firebase/admin';
import { permissionsForRole } from './permissions';
import { ApiError } from '@/lib/http/errors';

function demoContext(orgId: string): ActorContext { return { uid: process.env.OPSIQO_DEMO_UID || 'demo-admin', orgId, role: 'org_admin', workerId: process.env.OPSIQO_DEMO_WORKER_ID || 'worker-001', permissions: permissionsForRole('org_admin'), demo: true }; }

export interface IdentityContext { uid:string; email?:string; emailVerified?:boolean; demo?:boolean; mfaVerified?:boolean; signInProvider?:string; groups?:string[]; authTime?:string; deviceCompliant?:boolean; tenantId?:string; }

export async function verifyAppCheckRequest(request:Request){
  if(process.env.OPSIQO_REQUIRE_APP_CHECK!=='true' || process.env.OPSIQO_DEMO_MODE==='true' || process.env.FIRESTORE_EMULATOR_HOST) return;
  const token=request.headers.get('x-firebase-appcheck');
  if(!token) throw new ApiError(401,'Firebase App Check token required.','app_check_required');
  try{await adminAppCheck().verifyToken(token);}catch{throw new ApiError(401,'Firebase App Check verification failed.','invalid_app_check');}
}

async function verifyFirebaseBearerToken(token: string) {
  try {
    return await adminAuth().verifyIdToken(
      token,
      !process.env.FIREBASE_AUTH_EMULATOR_HOST,
    );
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';

    const invalidTokenCodes = new Set([
      'auth/argument-error',
      'auth/id-token-expired',
      'auth/id-token-revoked',
      'auth/invalid-id-token',
      'auth/user-disabled',
    ]);

    if (invalidTokenCodes.has(code) || code.startsWith('auth/id-token-')) {
      throw new ApiError(
        401,
        'Authentication token is invalid or expired. Sign in again.',
        'invalid_auth_token',
      );
    }

    throw error;
  }
}
export async function identityFromRequest(request: Request): Promise<IdentityContext> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    if (process.env.OPSIQO_DEMO_MODE === 'true') return { uid: process.env.OPSIQO_DEMO_UID || 'demo-admin', email: process.env.OPSIQO_DEMO_EMAIL || 'demo@opsiqo.local', emailVerified:true, demo: true, mfaVerified:true, signInProvider:'demo' };
    throw new ApiError(401, 'Authentication required.', 'unauthenticated');
  }
  await verifyAppCheckRequest(request);
  const decoded = await verifyFirebaseBearerToken(authHeader.slice('Bearer '.length));
  const firebase = decoded.firebase as {sign_in_provider?:string;sign_in_second_factor?:string} | undefined;
  const rawGroups = (decoded as unknown as {groups?:unknown;roles?:unknown}).groups ?? (decoded as unknown as {roles?:unknown}).roles;
  const groups = Array.isArray(rawGroups) ? rawGroups.filter((v): v is string => typeof v === 'string').slice(0,200) : undefined;
  const deviceCompliant = (decoded as unknown as {device_compliant?:unknown}).device_compliant === true ? true : undefined;
  const tenantId = typeof (decoded as unknown as {tid?:unknown;hd?:unknown}).tid === 'string' ? String((decoded as unknown as {tid?:unknown}).tid) : typeof (decoded as unknown as {hd?:unknown}).hd === 'string' ? String((decoded as unknown as {hd?:unknown}).hd) : undefined;
  return { uid: decoded.uid, email: decoded.email, emailVerified: decoded.email_verified === true, demo: false, mfaVerified:Boolean(firebase?.sign_in_second_factor), signInProvider:firebase?.sign_in_provider, groups, authTime: decoded.auth_time ? new Date(Number(decoded.auth_time)*1000).toISOString() : undefined, deviceCompliant, tenantId };
}

async function platformPolicyForOrg(orgId:string){
  const snap=await adminDb().doc(`organizations/${orgId}/settings/platform`).get();
  return snap.exists ? (snap.data() as Record<string,unknown>) : null;
}

function enforcePlatformIdentityPolicy(identity:IdentityContext,role:Role,platform:Record<string,unknown>|null){
  if(!platform||identity.demo) return;
  if(platform.allowPasswordSignIn===false&&identity.signInProvider==='password') throw new ApiError(403,'Email/password sign-in is disabled by organization policy.','password_signin_disabled');
  const mfaPolicy=String(platform.mfaPolicy||'optional');
  const privileged=['super_admin','org_admin','hr_admin'].includes(role);
  if((mfaPolicy==='all_required'||(mfaPolicy==='privileged_required'&&privileged))&&!identity.mfaVerified) throw new ApiError(403,'Multi-factor authentication is required by organization policy.','mfa_required');
  const timeout=typeof platform.sessionTimeoutMinutes==='number'&&Number.isFinite(platform.sessionTimeoutMinutes)?Math.max(15,Math.min(1440,platform.sessionTimeoutMinutes)):null;
  if(timeout&&identity.authTime){const ageMs=Date.now()-Date.parse(identity.authTime);if(Number.isFinite(ageMs)&&ageMs>timeout*60_000)throw new ApiError(401,'Your organization session has expired. Sign in again.','session_expired');}
}

function enforcePrivilegedIdentityPolicy(identity:IdentityContext, role:Role){
  const privileged=['super_admin','org_admin','hr_admin'].includes(role); if(!privileged||identity.demo) return;
  if(process.env.OPSIQO_REQUIRE_ADMIN_MFA==='true'&&!identity.mfaVerified) throw new ApiError(403,'Multi-factor authentication is required for privileged HR access.','mfa_required');
  const allowed=(process.env.OPSIQO_ALLOWED_ADMIN_PROVIDERS||'').split(',').map(v=>v.trim()).filter(Boolean);
  if(allowed.length&&(!identity.signInProvider||!allowed.includes(identity.signInProvider))) throw new ApiError(403,'This sign-in provider is not permitted for privileged HR access.','provider_not_allowed');
}

export async function actorFromRequest(request: Request, orgId?: string): Promise<ActorContext> {
  const demo = process.env.OPSIQO_DEMO_MODE === 'true';
  const routeOrgId = String(orgId || '').trim() || undefined;
  const headerOrgId = String(request.headers.get('x-org-id') || '').trim() || undefined;

  if (routeOrgId && headerOrgId && routeOrgId !== headerOrgId) {
    throw new ApiError(400, 'Organization context does not match the requested resource.', 'org_context_mismatch');
  }

  const demoOrgId = demo ? String(process.env.OPSIQO_DEMO_ORG_ID || '').trim() || undefined : undefined;
  const resolvedOrgId = routeOrgId || headerOrgId || demoOrgId;
  if (!resolvedOrgId) throw new ApiError(400, 'Organization context is required.', 'missing_org');

  if (demo && !request.headers.get('authorization')) return demoContext(resolvedOrgId);

  const identity = await identityFromRequest(request);
  const platform = await platformPolicyForOrg(resolvedOrgId);

  // Anonymous access is deliberately read-only and organization-scoped.
  if (identity.signInProvider === 'anonymous') {
    if (!platform || platform.guestAccessEnabled !== true || platform.guestReadOnly !== true) {
      throw new ApiError(403, 'Guest access is not enabled for this organization.', 'guest_access_disabled');
    }
    return {
      uid: identity.uid,
      orgId: resolvedOrgId,
      role: 'employee',
      permissions: ['organization.read','positions.read'],
      guest: true,
    };
  }

  const memberSnap = await adminDb().doc(`organizations/${resolvedOrgId}/memberships/${identity.uid}`).get();
  if (!memberSnap.exists) throw new ApiError(403, 'No membership for this organization.', 'membership_required');
  const membership = memberSnap.data() as Membership;
  if (membership.status !== 'active') throw new ApiError(403, 'Membership is inactive.', 'membership_inactive');
  const role = membership.role as Role;
  enforcePrivilegedIdentityPolicy(identity,role);
  enforcePlatformIdentityPolicy(identity,role,platform);
  return { uid: identity.uid, orgId: resolvedOrgId, role, workerId: membership.workerId, permissions: permissionsForRole(role) };
}

const TEAM_PERMISSION_FALLBACK: Partial<Record<Permission, Permission>> = {
  'recruiting.manage': 'recruiting.manage.team',
  'onboarding.manage': 'onboarding.manage.team',
  'time.manage': 'time.manage.team',
  'performance.pip': 'performance.pip.team',
  'learning.verify': 'learning.verify.team',
};

export function hasPermission(actor: ActorContext, permission: Permission) {
  return actor.permissions.includes(permission) || Boolean(TEAM_PERMISSION_FALLBACK[permission] && actor.permissions.includes(TEAM_PERMISSION_FALLBACK[permission]!));
}

export function requirePermission(actor: ActorContext, permission: Permission) {
  if (!hasPermission(actor, permission)) throw new ApiError(403, `Permission required: ${permission}`, 'forbidden');
}
