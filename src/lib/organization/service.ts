import type { ActorContext, Membership } from '@/domain/security';
import type { Organization, OrganizationMembershipSummary } from '@/domain/organization';
import { adminDb } from '@/lib/firebase/admin';
import type { IdentityContext } from '@/lib/auth/session';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

export async function listOrganizationsForIdentity(identity: IdentityContext): Promise<OrganizationMembershipSummary[]> {
  if (identity.demo) {
    const orgId = process.env.OPSIQO_DEMO_ORG_ID || 'demo-org';
    const snap = await adminDb().doc(`organizations/${orgId}`).get();
    const org = snap.data() as Organization | undefined;
    return [{
      orgId,
      name: org?.name || 'OPSIQO Demo Organization',
      role: 'org_admin',
      workerId: process.env.OPSIQO_DEMO_WORKER_ID || 'worker-001',
      status: 'active',
    }];
  }

  const membershipSnaps = await adminDb().collectionGroup('memberships')
    .where('uid', '==', identity.uid)
    .where('status', '==', 'active')
    .get();

  const rows: Array<OrganizationMembershipSummary | null> = await Promise.all(
    membershipSnaps.docs.map(async (doc) => {
      const membership = doc.data() as Membership;
      const orgId = doc.ref.parent.parent?.id;
      if (!orgId) return null;

      const orgSnap = await adminDb().doc(`organizations/${orgId}`).get();
      const org = orgSnap.data() as Organization | undefined;
      if (!org || org.status !== 'active') return null;

      return {
        orgId,
        name: org.name,
        role: membership.role,
        workerId: membership.workerId,
        status: membership.status,
      } satisfies OrganizationMembershipSummary;
    }),
  );

  return rows
    .filter((row): row is OrganizationMembershipSummary => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function activateOrganizationForIdentity(
  identity: IdentityContext,
  rawOrgId: string,
  reason = 'user_switch',
): Promise<OrganizationMembershipSummary> {
  const orgId = String(rawOrgId || '').trim();
  if (!orgId) throw new ApiError(400, 'Organization id is required.', 'missing_org');

  if (identity.demo) {
    const rows = await listOrganizationsForIdentity(identity);
    const selected = rows.find((row) => row.orgId === orgId);
    if (!selected) throw new ApiError(403, 'No active membership for this organization.', 'membership_required');
    return selected;
  }

  const db = adminDb();
  const [orgSnap, membershipSnap] = await Promise.all([
    db.doc(`organizations/${orgId}`).get(),
    db.doc(`organizations/${orgId}/memberships/${identity.uid}`).get(),
  ]);

  if (!orgSnap.exists) throw new ApiError(404, 'Organization does not exist.', 'organization_not_found');
  const org = orgSnap.data() as Organization;
  if (org.status !== 'active') throw new ApiError(403, 'Organization access is suspended or inactive.', 'organization_inactive');

  if (!membershipSnap.exists) throw new ApiError(403, 'No membership for this organization.', 'membership_required');
  const membership = membershipSnap.data() as Membership;
  if (membership.uid !== identity.uid || membership.status !== 'active') {
    throw new ApiError(403, 'Membership is inactive or does not belong to this identity.', 'membership_inactive');
  }

  const summary: OrganizationMembershipSummary = {
    orgId,
    name: org.name,
    role: membership.role,
    workerId: membership.workerId,
    status: membership.status,
  };

  const actor: ActorContext = {
    uid: identity.uid,
    orgId,
    workerId: membership.workerId,
    role: membership.role,
    permissions: [],
  };
  const audit = buildAudit(actor, {
    action: 'membership.organization.switch',
    entityType: 'organization',
    entityId: orgId,
    after: summary,
    metadata: { reason: String(reason || 'user_switch').slice(0, 80) },
  });
  await db.doc(`organizations/${orgId}/auditLogs/${audit.id}`).create(audit);

  return summary;
}
