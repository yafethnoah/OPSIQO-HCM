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

export const platformTenantLifecycleSchema = z.object({
  action: z.enum(['deactivate','reactivate']),
  reason: z.string().trim().min(10).max(500),
});

export const deletePlatformTenantSchema = z.object({
  organizationName: z.string().min(2).max(120),
  reason: z.string().trim().min(10).max(500),
  productionConfirmation: z.string().trim().max(80).optional(),
});

export type PlatformTenantSummary = {
  id:string;
  name:string;
  status:string;
  environment:string;
  createdAt:string;
  createdByUid?:string;
  deactivatedAt?:string;
};

export type PlatformTenantDependency = {
  collection:string;
  documents:number;
};

export type PlatformTenantDeletionInspection = {
  id:string;
  name:string;
  status:string;
  environment:string;
  isCurrentOrganization:boolean;
  canDelete:boolean;
  dependencies:{
    collectionCount:number;
    documentCount:number;
    collections:PlatformTenantDependency[];
  };
};

function requireSuperAdmin(actor: ActorContext) {
  if (actor.role !== 'super_admin') {
    throw new ApiError(403, 'Platform super-administrator access is required to manage tenants.', 'super_admin_required');
  }
}

function requireVerifiedPlatformIdentity(identity:IdentityContext) {
  if (!identity.email) {
    throw new ApiError(403, 'The super-administrator must have an authenticated email.', 'admin_email_required');
  }
  if (identity.emailVerified !== true && process.env.OPSIQO_PLATFORM_REQUIRE_VERIFIED_EMAIL !== 'false') {
    throw new ApiError(403, 'A verified email is required for platform tenant administration.', 'verified_email_required');
  }
}

async function targetTenant(orgId:string) {
  const db=adminDb();
  const ref=db.doc(`organizations/${orgId}`);
  const snap=await ref.get();
  if(!snap.exists) throw new ApiError(404,'Organization not found.','organization_not_found');
  const data=snap.data() as Record<string,unknown>;
  return {
    ref,
    data,
    id:orgId,
    name:String(data.name||orgId),
    nameLower:String(data.nameLower||data.name||orgId).toLocaleLowerCase('en-CA'),
    status:String(data.status||'unknown'),
    environment:String(data.environment||'unspecified'),
  };
}

function protectCurrentOrganization(actor:ActorContext,targetOrgId:string) {
  if(targetOrgId===actor.orgId) {
    throw new ApiError(
      409,
      'The organization currently providing your super-admin session cannot be deactivated or deleted. Switch to another active organization first.',
      'current_organization_protected',
    );
  }
}

async function dependencySummary(orgId:string) {
  const db=adminDb();
  const orgRef=db.doc(`organizations/${orgId}`);
  const collections=await orgRef.listCollections();
  const details=await Promise.all(collections.map(async(collection)=>{
    const countSnapshot=await collection.count().get();
    return {collection:collection.id,documents:Number(countSnapshot.data().count||0)};
  }));
  details.sort((a,b)=>b.documents-a.documents||a.collection.localeCompare(b.collection));
  return {
    collectionCount:details.length,
    documentCount:details.reduce((sum,item)=>sum+item.documents,0),
    collections:details,
  };
}

