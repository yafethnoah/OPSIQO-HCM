import { describe, expect, it } from 'vitest';
import { can, permissionsForRole } from '../src/lib/auth/permissions';

describe('RBAC permissions', () => {
  it('does not let an employee manage people', () => {
    expect(can('employee', 'people.manage')).toBe(false);
  });

  it('allows HR admins to read and export audit evidence', () => {
    expect(can('hr_admin', 'audit.read')).toBe(true);
    expect(can('hr_admin', 'audit.export')).toBe(true);
  });

  it('limits managers to team/workflow actions without private HR or membership administration', () => {
    const permissions = permissionsForRole('manager');
    expect(permissions).toContain('team.read');
    expect(permissions).toContain('workflow.act');
    expect(permissions).not.toContain('audit.read');
    expect(permissions).not.toContain('people.read.private');
    expect(permissions).not.toContain('membership.invite');
  });

  it('allows HR partners to invite members but not administer memberships', () => {
    expect(can('hr_partner', 'membership.invite')).toBe(true);
    expect(can('hr_partner', 'membership.manage')).toBe(false);
  });
});

describe('Phase 1 enterprise hardening permissions', () => {
  it('keeps automation execution and security posture admin-only', () => {
    expect(can('org_admin', 'automation.run')).toBe(true);
    expect(can('hr_admin', 'security.manage')).toBe(true);
    expect(can('hr_partner', 'automation.run')).toBe(false);
    expect(can('manager', 'security.manage')).toBe(false);
  });

  it('gives every workforce role a scoped notification inbox without notification administration', () => {
    expect(can('employee', 'notifications.read')).toBe(true);
    expect(can('manager', 'notifications.read')).toBe(true);
    expect(can('employee', 'notifications.manage')).toBe(false);
    expect(can('hr_partner', 'notifications.manage')).toBe(false);
  });
});


describe('Phase 2 document and compliance permissions', () => {
  it('keeps destructive retention and policy approval with HR administrators', () => {
    expect(can('hr_admin', 'documents.dispose')).toBe(true);
    expect(can('hr_admin', 'policies.approve')).toBe(true);
    expect(can('hr_admin', 'retention.manage')).toBe(true);
    expect(can('hr_partner', 'documents.dispose')).toBe(false);
    expect(can('hr_partner', 'policies.approve')).toBe(false);
  });

  it('allows employees to read their governed evidence but not administer it', () => {
    expect(can('employee', 'documents.read')).toBe(true);
    expect(can('employee', 'policies.read')).toBe(true);
    expect(can('employee', 'compliance.read')).toBe(true);
    expect(can('employee', 'documents.manage')).toBe(false);
    expect(can('employee', 'compliance.manage')).toBe(false);
  });
});


describe('Phase 3 skills and learning permissions', () => {
  it('lets employees self-report and self-enrol without verification or administration rights', () => {
    expect(can('employee', 'learning.read')).toBe(true);
    expect(can('employee', 'learning.self_assign')).toBe(true);
    expect(can('employee', 'learning.verify')).toBe(false);
    expect(can('employee', 'learning.manage')).toBe(false);
  });

  it('lets managers verify and assign learning within service-enforced team scope', () => {
    expect(can('manager', 'learning.read')).toBe(true);
    expect(can('manager', 'learning.assign')).toBe(true);
    expect(can('manager', 'learning.verify')).toBe(true);
    expect(can('manager', 'learning.manage')).toBe(false);
  });

  it('keeps learning administration with HR roles', () => {
    expect(can('hr_partner', 'learning.manage')).toBe(true);
    expect(can('hr_admin', 'learning.manage')).toBe(true);
  });
});

describe('Phase 3 career and succession permissions', () => {
  it('keeps employee and manager access career-scoped without succession visibility', () => {
    expect(can('employee', 'career.read')).toBe(true);
    expect(can('employee', 'career.manage')).toBe(false);
    expect(can('employee', 'succession.read')).toBe(false);
    expect(can('manager', 'career.read')).toBe(true);
    expect(can('manager', 'succession.read')).toBe(false);
  });

  it('separates HR partner nomination authority from talent confirmation/calibration', () => {
    expect(can('hr_partner', 'career.manage')).toBe(true);
    expect(can('hr_partner', 'succession.read')).toBe(true);
    expect(can('hr_partner', 'succession.manage')).toBe(true);
    expect(can('hr_partner', 'talent.calibrate')).toBe(false);
    expect(can('hr_admin', 'talent.calibrate')).toBe(true);
  });
});

describe('Phase 3 health and safety permissions', () => {
  it('lets employees report safety concerns without organization-wide safety read access', () => {
    expect(can('employee', 'safety.report')).toBe(true);
    expect(can('employee', 'safety.read')).toBe(false);
    expect(can('employee', 'safety.manage')).toBe(false);
  });

  it('lets managers report/read safety data but keeps investigation and RTW authority with H&S/HR roles', () => {
    expect(can('manager', 'safety.report')).toBe(true);
    expect(can('manager', 'safety.read')).toBe(true);
    expect(can('manager', 'safety.investigate')).toBe(false);
    expect(can('manager', 'safety.rtw')).toBe(false);
  });

  it('gives HR safety roles governance permissions while closure remains service-gated to HR Admin+', () => {
    expect(can('hr_partner', 'safety.manage')).toBe(true);
    expect(can('hr_partner', 'safety.investigate')).toBe(true);
    expect(can('hr_partner', 'safety.committee')).toBe(true);
    expect(can('hr_admin', 'safety.analytics')).toBe(true);
  });
});


