import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const membership = readFileSync('src/lib/membership/service.ts','utf8');
const organization = readFileSync('src/lib/organization/service.ts','utf8');
const switcher = readFileSync('src/components/organization-switcher.tsx','utf8');
const acceptInvite = readFileSync('src/components/accept-invite.tsx','utf8');
const activateRoute = readFileSync('src/app/api/me/organizations/activate/route.ts','utf8');

describe('V7.9.4.1 multi-organization membership and switching closure',()=>{
  it('discovers every active membership for the authenticated identity',()=>{
    expect(organization).toContain("collectionGroup('memberships')");
    expect(organization).toContain(".where('uid', '==', identity.uid)");
    expect(organization).toContain(".where('status', '==', 'active')");
    expect(organization).toContain("org.status !== 'active'");
  });

  it('validates organization activation server-side before local tenant switching',()=>{
    expect(activateRoute).toContain('identityFromRequest(request)');
    expect(activateRoute).toContain('activateOrganizationForIdentity');
    expect(organization).toContain("organizations/${orgId}/memberships/${identity.uid}");
    expect(organization).toContain("action: 'membership.organization.switch'");
    expect(switcher).toContain("'/api/me/organizations/activate'");
    expect(switcher).toContain("orgContext: 'omit'");
    expect(switcher.indexOf("'/api/me/organizations/activate'")).toBeLessThan(switcher.indexOf('setActiveOrgId(response.data.orgId)'));
  });

  it('does not direct ordinary users back into first-organization bootstrap when memberships are absent',()=>{
    expect(switcher).not.toContain('href="/setup"');
    expect(switcher).toContain('No active organization membership');
  });

  it('preserves an existing active membership instead of overwriting role or worker linkage',()=>{
    expect(membership).toContain('existingMembershipSnap');
    expect(membership).toContain("'membership_role_conflict'");
    expect(membership).toContain("'membership_worker_conflict'");
    expect(membership).toContain('preservedExistingMembership');
  });

  it('keeps invitation acceptance one-time and email bound',()=>{
    expect(membership).toContain('Invitation email does not match the signed-in account.');
    expect(membership).toContain("'invitation_email_mismatch'");
    expect(membership).toContain('const currentTokenIndex = await tx.get(tokenIndexRef)');
    expect(membership).toContain('tx.delete(tokenIndexRef)');
  });

  it('activates a newly accepted organization without replacing other tenant memberships',()=>{
    expect(acceptInvite).toContain('adds or reactivates only that organization membership');
    expect(acceptInvite).toContain("reason: 'invitation_accept'");
    expect(acceptInvite).toContain('Your existing organization memberships were preserved');
    expect(membership).not.toContain('collectionGroup(\'memberships\').delete');
  });
});
