import { describe, expect, it } from 'vitest';
import { applicationStageSchema, candidateApplicationCreateSchema, offerCreateSchema, requisitionActionSchema, requisitionCreateSchema } from '../src/lib/recruiting/schemas';
import { can } from '../src/lib/auth/permissions';

describe('Phase 2 recruiting schemas', () => {
  it('requires explicit candidate consent at intake', () => {
    const parsed = candidateApplicationCreateSchema.safeParse({ requisitionId:'req-1', firstName:'Taylor', lastName:'Ng', email:'taylor@example.com', consent:false });
    expect(parsed.success).toBe(false);
  });
  it('requires a compensation basis on offers', () => {
    expect(offerCreateSchema.safeParse({ applicationId:'app-1', currency:'CAD', startDate:'2026-08-10' }).success).toBe(false);
    expect(offerCreateSchema.safeParse({ applicationId:'app-1', currency:'cad', baseSalary:80000, startDate:'2026-08-10' }).success).toBe(true);
  });
  it('requires position, unit and hiring manager on requisitions', () => {
    expect(requisitionCreateSchema.safeParse({ title:'HR Coordinator', employmentType:'permanent', headcount:1 }).success).toBe(false);
  });

  it('accepts controlled application stages and requisition close action', () => {
    expect(applicationStageSchema.safeParse({ stage:'assessment' }).success).toBe(true);
    expect(applicationStageSchema.safeParse({ stage:'hired' }).success).toBe(false);
    expect(requisitionActionSchema.safeParse({ action:'close' }).success).toBe(true);
  });
});

describe('Phase 2 recruiting permissions', () => {
  it('lets managers recruit within scope but not approve offers or hire', () => {
    expect(can('manager','recruiting.read')).toBe(true);
    expect(can('manager','recruiting.manage.team')).toBe(true);
    expect(can('manager','recruiting.manage')).toBe(false);
    expect(can('manager','recruiting.interview')).toBe(true);
    expect(can('manager','recruiting.offer')).toBe(false);
    expect(can('manager','recruiting.hire')).toBe(false);
  });
  it('separates HR partner offer preparation from administrator approval and hire conversion', () => {
    expect(can('hr_partner','recruiting.offer')).toBe(true);
    expect(can('hr_partner','recruiting.approve')).toBe(false);
    expect(can('hr_partner','recruiting.hire')).toBe(false);
    expect(can('hr_admin','recruiting.hire')).toBe(true);
  });
});
