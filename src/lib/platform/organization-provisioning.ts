import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import { buildAudit } from '@/lib/audit/service';
import { permissionsForRole } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { createInvitation, actOnInvitation } from '@/lib/membership/service';
import { organizationIdFromName } from '@/lib/organization/bootstrap';
import type { PlatformAdministratorContext } from './authorization';

const sizeBands = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'] as const;

export const platformOrganizationCreateSchema = z.object({
  idempotencyKey: z.string().uuid(),
  organizationName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().min(2).max(160).optional(),
  slug: z.string().trim().max(64).optional(),
  country: z.string().trim().min(2).max(80),
  region: z.string().trim().max(100).optional(),
  timezone: z.string().trim().min(2).max(100),
  industry: z.string().trim().max(120).optional(),
  sizeBand: z.enum(sizeBands).optional(),
  defaultLanguage: z.string().trim().min(2).max(16).default('en'),
  primaryAdminEmail: z.string().email(),
  primaryAdminFirstName: z.string().trim().min(1).max(80),
  primaryAdminLastName: z.string().trim().min(1).max(80),
});

export const platformOrganizationActionSchema = z.object({
  action: z.enum(['activate', 'suspend', 'archive', 'resend_primary_admin_invitation']),
});

export function normalizeOrganizationSlug(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  if (!slug) throw new ApiError(400, 'Organization slug cannot be empty.', 'invalid_organization_slug');
  return slug;
}

function platformActor(platform: PlatformAdministratorContext, orgId: string): ActorContext {
  return {
    uid: platform.uid,
    orgId,
    role: 'super_admin',
    permissions: permissionsForRole('super_admin'),
  };
}

function lifecycleFromOrganization(data: Record<string, unknown>): 'active' | 'suspended' | 'archived' {
  const explicit = String(data.lifecycleStatus || '');
  if (explicit === 'suspended' || explicit === 'archived') return explicit;
  return data.status === 'active' ? 'active' : 'suspended';
}

