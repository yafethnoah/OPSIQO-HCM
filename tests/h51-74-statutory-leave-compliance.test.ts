import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_ONTARIO_STATUTORY_LEAVE_TEMPLATES,
  ONTARIO_STATUTORY_LEAVE_TEMPLATES,
  getLeaveComplianceTemplate,
  statutoryLeaveTypeDefaults,
} from '../src/lib/time/leave-compliance';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('H51.74 Ontario statutory leave compliance engine', () => {
  it('registers a comprehensive official Ontario statutory leave library', () => {
    expect(ONTARIO_STATUTORY_LEAVE_TEMPLATES.length).toBeGreaterThanOrEqual(20);
    expect(ACTIVE_ONTARIO_STATUTORY_LEAVE_TEMPLATES.length).toBeGreaterThanOrEqual(18);
    for (const template of ONTARIO_STATUTORY_LEAVE_TEMPLATES) {
      expect(template.jurisdictionCode).toBe('CA-ON');
      expect(new URL(template.sourceUrl).hostname).toBe('www.ontario.ca');
      expect(template.sourceObservedAt).toBe('2026-09-22');
      expect(template.paidSummary.length).toBeGreaterThan(5);
      expect(template.unpaidSummary.length).toBeGreaterThan(5);
    }
  });

  it('models simple unpaid day leaves without silently making them paid', () => {
    const sick = getLeaveComplianceTemplate('CA-ON', 'sick')!;
    expect(sick.entitlementSummary).toContain('3 days');
    expect(sick.paidSummary).toContain('0 employer-paid statutory days');
    expect(sick.unpaidSummary).toContain('3 unpaid');
    expect(sick.partialDayCharging).toBe('full_scheduled_day');

    const bereavement = getLeaveComplianceTemplate('CA-ON', 'bereavement')!;
    expect(bereavement.entitlementSummary).toContain('2 days');
    expect(bereavement.operationalPaidDefault).toBe(false);
  });

  it('models mixed paid/unpaid domestic or sexual violence leave explicitly', () => {
    const leave = getLeaveComplianceTemplate('CA-ON', 'domestic_sexual_violence')!;
    expect(leave.paymentClassification).toBe('mixed_paid_unpaid');
    expect(leave.entitlementSummary).toContain('10 days');
    expect(leave.entitlementSummary).toContain('15 weeks');
    expect(leave.paidSummary).toContain('first 5');
    expect(leave.unpaidSummary).toContain('balance');
    expect(leave.operationalPaidDefault).toBe(false);
  });

  it('keeps vacation time and vacation pay separate and service-tiered', () => {
    const vacation = getLeaveComplianceTemplate('CA-ON', 'vacation')!;
    expect(vacation.entitlementSummary).toContain('2 weeks');
    expect(vacation.entitlementSummary).toContain('3 weeks');
    expect(vacation.paidSummary).toContain('4%');
    expect(vacation.paidSummary).toContain('6%');
    expect(vacation.paymentClassification).toBe('vacation_pay');
  });

  it('keeps future and currently inactive legal rules out of automatic activation', () => {
    expect(getLeaveComplianceTemplate('CA-ON', 'placement_child')?.legalStatus).toBe('future_not_in_force');
    expect(getLeaveComplianceTemplate('CA-ON', 'declared_emergency')?.legalStatus).toBe('conditional_inactive');
    expect(ACTIVE_ONTARIO_STATUTORY_LEAVE_TEMPLATES.some((x) => x.id === 'placement_child')).toBe(false);
    expect(ACTIVE_ONTARIO_STATUTORY_LEAVE_TEMPLATES.some((x) => x.id === 'declared_emergency')).toBe(false);
  });

  it('creates statutory leave defaults server-side rather than trusting a paid checkbox', () => {
    const sick = statutoryLeaveTypeDefaults('sick');
    expect(sick.statutory).toBe(true);
    expect(sick.jobProtected).toBe(true);
    expect(sick.paid).toBe(false);
    expect(sick.accrualMethod).toBe('none');
    expect(sick.compliance?.paymentClassification).toBe('unpaid_statutory');

    const dsv = statutoryLeaveTypeDefaults('domestic_sexual_violence', 2, 'Employer enhancement');
    expect(dsv.paid).toBe(false);
    expect(dsv.compliance?.paymentClassification).toBe('mixed_paid_unpaid');
    expect(dsv.compliance?.employerEnhancementPaidDays).toBe(2);
  });

  it('wires bulk jurisdiction bootstrap and governed creation into the server API', () => {
    const service = read('src/lib/time/service.ts');
    const route = read('src/app/api/organizations/[orgId]/leave/types/bootstrap/route.ts');
    expect(service).toContain('bootstrapStatutoryLeaveTypes');
    expect(service).toContain('ACTIVE_ONTARIO_STATUTORY_LEAVE_TEMPLATES');
    expect(service).toContain('statutoryLeaveTypeDefaults');
    expect(service).toContain("leave_rule_not_active");
    expect(route).toContain("requirePermission(actor, 'leave.manage')");
  });

  it('makes paid/unpaid statutory configuration visible to HR without weakening H51.73 generic starters', () => {
    const workspace = read('src/components/time-workspace.tsx');
    const genericStarters = read('src/lib/time/leave-type-templates.ts');
    expect(workspace).toContain('Configure Ontario statutory leaves');
    expect(workspace).toContain('Paid by employer');
    expect(workspace).toContain('Unpaid statutory');
    expect(workspace).toContain('Employer enhancement');
    expect(workspace).toContain('Official Ontario source');
    expect(workspace).toContain('OPSIQO does not infer legal entitlement');
    expect(genericStarters).not.toContain('jobProtected');
    expect(genericStarters).not.toContain('statutory');
  });

  it('corrects placement-of-child readiness language to avoid activating a future rule', () => {
    const readiness = read('src/lib/country-compliance/ontario-readiness.ts');
    expect(readiness).toContain('not yet in force');
    expect(readiness).toContain('Do not activate');
  });
});
