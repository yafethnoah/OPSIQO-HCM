import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ONTARIO_RECRUITING_2026_CONTROLS,
  assessOntarioComplianceReadiness,
  defaultOntarioComplianceProfile,
} from '@/lib/country-compliance/ontario-readiness';

describe('H51.45 Ontario compliance operations', () => {
  it('uses the January 1 snapshot for annual 25+ policy applicability', () => {
    const below = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 50,
      ontarioEmployeesOnJan1: 24,
      jan1EmployeeCountReviewed: true,
      workplaceWorkerCount: 25,
    }, '2026-09-12');
    expect(below.obligations.find((item) => item.id === 'disconnecting-policy')?.applicability).toBe('not_applicable');

    const threshold = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 50,
      ontarioEmployeesOnJan1: 25,
      jan1EmployeeCountReviewed: true,
      workplaceWorkerCount: 25,
    }, '2026-09-12');
    expect(threshold.obligations.find((item) => item.id === 'disconnecting-policy')?.applicability).toBe('required');
  });

  it('fails closed when the January 1 snapshot has not been reviewed', () => {
    const result = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 50,
      workplaceWorkerCount: 25,
      jan1EmployeeCountReviewed: false,
    }, '2026-09-12');
    expect(result.obligations.find((item) => item.id === 'disconnecting-policy')?.operationalStatus).toBe('review_required');
    expect(result.blockers).toContain('January 1 Ontario employee-count snapshot is unresolved.');
  });

  it('marks missing March 1 policy evidence overdue after the deadline', () => {
    const result = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 25,
      ontarioEmployeesOnJan1: 25,
      jan1EmployeeCountReviewed: true,
      workplaceWorkerCount: 25,
    }, '2026-09-12');
    const disconnect = result.obligations.find((item) => item.id === 'disconnecting-policy');
    expect(disconnect?.operationalStatus).toBe('overdue');
    expect(disconnect?.daysPastDue).toBeGreaterThan(0);
    expect(result.overdueCount).toBeGreaterThanOrEqual(2);
  });

  it('decomposes 2026 recruiting compliance into individual controls', () => {
    expect(ONTARIO_RECRUITING_2026_CONTROLS.length).toBe(6);
    const result = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 25,
      ontarioEmployeesOnJan1: 25,
      jan1EmployeeCountReviewed: true,
      workplaceWorkerCount: 25,
      usesPublicJobPostings: true,
      usesAiInRecruiting: true,
    }, '2026-09-12');
    for (const id of [
      'job-posting-compensation',
      'job-posting-ai',
      'job-posting-vacancy',
      'job-posting-canadian-experience',
      'job-posting-interview-status',
      'job-posting-retention',
    ]) {
      expect(result.obligations.find((item) => item.id === id)?.applicability).toBe('required');
    }
  });

  it('does not require the AI disclosure sub-control when the profile says AI is not used', () => {
    const result = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 25,
      ontarioEmployeesOnJan1: 25,
      jan1EmployeeCountReviewed: true,
      workplaceWorkerCount: 25,
      usesPublicJobPostings: true,
      usesAiInRecruiting: false,
    }, '2026-09-12');
    expect(result.obligations.find((item) => item.id === 'job-posting-ai')?.applicability).toBe('not_applicable');
  });

  it('covers OHSA 1–5 / 6–19 / 20–49 / 50+ transitions', () => {
    const profile = {
      ...defaultOntarioComplianceProfile(),
      orgType: 'private' as const,
      ontarioEmployeeCount: 50,
      ontarioEmployeesOnJan1: 50,
      jan1EmployeeCountReviewed: true,
    };
    const five = assessOntarioComplianceReadiness({ ...profile, workplaceWorkerCount: 5 }, '2026-09-12');
    const ten = assessOntarioComplianceReadiness({ ...profile, workplaceWorkerCount: 10 }, '2026-09-12');
    const twentyFive = assessOntarioComplianceReadiness({ ...profile, workplaceWorkerCount: 25 }, '2026-09-12');
    const fifty = assessOntarioComplianceReadiness({ ...profile, workplaceWorkerCount: 50 }, '2026-09-12');

    expect(five.obligations.find((item) => item.id === 'ohsa-representation')?.applicability).toBe('not_applicable');
    expect(ten.obligations.find((item) => item.id === 'ohsa-representation')?.label).toContain('Representative');
    expect(twentyFive.obligations.find((item) => item.id === 'ohsa-representation')?.reason).toContain('at least 2');
    expect(fifty.obligations.find((item) => item.id === 'ohsa-representation')?.reason).toContain('at least 4');
  });

  it('raises evidence readiness without changing certification or live effect', () => {
    const base = {
      ...defaultOntarioComplianceProfile(),
      orgType: 'private' as const,
      ontarioEmployeeCount: 25,
      ontarioEmployeesOnJan1: 25,
      jan1EmployeeCountReviewed: true,
      workplaceWorkerCount: 25,
      usesPublicJobPostings: true,
      usesAiInRecruiting: true,
    };
    const before = assessOntarioComplianceReadiness(base, '2026-09-12');
    const after = assessOntarioComplianceReadiness({
      ...base,
      disconnectingPolicyRef: 'POL-001',
      electronicMonitoringPolicyRef: 'POL-002',
      jobPostingCompensationRef: 'REC-001',
      jobPostingAiDisclosureRef: 'REC-002',
      jobPostingVacancyRef: 'REC-003',
      jobPostingCanadianExperienceRef: 'REC-004',
      interviewStatusProcedureRef: 'REC-005',
      jobPostingRetentionRef: 'REC-006',
      hsrOrJhscRef: 'OHS-001',
      payEquityReviewRef: 'PE-001',
      specialRulesOrExemptionsReviewed: true,
      specialRulesReviewRef: 'ESA-001',
    }, '2026-09-12');

    expect(after.readinessPercent).toBeGreaterThan(before.readinessPercent);
    expect(after.certification).toBe('NOT_CERTIFIED');
    expect(after.liveEffect).toBe('NONE');
  });

  it('assigns operational owners and next actions', () => {
    const result = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 25,
      ontarioEmployeesOnJan1: 25,
      jan1EmployeeCountReviewed: true,
      workplaceWorkerCount: 25,
    }, '2026-09-12');
    const item = result.obligations.find((entry) => entry.id === 'ohsa-representation');
    expect(item?.owner).toBe('Health & Safety');
    expect(item?.nextAction.length).toBeGreaterThan(20);
  });

  it('keeps Country Compliance operationally isolated from Payroll', () => {
    const payroll = readFileSync('src/components/payroll-workspace.tsx', 'utf8');
    const ui = readFileSync('src/components/ontario-compliance-readiness.tsx', 'utf8');
    expect(payroll).not.toContain('OntarioComplianceReadiness');
    expect(payroll).not.toContain('SaudiPayrollGuardPanel');
    expect(ui).toContain('Priority remediation queue');
    expect(ui).toContain('2026 recruiting compliance controls');
    expect(ui).toContain('NOT CERTIFIED');
  });
});