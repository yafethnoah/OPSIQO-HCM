import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { IdentityContext } from '@/lib/auth/session';
import { buildAudit } from '@/lib/audit/service';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { permissionsForRole } from '@/lib/auth/permissions';

export const firstOrganizationSetupSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export function organizationIdFromName(name: string, entropy: string = randomUUID()) {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'organization';
  const suffix = createHash('sha256').update(entropy).digest('hex').slice(0, 10);
  return `${slug}-${suffix}`;
}

function requireBootstrapAuthorization(identity: IdentityContext) {
  if (process.env.OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP !== 'true') {
    throw new ApiError(403, 'First-organization bootstrap is disabled. Set OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP=true only for the controlled bootstrap window.', 'bootstrap_disabled');
  }

  const email = String(identity.email || '').trim().toLowerCase();
  if (!email) {
    throw new ApiError(403, 'An authenticated email identity is required to bootstrap the first organization.', 'bootstrap_email_required');
  }

  // Local emulator bootstrap is intentionally easier: on an empty, isolated
  // emulator data set, the first authenticated identity may claim the first
  // organization. This path is impossible in production because it requires
  // FIREBASE_AUTH_EMULATOR_HOST and the explicit local bootstrap flag.
  const localEmulatorBootstrap = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)
    && process.env.OPSIQO_LOCAL_FIRST_USER_BOOTSTRAP === 'true';

  if (!localEmulatorBootstrap) {
    const allowedEmail = String(process.env.OPSIQO_BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    if (!allowedEmail) {
      throw new ApiError(503, 'OPSIQO_BOOTSTRAP_ADMIN_EMAIL must be configured before first-organization bootstrap.', 'bootstrap_admin_not_configured');
    }
    if (email !== allowedEmail) {
      throw new ApiError(403, 'This authenticated identity is not authorized to bootstrap the first organization.', 'bootstrap_identity_not_authorized');
    }
  }

  const requireVerifiedEmail = process.env.OPSIQO_BOOTSTRAP_REQUIRE_VERIFIED_EMAIL !== 'false';
  if (requireVerifiedEmail && identity.emailVerified !== true) {
    throw new ApiError(403, 'A verified email is required to bootstrap the first organization. For controlled local bootstrap only, OPSIQO_BOOTSTRAP_REQUIRE_VERIFIED_EMAIL=false can temporarily relax this check.', 'verified_email_required');
  }
}