export async function listPlatformOrganizations() {
  const snap = await adminDb().collection('organizations').limit(250).get();
  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      name: String(data.name || doc.id),
      legalName: typeof data.legalName === 'string' ? data.legalName : undefined,
      slug: typeof data.slug === 'string' ? data.slug : undefined,
      country: typeof data.country === 'string' ? data.country : undefined,
      region: typeof data.region === 'string' ? data.region : undefined,
      timezone: typeof data.timezone === 'string' ? data.timezone : undefined,
      industry: typeof data.industry === 'string' ? data.industry : undefined,
      sizeBand: typeof data.sizeBand === 'string' ? data.sizeBand : undefined,
      primaryAdminEmail: typeof data.primaryAdminEmail === 'string' ? data.primaryAdminEmail : undefined,
      status: String(data.status || 'inactive'),
      lifecycleStatus: lifecycleFromOrganization(data),
      provisioningStatus: String(data.provisioningStatus || 'legacy'),
      onboardingStatus: String(data.onboardingStatus || 'not_started'),
      createdAt: String(data.createdAt || ''),
      updatedAt: String(data.updatedAt || ''),
    };
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function ensurePrimaryAdminInvitation(
  platform: PlatformAdministratorContext,
  orgId: string,
  email: string,
  workerId: string,
) {
  const db = adminDb();
  const orgRef = db.doc(`organizations/${orgId}`);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new ApiError(404, 'Organization not found after provisioning.', 'organization_not_found');

  const existingId = orgSnap.data()?.initialAdminInvitationId as string | undefined;
  if (existingId) {
    return { delivery: 'existing' as const, invitationId: existingId, inviteUrl: undefined as string | undefined };
  }

  const emailLower = email.trim().toLowerCase();
  const prior = await db.collection(`organizations/${orgId}/invitations`)
    .where('email', '==', emailLower)
    .limit(10)
    .get();

  const reusable = prior.docs
    .map((doc) => doc.data() as { id?: string; status?: string; expiresAt?: string })
    .find((invitation) => invitation.id && (
      invitation.status === 'accepted'
      || (invitation.status === 'pending' && String(invitation.expiresAt || '') > new Date().toISOString())
    ));

  if (reusable?.id) {
    await orgRef.set({
      initialAdminInvitationId: reusable.id,
      provisioningStatus: 'ready',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return { delivery: 'existing' as const, invitationId: reusable.id, inviteUrl: undefined as string | undefined };
  }

  const actor = platformActor(platform, orgId);

  try {
    const result = await createInvitation(actor, {
      email: emailLower,
      role: 'org_admin',
      workerId,
      expiresInDays: 7,
    });

    await orgRef.set({
      initialAdminInvitationId: result.invitation.id,
      provisioningStatus: 'ready',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return {
      delivery: result.delivery,
      invitationId: result.invitation.id,
      inviteUrl: result.inviteUrl,
    };
  } catch (error) {
    await orgRef.set({
      provisioningStatus: 'attention_required',
      provisioningIssue: 'primary_admin_invitation_failed',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    throw error;
  }
}

export async function provisionOrganization(platform: PlatformAdministratorContext, raw: unknown) {
  const input = platformOrganizationCreateSchema.parse(raw);
  const db = adminDb();
  const timestamp = new Date().toISOString();
  const startDate = timestamp.slice(0, 10);
  const slug = normalizeOrganizationSlug(input.slug || input.organizationName);
  const primaryAdminEmail = input.primaryAdminEmail.trim().toLowerCase();

  const requestRef = db.doc(`platformOrganizationProvisioning/${input.idempotencyKey}`);
  const slugRef = db.doc(`platformOrganizationSlugs/${slug}`);

  const result = await db.runTransaction(async (tx) => {
    const existingRequest = await tx.get(requestRef);
    if (existingRequest.exists) {
      const prior = existingRequest.data() as {
        createdByUid?: string;
        orgId?: string;
        workerId?: string;
        primaryAdminEmail?: string;
      };
      if (prior.createdByUid !== platform.uid) {
        throw new ApiError(409, 'Idempotency key is already owned by another platform action.', 'idempotency_collision');
      }
      if (!prior.orgId || !prior.workerId || !prior.primaryAdminEmail) {
        throw new ApiError(409, 'Prior provisioning request is incomplete and requires platform review.', 'provisioning_request_incomplete');
      }
      return {
        replayed: true as const,
        orgId: prior.orgId,
        workerId: prior.workerId,
        primaryAdminEmail: prior.primaryAdminEmail,
      };
    }

    const existingSlug = await tx.get(slugRef);
    if (existingSlug.exists) {
      throw new ApiError(409, `Organization slug "${slug}" is already in use.`, 'organization_slug_exists');
    }

    const orgId = organizationIdFromName(input.organizationName);
    const personId = `person-${randomUUID()}`;
    const workerId = `worker-${randomUUID()}`;
    const employmentId = `employment-${randomUUID()}`;
    const assignmentId = `assignment-${randomUUID()}`;
    const orgUnitId = `unit-${randomUUID()}`;
    const positionId = `position-${randomUUID()}`;
    const orgRef = db.doc(`organizations/${orgId}`);

    const organization = {
      id: orgId,
      name: input.organizationName,
      legalName: input.legalName || input.organizationName,
      slug,
      status: 'active' as const,
      lifecycleStatus: 'active' as const,
      provisioningStatus: 'provisioning' as const,
      onboardingStatus: 'not_started' as const,
      country: input.country,
      region: input.region || null,
      timezone: input.timezone,
      industry: input.industry || null,
      sizeBand: input.sizeBand || null,
      defaultLanguage: input.defaultLanguage,
      primaryAdminEmail,
      createdByUid: platform.uid,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const actor = platformActor(platform, orgId);
    const audit = buildAudit(actor, {
      action: 'platform.organization.create',
      entityType: 'organization',
      entityId: orgId,
      after: organization,
      metadata: {
        platformAdminSource: platform.source,
        primaryAdminEmail,
        idempotencyKey: input.idempotencyKey,
      },
    });

    tx.create(orgRef, organization);
    tx.create(slugRef, { slug, orgId, createdAt: timestamp, createdByUid: platform.uid });
    tx.create(requestRef, {
      idempotencyKey: input.idempotencyKey,
      orgId,
      workerId,
      primaryAdminEmail,
      createdByUid: platform.uid,
      createdAt: timestamp,
      status: 'organization_created',
    });

    tx.create(db.doc(`organizations/${orgId}/orgUnits/${orgUnitId}`), {
      id: orgUnitId,
      name: input.organizationName,
      code: 'ORG',
      type: 'company',
      status: 'active',
      managerWorkerId: workerId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/positions/${positionId}`), {
      id: positionId,
      positionCode: 'P-ADMIN-001',
      title: 'Organization Administrator',
      orgUnitId,
      status: 'filled',
      fte: 1,
      headcountLimit: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/positionOccupancy/${positionId}`), {
      positionId,
      occupiedHeadcount: 1,
      occupiedFte: 1,
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/people/${personId}`), {
      id: personId,
      legalFirstName: input.primaryAdminFirstName,
      legalLastName: input.primaryAdminLastName,
      workEmail: primaryAdminEmail,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const displayName = `${input.primaryAdminFirstName} ${input.primaryAdminLastName}`.trim();
    tx.create(db.doc(`organizations/${orgId}/workers/${workerId}`), {
      id: workerId,
      personId,
      employeeNumber: 'ADMIN-001',
      employeeNumberLower: 'admin-001',
      displayName,
      displayNameLower: displayName.toLowerCase(),
      workEmail: primaryAdminEmail,
      workEmailLower: primaryAdminEmail,
      status: 'active',
      primaryAssignmentId: assignmentId,
      hireDate: startDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/workerDirectory/${workerId}`), {
      id: workerId,
      displayName,
      workEmail: primaryAdminEmail,
      status: 'active',
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/employments/${employmentId}`), {
      id: employmentId,
      workerId,
      employmentType: 'permanent',
      startDate,
      fte: 1,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/assignments/${assignmentId}`), {
      id: assignmentId,
      workerId,
      employmentId,
      positionId,
      orgUnitId,
      primary: true,
      assignmentType: 'primary',
      allocationFte: 1,
      startDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/employeeNumberIndex/admin-001`), {
      employeeNumber: 'ADMIN-001',
      workerId,
      createdAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/workEmailIndex/${encodeURIComponent(primaryAdminEmail)}`), {
      workEmail: primaryAdminEmail,
      workerId,
      createdAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/settings/platform`), {
      mfaPolicy: 'privileged_required',
      guestAccessEnabled: false,
      guestReadOnly: true,
      allowPasswordSignIn: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/settings/organizationOnboarding`), {
      status: 'not_started',
      foundationComplete: true,
      primaryAdminInvited: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    tx.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
    tx.create(db.doc(`platformAuditLogs/${audit.id}`), {
      ...audit,
      scope: 'platform',
      organizationId: orgId,
    });

    return { replayed: false as const, orgId, workerId, primaryAdminEmail };
  });

  const invitation = await ensurePrimaryAdminInvitation(
    platform,
    result.orgId,
    result.primaryAdminEmail,
    result.workerId,
  );

  await db.doc(`organizations/${result.orgId}/settings/organizationOnboarding`).set({
    primaryAdminInvited: true,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await requestRef.set({
    status: 'completed',
    invitationId: invitation.invitationId,
    completedAt: new Date().toISOString(),
  }, { merge: true });

  const orgSnap = await db.doc(`organizations/${result.orgId}`).get();
  return {
    orgId: result.orgId,
    organization: orgSnap.data(),
    replayed: result.replayed,
    primaryAdminWorkerId: result.workerId,
    invitation,
  };
}

export async function actOnPlatformOrganization(
  platform: PlatformAdministratorContext,
  orgId: string,
  raw: unknown,
) {
  const input = platformOrganizationActionSchema.parse(raw);
  const db = adminDb();
  const orgRef = db.doc(`organizations/${orgId}`);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new ApiError(404, 'Organization not found.', 'organization_not_found');
  const before = orgSnap.data() as Record<string, unknown>;
  const lifecycle = lifecycleFromOrganization(before);
  const actor = platformActor(platform, orgId);

  if (input.action === 'resend_primary_admin_invitation') {
    const invitationId = before.initialAdminInvitationId as string | undefined;
    if (!invitationId) {
      throw new ApiError(409, 'Primary administrator invitation is not available for resend.', 'primary_admin_invitation_missing');
    }
    const result = await actOnInvitation(actor, invitationId, { action: 'resend', expiresInDays: 7 });
    return { organizationId: orgId, action: input.action, invitation: result };
  }

  if (input.action === 'archive' && lifecycle !== 'suspended') {
    throw new ApiError(409, 'Suspend the organization before archiving it.', 'organization_must_be_suspended');
  }
  if (input.action === 'activate' && lifecycle === 'archived') {
    throw new ApiError(409, 'Archived organizations cannot be reactivated through the standard lifecycle action.', 'organization_archived');
  }

  const timestamp = new Date().toISOString();
  const nextLifecycle = input.action === 'activate' ? 'active' : input.action === 'archive' ? 'archived' : 'suspended';
  const after = {
    ...before,
    status: nextLifecycle === 'active' ? 'active' : 'inactive',
    lifecycleStatus: nextLifecycle,
    updatedAt: timestamp,
    lifecycleUpdatedAt: timestamp,
    lifecycleUpdatedByUid: platform.uid,
  };

  const audit = buildAudit(actor, {
    action: `platform.organization.${input.action}`,
    entityType: 'organization',
    entityId: orgId,
    before,
    after,
    metadata: { platformAdminSource: platform.source },
  });

  const batch = db.batch();
  batch.set(orgRef, after, { merge: true });
  batch.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
  batch.create(db.doc(`platformAuditLogs/${audit.id}`), {
    ...audit,
    scope: 'platform',
    organizationId: orgId,
  });
  await batch.commit();

  return {
    organizationId: orgId,
    action: input.action,
    lifecycleStatus: nextLifecycle,
    status: nextLifecycle === 'active' ? 'active' : 'inactive',
  };
}