describe('Phase 4 workforce planning permissions', () => {
  it('keeps organization workforce planning out of employee/manager roles', () => {
    expect(can('employee', 'workforce.read')).toBe(false);
    expect(can('manager', 'workforce.read')).toBe(false);
  });
  it('lets HR partners prepare plans without approval authority', () => {
    expect(can('hr_partner', 'workforce.read')).toBe(true);
    expect(can('hr_partner', 'workforce.manage')).toBe(true);
    expect(can('hr_partner', 'workforce.approve')).toBe(false);
  });
  it('keeps scenario approval with HR administrators', () => {
    expect(can('hr_admin', 'workforce.approve')).toBe(true);
    expect(can('org_admin', 'workforce.approve')).toBe(true);
  });
});

describe('Phase 4 HR diagnostic permissions', () => {
  it('lets HR partners assess and remediate without compliance approval authority', () => {
    expect(can('hr_partner', 'diagnostic.read')).toBe(true);
    expect(can('hr_partner', 'diagnostic.manage')).toBe(true);
    expect(can('hr_partner', 'diagnostic.approve')).toBe(false);
  });

  it('keeps diagnostic approval with HR administrators', () => {
    expect(can('hr_admin', 'diagnostic.approve')).toBe(true);
    expect(can('org_admin', 'diagnostic.approve')).toBe(true);
  });

  it('does not expose organization-wide diagnostic evidence to employee or manager roles', () => {
    expect(can('employee', 'diagnostic.read')).toBe(false);
    expect(can('manager', 'diagnostic.read')).toBe(false);
  });
});


describe('Phase 4 v2.6 privacy and AI assurance permissions',()=>{
  it('lets HR partners manage privacy work without independent approval authority',()=>{
    expect(can('hr_partner','privacy.read')).toBe(true);
    expect(can('hr_partner','privacy.manage')).toBe(true);
    expect(can('hr_partner','privacy.audit')).toBe(true);
    expect(can('hr_partner','privacy.approve')).toBe(false);
  });
  it('keeps privacy approval with HR administrators and out of employee/manager roles',()=>{
    expect(can('hr_admin','privacy.approve')).toBe(true);
    expect(can('org_admin','privacy.approve')).toBe(true);
    expect(can('employee','privacy.read')).toBe(false);
    expect(can('manager','privacy.read')).toBe(false);
  });
});


describe('Phase 4 v2.7 workforce resilience permissions',()=>{
  it('lets HR partners manage resilience work without approval authority',()=>{
    expect(can('hr_partner','resilience.read')).toBe(true);
    expect(can('hr_partner','resilience.manage')).toBe(true);
    expect(can('hr_partner','resilience.incident')).toBe(true);
    expect(can('hr_partner','resilience.approve')).toBe(false);
  });
  it('lets managers read/report incidents but not administer or approve resilience governance',()=>{
    expect(can('manager','resilience.read')).toBe(true);
    expect(can('manager','resilience.incident')).toBe(true);
    expect(can('manager','resilience.manage')).toBe(false);
    expect(can('manager','resilience.approve')).toBe(false);
  });
  it('keeps governed resilience approval with administrators and out of employee roles',()=>{
    expect(can('hr_admin','resilience.approve')).toBe(true);
    expect(can('org_admin','resilience.approve')).toBe(true);
    expect(can('employee','resilience.read')).toBe(false);
  });
});


describe('Phase 4 v2.9 organization-design permissions',()=>{
  it('lets HR partners manage organization-design work without independent approval authority',()=>{
    expect(can('hr_partner','orgdesign.read')).toBe(true);
    expect(can('hr_partner','orgdesign.manage')).toBe(true);
    expect(can('hr_partner','orgdesign.audit')).toBe(true);
    expect(can('hr_partner','orgdesign.approve')).toBe(false);
  });
  it('keeps organization-design approval with administrators and out of employee/manager roles',()=>{
    expect(can('hr_admin','orgdesign.approve')).toBe(true);
    expect(can('org_admin','orgdesign.approve')).toBe(true);
    expect(can('employee','orgdesign.read')).toBe(false);
    expect(can('manager','orgdesign.read')).toBe(false);
  });
});


describe('v3.0 Enterprise HCM Command Center permissions',()=>{
  it('lets HR partners coordinate enterprise HCM work without independent approval authority',()=>{
    expect(can('hr_partner','commandcenter.read')).toBe(true);
    expect(can('hr_partner','commandcenter.manage')).toBe(true);
    expect(can('hr_partner','commandcenter.audit')).toBe(true);
    expect(can('hr_partner','commandcenter.approve')).toBe(false);
  });
  it('keeps enterprise command approval with administrators and out of manager/employee roles',()=>{
    expect(can('hr_admin','commandcenter.approve')).toBe(true);
    expect(can('org_admin','commandcenter.approve')).toBe(true);
    expect(can('manager','commandcenter.read')).toBe(false);
    expect(can('employee','commandcenter.read')).toBe(false);
  });
});