export async function bootstrapFirstOrganization(identity: IdentityContext, raw: unknown) {
  requireBootstrapAuthorization(identity);
  const input = firstOrganizationSetupSchema.parse(raw);
  const db = adminDb();

  const [existingOrg, existingMembership] = await Promise.all([
    db.collection('organizations').limit(1).get(),
    db.collectionGroup('memberships').where('uid', '==', identity.uid).where('status', '==', 'active').limit(1).get(),
  ]);
  if (!existingMembership.empty) throw new ApiError(409, 'This identity already belongs to an active organization.', 'membership_exists');
  if (!existingOrg.empty) throw new ApiError(409, 'An organization already exists. Use an invitation or an authorized membership workflow instead of first-organization bootstrap.', 'organization_exists');

  const now = new Date().toISOString();
  const startDate = now.slice(0, 10);
  const orgId = organizationIdFromName(input.organizationName);
  const personId = `person-${randomUUID()}`;
  const workerId = `worker-${randomUUID()}`;
  const employmentId = `employment-${randomUUID()}`;
  const assignmentId = `assignment-${randomUUID()}`;
  const orgUnitId = `unit-${randomUUID()}`;
  const positionId = `position-${randomUUID()}`;
  const bootstrapRef = db.doc('_system/firstOrganizationBootstrap');
  const orgRef = db.doc(`organizations/${orgId}`);

  const actor: ActorContext = {
    uid: identity.uid,
    orgId,
    role: 'org_admin',
    workerId,
    permissions: permissionsForRole('org_admin'),
  };
  const organization = { id: orgId, name: input.organizationName, status: 'active' as const, createdAt: now, updatedAt: now };
  const membership = { uid: identity.uid, workerId, role: 'org_admin' as const, status: 'active' as const, createdAt: now, updatedAt: now };
  const audit = buildAudit(actor, {
    action: 'organization.bootstrap',
    entityType: 'organization',
    entityId: orgId,
    after: { organization, membership: { ...membership, uid: identity.uid }, bootstrapMethod: 'first_organization' },
    metadata: { authenticatedEmail: identity.email || null },
  });

  await db.runTransaction(async (tx) => {
    const claimed = await tx.get(bootstrapRef);
    if (claimed.exists) throw new ApiError(409, 'First-organization bootstrap has already been claimed.', 'bootstrap_already_claimed');

    tx.create(bootstrapRef, { claimed: true, orgId, claimedByUid: identity.uid, claimedAt: now });
    tx.create(orgRef, organization);
    tx.create(db.doc(`organizations/${orgId}/memberships/${identity.uid}`), membership);
    tx.create(db.doc(`organizations/${orgId}/orgUnits/${orgUnitId}`), {
      id: orgUnitId, name: input.organizationName, code: 'ORG', type: 'company', status: 'active', managerWorkerId: workerId, createdAt: now, updatedAt: now,
    });
    tx.create(db.doc(`organizations/${orgId}/positions/${positionId}`), {
      id: positionId, positionCode: 'P-ADMIN-001', title: 'Organization Administrator', orgUnitId, status: 'filled', fte: 1, headcountLimit: 1, createdAt: now, updatedAt: now,
    });
    tx.create(db.doc(`organizations/${orgId}/positionOccupancy/${positionId}`), {
      positionId, occupiedHeadcount: 1, occupiedFte: 1, updatedAt: now,
    });
    tx.create(db.doc(`organizations/${orgId}/people/${personId}`), {
      id: personId, authUid: identity.uid, legalFirstName: input.firstName, legalLastName: input.lastName, workEmail: identity.email, createdAt: now, updatedAt: now,
    });
    tx.create(db.doc(`organizations/${orgId}/workers/${workerId}`), {
      id: workerId,
      personId,
      employeeNumber: 'ADMIN-001',
      employeeNumberLower: 'admin-001',
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      displayNameLower: `${input.firstName} ${input.lastName}`.trim().toLowerCase(),
      workEmail: identity.email || '',
      workEmailLower: String(identity.email || '').toLowerCase(),
      status: 'active',
      primaryAssignmentId: assignmentId,
      hireDate: startDate,
      createdAt: now,
      updatedAt: now,
    });
    tx.create(db.doc(`organizations/${orgId}/workerDirectory/${workerId}`), {
      id: workerId,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      workEmail: identity.email || '',
      status: 'active',
      updatedAt: now,
    });
    tx.create(db.doc(`organizations/${orgId}/employments/${employmentId}`), {
      id: employmentId, workerId, employmentType: 'permanent', startDate, fte: 1, status: 'active', createdAt: now, updatedAt: now,
    });
    tx.create(db.doc(`organizations/${orgId}/assignments/${assignmentId}`), {
      id: assignmentId, workerId, employmentId, positionId, orgUnitId, primary: true, assignmentType: 'primary', allocationFte: 1, startDate, createdAt: now, updatedAt: now,
    });
    tx.create(db.doc(`organizations/${orgId}/employeeNumberIndex/admin-001`), { employeeNumber: 'ADMIN-001', workerId, createdAt: now });
    if (identity.email) tx.create(db.doc(`organizations/${orgId}/workEmailIndex/${encodeURIComponent(identity.email.toLowerCase())}`), { workEmail: identity.email.toLowerCase(), workerId, createdAt: now });
    tx.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
  });

  return { orgId, organization, membership, workerId };
}
