import type { Membership } from '@/domain/security';
import type { Organization, OrganizationMembershipSummary } from '@/domain/organization';
import { adminDb } from '@/lib/firebase/admin';
import type { IdentityContext } from '@/lib/auth/session';

export async function listOrganizationsForIdentity(identity: IdentityContext): Promise<OrganizationMembershipSummary[]> {
  if (identity.demo) {
    const orgId = process.env.OPSIQO_DEMO_ORG_ID || 'demo-org';
    const snap = await adminDb().doc(`organizations/${orgId}`).get();
    const org = snap.data() as Organization | undefined;
    return [{ orgId, name: org?.name || 'OPSIQO Demo Organization', role: 'org_admin', workerId: process.env.OPSIQO_DEMO_WORKER_ID || 'worker-001', status: 'active' }];
  }

  const membershipSnaps = await adminDb().collectionGroup('memberships')
    .where('uid', '==', identity.uid)
    .where('status', '==', 'active')
    .get();

  const rows: Array<OrganizationMembershipSummary | null> = await Promise.all(membershipSnaps.docs.map(async (doc) => {
    const membership = doc.data() as Membership;
    const orgId = doc.ref.parent.parent?.id;
    if (!orgId) return null;
    const orgSnap = await adminDb().doc(`organizations/${orgId}`).get();
    const org = orgSnap.data() as Organization | undefined;
    if (!org || org.status !== 'active') return null;
    return { orgId, name: org.name, role: membership.role, workerId: membership.workerId, status: membership.status } satisfies OrganizationMembershipSummary;
  }));

  return rows.filter((row): row is OrganizationMembershipSummary => row !== null).sort((a,b) => a.name.localeCompare(b.name));
}