function lifecycleEvidenceBase(actor:ActorContext,identity:IdentityContext,target:{id:string;name:string;status:string;environment:string},action:string,reason:string) {
  return {
    id:randomUUID(),
    action,
    actorUid:actor.uid,
    actorRole:actor.role,
    actorOrgId:actor.orgId,
    actorEmail:identity.email||null,
    targetOrgId:target.id,
    targetOrganizationName:target.name,
    targetEnvironment:target.environment,
    targetStatus:target.status,
    reason,
    createdAt:new Date().toISOString(),
  };
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
      deactivatedAt: typeof data.deactivatedAt === 'string' ? data.deactivatedAt : undefined,
    };
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createTenantBySuperAdmin(actor: ActorContext, identity: IdentityContext, raw: unknown) {
  requireSuperAdmin(actor);
  requireVerifiedPlatformIdentity(identity);

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
  const email = identity.email!.trim().toLowerCase();
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

export async function inspectPlatformTenantForDeletion(actor:ActorContext,identity:IdentityContext,targetOrgId:string):Promise<PlatformTenantDeletionInspection> {
  requireSuperAdmin(actor);
  requireVerifiedPlatformIdentity(identity);
  const target=await targetTenant(targetOrgId);
  const dependencies=await dependencySummary(targetOrgId);
  const isCurrentOrganization=targetOrgId===actor.orgId;
  return {
    id:target.id,
    name:target.name,
    status:target.status,
    environment:target.environment,
    isCurrentOrganization,
    canDelete:!isCurrentOrganization&&target.status==='inactive',
    dependencies,
  };
}

export async function changePlatformTenantLifecycle(actor:ActorContext,identity:IdentityContext,targetOrgId:string,raw:unknown) {
  requireSuperAdmin(actor);
  requireVerifiedPlatformIdentity(identity);
  protectCurrentOrganization(actor,targetOrgId);

  const input=platformTenantLifecycleSchema.parse(raw);
  const db=adminDb();
  const target=await targetTenant(targetOrgId);
  const expectedStatus=input.action==='deactivate'?'active':'inactive';
  const nextStatus=input.action==='deactivate'?'inactive':'active';

  if(target.status!==expectedStatus) {
    throw new ApiError(
      409,
      input.action==='deactivate'?'Only an active organization can be deactivated.':'Only an inactive organization can be reactivated.',
      'invalid_organization_lifecycle_state',
    );
  }

  const now=new Date().toISOString();
  const evidence=lifecycleEvidenceBase(actor,identity,target,input.action,input.reason);
  const evidenceRef=db.doc(`_platformTenantLifecycle/${evidence.id}`);

  await db.runTransaction(async(tx)=>{
    const fresh=await tx.get(target.ref);
    if(!fresh.exists) throw new ApiError(404,'Organization not found.','organization_not_found');
    const freshStatus=String(fresh.data()?.status||'unknown');
    if(freshStatus!==expectedStatus) throw new ApiError(409,'Organization lifecycle state changed. Refresh and retry.','organization_state_changed');

    tx.update(target.ref,{
      status:nextStatus,
      updatedAt:now,
      ...(nextStatus==='inactive'
        ?{deactivatedAt:now,deactivatedByUid:actor.uid,deactivationReason:input.reason}
        :{reactivatedAt:now,reactivatedByUid:actor.uid,reactivationReason:input.reason,deactivatedAt:null,deactivatedByUid:null,deactivationReason:null}),
    });
    tx.create(evidenceRef,{...evidence,status:'completed',completedAt:now,nextStatus});
  });

  return {
    organization:{id:target.id,name:target.name,status:nextStatus,environment:target.environment},
    evidenceId:evidence.id,
  };
}

export async function permanentlyDeletePlatformTenant(actor:ActorContext,identity:IdentityContext,targetOrgId:string,raw:unknown) {
  requireSuperAdmin(actor);
  requireVerifiedPlatformIdentity(identity);
  protectCurrentOrganization(actor,targetOrgId);

  const input=deletePlatformTenantSchema.parse(raw);
  const db=adminDb();
  const target=await targetTenant(targetOrgId);

  if(target.status!=='inactive') {
    throw new ApiError(409,'Deactivate the organization before permanent deletion.','organization_must_be_inactive');
  }
  if(input.organizationName!==target.name) {
    throw new ApiError(400,'The confirmation name must exactly match the organization name.','organization_name_confirmation_mismatch');
  }
  if(target.environment==='production'&&input.productionConfirmation!=='DELETE PRODUCTION') {
    throw new ApiError(400,'Production deletion requires the exact confirmation phrase DELETE PRODUCTION.','production_delete_confirmation_required');
  }

  const dependencies=await dependencySummary(targetOrgId);
  const requestedAt=new Date().toISOString();
  const evidence=lifecycleEvidenceBase(actor,identity,target,'delete',input.reason);
  const evidenceRef=db.doc(`_platformTenantLifecycle/${evidence.id}`);
  const nameIndexRef=db.doc(`_platformOrganizationNames/${createHash('sha256').update(target.nameLower).digest('hex')}`);

  await evidenceRef.create({
    ...evidence,
    status:'requested',
    requestedAt,
    dependencySummary:dependencies,
    deletionCoverage:{
      firestoreTenantTree:'recursive',
      platformNameReservation:'delete',
      authenticationUsers:'preserved',
    },
  });

  try{
    await db.recursiveDelete(target.ref);
    await nameIndexRef.delete();
    const completedAt=new Date().toISOString();
    await evidenceRef.update({
      status:'completed',
      completedAt,
      organizationDeleted:true,
      nameReservationDeleted:true,
    });
    return {
      orgId:target.id,
      organizationName:target.name,
      deletedAt:completedAt,
      evidenceId:evidence.id,
      dependencies,
    };
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    await evidenceRef.set({
      status:'failed',
      failedAt:new Date().toISOString(),
      error:message.slice(0,1000),
    },{merge:true}).catch(()=>undefined);
    throw new ApiError(
      500,
      'Permanent organization deletion did not complete. Platform lifecycle evidence was retained for recovery and reconciliation.',
      'tenant_delete_failed',
    );
  }
}
