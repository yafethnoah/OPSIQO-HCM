import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const authorization = readFileSync('src/lib/platform/authorization.ts', 'utf8');
const provisioning = readFileSync('src/lib/platform/organization-provisioning.ts', 'utf8');
const nav = readFileSync('src/components/nav.tsx', 'utf8');
const session = readFileSync('src/lib/auth/session.ts', 'utf8');
const bootstrap = readFileSync('src/lib/organization/bootstrap.ts', 'utf8');
const api = readFileSync('src/app/api/platform/organizations/route.ts', 'utf8');

describe('multi-organization platform provisioning', () => {
  it('keeps first-organization bootstrap independently gated', () => {
    expect(bootstrap).toContain("OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP !== 'true'");
    expect(bootstrap).toContain('First-organization bootstrap is disabled.');
  });

  it('uses platform-admin authorization outside tenant permission claims', () => {
    expect(authorization).toContain('platformAdministratorFromRequest');
    expect(authorization).toContain('OPSIQO_PLATFORM_ADMIN_EMAILS');
    expect(authorization).toContain('OPSIQO_REQUIRE_PLATFORM_ADMIN_MFA');
    expect(authorization).toContain("'platform_admin_required'");
    expect(authorization).not.toContain("permissions.includes('platform.manage')");
  });

  it('provides a tenant-independent platform API', () => {
    expect(api).toContain('platformAdministratorFromRequest(request)');
    expect(api).toContain('listPlatformOrganizations()');
    expect(api).toContain('provisionOrganization(actor, body)');
  });

  it('creates tenant foundation transactionally and reserves slug/idempotency', () => {
    expect(provisioning).toContain('platformOrganizationProvisioning/');
    expect(provisioning).toContain('platformOrganizationSlugs/');
    expect(provisioning).toContain('db.runTransaction');
    expect(provisioning).toContain('positionOccupancy');
    expect(provisioning).toContain('workerDirectory');
    expect(provisioning).toContain('employeeNumberIndex/admin-001');
  });

  it('provisions the primary admin through the governed invitation service', () => {
    expect(provisioning).toContain('createInvitation(actor');
    expect(provisioning).toContain("role: 'org_admin'");
    expect(provisioning).toContain('initialAdminInvitationId');
  });

  it('writes both organization and platform audit evidence', () => {
    expect(provisioning).toContain('platform.organization.create');
    expect(provisioning).toContain('platformAuditLogs/');
    expect(provisioning).toContain('auditLogs/');
  });

  it('uses lifecycle controls rather than destructive organization deletion', () => {
    expect(provisioning).toContain("'activate', 'suspend', 'archive'");
    expect(provisioning).toContain('Suspend the organization before archiving it.');
    expect(provisioning).not.toContain('deleteOrganization(');
  });

  it('blocks tenant-scoped APIs when an organization is inactive', () => {
    expect(session).toContain('organization_inactive');
    expect(session).toContain("organization.status !== 'active'");
  });

  it('surfaces platform organization administration in navigation only after platform access', () => {
    expect(nav).toContain("href:'/platform/organizations'");
    expect(nav).toContain('platformOnly:true');
    expect(nav).toContain("'/api/platform/access'");
  });
});
