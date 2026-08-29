import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { IdentityContext } from '@/lib/auth/session';
import { buildAudit } from '@/lib/audit/service';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { permissionsForRole } from '@/lib/auth/permissions';
import { organizationIdFromName } from '@/lib/organization/bootstrap';

export const createTenantSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  administratorFirstName: z.string().trim().min(1).max(80),
  administratorLastName: z.string().trim().min(1).max(80),
  environment: z.enum(['test', 'uat', 'production']).default('test'),
  reason: z.string().trim().min(10).max(500),
});

export type PlatformTenantSummary = {
  id:string;
  name:string;
  status:string;
  environment:string;
  createdAt:string;
  createdByUid?:string;
};

function requireSuperAdmin(actor: ActorContext) {
  if (actor.role !== 'super_admin') {
    throw new ApiError(403, 'Platform super-administrator access is required to create or list tenants.', 'super_admin_required');
  }
}

export async function listPlatformTenants(actor: ActorContext): Promise<PlatformTenantSummary[]> {
  requireSuperAdmin(actor);
  const snapshot = await adminDb().collection('organizations').limit(500).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      name: String(data.name || doc.id),
      status: String(data.status || 'unknown'),
      environment: String(data.environment || 'unspecified'),
      createdAt: String(data.createdAt || ''),
      createdByUid: typeof data.createdByUid === 'string' ? data.createdByUid : undefined,
    };
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createTenantBySuperAdmin(actor: ActorContext, identity: IdentityContext, raw: unknown) {
  requireSuperAdmin(actor);
  if (!identity.email) throw new ApiError(403, 'The super-administrator must have an authenticated email.', 'admin_email_required');
  if (identity.emailVerified !== true && process.env.OPSIQO_PLATFORM_REQUIRE_VERIFIED_EMAIL !== 'false') {
    throw new ApiError(403, 'A verified email is required for tenant creation.', 'verified_email_required');
  }

  const input = createTenantSchema.parse(raw);
  const db = adminDb();
  const normalizedName = input.organizationName.toLocaleLowerCase('en-CA');
  const existing = await db.collection('organizations').where('nameLower', '==', normalizedName).limit(1).get();
  if (!existing.empty) throw new ApiError(409, 'An organization with this name already exists.', 'organization_name_exists');

  const now = new Date().toISOString();
  const startDate = now.slice(0,10);
  const orgId = organizationIdFromName(input.organizationName);
  const personId = `person-${randomUUID()}`;
  const workerId = `worker-${randomUUID()}`;
  const employmentId = `employment-${randomUUID()}`;
  const assignmentId = `assignment-${randomUUID()}`;
  const orgUnitId = `unit-${randomUUID()}`;
  const positionId = `position-${randomUUID()}`;
  const orgRef = db.doc(`organizations/${orgId}`);
  const nameIndexRef = db.doc(`_platformOrganizationNames/${createHash('sha256').update(normalizedName).digest('hex')}`);
  const displayName = `${input.administratorFirstName} ${input.administratorLastName}`.trim();
  const email = identity.email.trim().toLowerCase();
  const organization = {
    id:orgId,
    name:input.organizationName,
    nameLower:normalizedName,
    status:'active' as const,
    environment:input.environment,
    createdAt:now,
    updatedAt:now,
    createdByUid:actor.uid,
    createdFromOrgId:actor.orgId,
  };
  const membership = { uid:identity.uid, workerId, role:'super_admin' as const, status:'active' as const, createdAt:now, updatedAt:now };
  const targetActor:ActorContext = { uid:identity.uid, orgId, role:'super_admin', workerId, permissions:permissionsForRole('super_admin') };
  const audit = buildAudit(targetActor, {
    action:'platform.tenant.create', entityType:'organization', entityId:orgId,
    after:{ organization, membership:{...membership,uid:identity.uid} },
    metadata:{ sourceOrgId:actor.orgId, environment:input.environment, reason:input.reason },
  });

  await db.runTransaction(async (tx) => {
    const [collision,nameClaim] = await Promise.all([tx.get(orgRef),tx.get(nameIndexRef)]);
    if (collision.exists) throw new ApiError(409, 'Generated organization identifier already exists. Retry tenant creation.', 'organization_id_exists');
    if (nameClaim.exists) throw new ApiError(409, 'An organization with this name already exists.', 'organization_name_exists');
    tx.create(nameIndexRef, { normalizedName,orgId,createdAt:now,createdByUid:actor.uid });
    tx.create(orgRef, organization);
    tx.create(db.doc(`organizations/${orgId}/memberships/${identity.uid}`), membership);
    tx.create(db.doc(`organizations/${orgId}/orgUnits/${orgUnitId}`), { id:orgUnitId,name:input.organizationName,code:'ORG',type:'company',status:'active',managerWorkerId:workerId,createdAt:now,updatedAt:now });
    tx.create(db.doc(`organizations/${orgId}/positions/${positionId}`), { id:positionId,positionCode:'P-ADMIN-001',title:'Platform Tenant Administrator',orgUnitId,status:'filled',fte:1,headcountLimit:1,createdAt:now,updatedAt:now });
    tx.create(db.doc(`organizations/${orgId}/positionOccupancy/${positionId}`), { positionId,occupiedHeadcount:1,occupiedFte:1,updatedAt:now });
    tx.create(db.doc(`organizations/${orgId}/people/${personId}`), { id:personId,authUid:identity.uid,legalFirstName:input.administratorFirstName,legalLastName:input.administratorLastName,workEmail:email,createdAt:now,updatedAt:now });
    tx.create(db.doc(`organizations/${orgId}/workers/${workerId}`), { id:workerId,personId,employeeNumber:'ADMIN-001',employeeNumberLower:'admin-001',displayName,displayNameLower:displayName.toLowerCase(),workEmail:email,workEmailLower:email,status:'active',primaryAssignmentId:assignmentId,hireDate:startDate,createdAt:now,updatedAt:now });
    tx.create(db.doc(`organizations/${orgId}/workerDirectory/${workerId}`), { id:workerId,displayName,workEmail:email,status:'active',updatedAt:now });
    tx.create(db.doc(`organizations/${orgId}/employments/${employmentId}`), { id:employmentId,workerId,employmentType:'permanent',startDate,fte:1,status:'active',createdAt:now,updatedAt:now });
    tx.create(db.doc(`organizations/${orgId}/assignments/${assignmentId}`), { id:assignmentId,workerId,employmentId,positionId,orgUnitId,primary:true,assignmentType:'primary',allocationFte:1,startDate,createdAt:now,updatedAt:now });
    tx.create(db.doc(`organizations/${orgId}/employeeNumberIndex/admin-001`), { employeeNumber:'ADMIN-001',workerId,createdAt:now });
    tx.create(db.doc(`organizations/${orgId}/workEmailIndex/${encodeURIComponent(email)}`), { workEmail:email,workerId,createdAt:now });
    tx.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
  });

  return { orgId, organization, membership, workerId };
}
