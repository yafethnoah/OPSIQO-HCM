import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ONTARIO_CHANGE_CALENDAR,
  ONTARIO_EHT_FOUNDATION,
  ONTARIO_HOURS_REST_FOUNDATION,
  ONTARIO_INTELLIGENCE_SOURCES,
  ONTARIO_LEAVE_CATALOGUE,
  ONTARIO_MINIMUM_WAGE_SCHEDULE,
  ONTARIO_RECRUITING_2026_FOUNDATION,
  assessOntarioComplianceReadiness,
  defaultOntarioComplianceProfile,
} from '@/lib/country-compliance/ontario-readiness';

describe('H51.44 Ontario compliance intelligence', () => {
  it('uses only official Ontario/WSIB/CRA/OHRC source domains', () => {
    const allowed = new Set(['www.ontario.ca', 'www.wsib.ca', 'www.canada.ca', 'www3.ohrc.on.ca']);
    expect(ONTARIO_INTELLIGENCE_SOURCES.length).toBeGreaterThanOrEqual(10);
    for (const source of ONTARIO_INTELLIGENCE_SOURCES) {
      expect(allowed.has(new URL(source.url).hostname)).toBe(true);
      expect(source.observedAt).toBe('2026-09-12');
    }
  });

  it('registers the current and announced Ontario minimum-wage schedule', () => {
    expect(ONTARIO_MINIMUM_WAGE_SCHEDULE.currentThrough20260930.generalHourly).toBe(17.6);
    expect(ONTARIO_MINIMUM_WAGE_SCHEDULE.currentThrough20260930.studentHourly).toBe(16.6);
    expect(ONTARIO_MINIMUM_WAGE_SCHEDULE.effective20261001Through20270930.generalHourly).toBe(17.95);
    expect(ONTARIO_MINIMUM_WAGE_SCHEDULE.effective20261001Through20270930.studentHourly).toBe(16.9);
  });

  it('adds the full general hours/rest foundation', () => {
    expect(ONTARIO_HOURS_REST_FOUNDATION.consecutiveDailyRestHours).toBe(11);
    expect(ONTARIO_HOURS_REST_FOUNDATION.betweenShiftRestHours).toBe(8);
    expect(ONTARIO_HOURS_REST_FOUNDATION.weeklyRestHours).toBe(24);
    expect(ONTARIO_HOURS_REST_FOUNDATION.biweeklyRestHours).toBe(48);
    expect(ONTARIO_HOURS_REST_FOUNDATION.overtimeThresholdHours).toBe(44);
  });

  it('registers 2026 job-posting controls including 45-day notice and 3-year records', () => {
    expect(ONTARIO_RECRUITING_2026_FOUNDATION.employerThreshold).toBe(25);
    expect(ONTARIO_RECRUITING_2026_FOUNDATION.interviewDecisionStatusDeadlineDays).toBe(45);
    expect(ONTARIO_RECRUITING_2026_FOUNDATION.postingRetentionYears).toBe(3);
    expect(ONTARIO_RECRUITING_2026_FOUNDATION.aiUseDisclosureRequired).toBe(true);
    expect(ONTARIO_RECRUITING_2026_FOUNDATION.canadianExperienceRequirementProhibited).toBe(true);
  });

  it('registers a broad statutory leave catalogue without creating live leave effects', () => {
    expect(ONTARIO_LEAVE_CATALOGUE.length).toBeGreaterThanOrEqual(18);
    expect(ONTARIO_LEAVE_CATALOGUE.every((leave) => leave.liveEffect === 'NONE')).toBe(true);
    expect(ONTARIO_LEAVE_CATALOGUE.find((leave) => leave.id === 'family_medical')?.foundationEntitlement).toContain('28 weeks');
    expect(ONTARIO_LEAVE_CATALOGUE.find((leave) => leave.id === 'critical_illness_minor')?.foundationEntitlement).toContain('37 weeks');
    expect(ONTARIO_LEAVE_CATALOGUE.find((leave) => leave.id === 'domestic_sexual_violence')?.paidFoundation).toContain('First 5');
  });

  it('triggers 25+ employee policy and public job-posting obligations', () => {
    const profile = {
      ...defaultOntarioComplianceProfile(),
      orgType: 'private' as const,
      ontarioEmployeeCount: 25,
      ontarioEmployeesOnJan1: 25,
      jan1EmployeeCountReviewed: true,
      workplaceWorkerCount: 12,
      usesPublicJobPostings: true,
    };
    const result = assessOntarioComplianceReadiness(profile);
    expect(result.obligations.find((item) => item.id === 'disconnecting-policy')?.applicability).toBe('required');
    expect(result.obligations.find((item) => item.id === 'electronic-monitoring-policy')?.applicability).toBe('required');
    for (const id of [
      'job-posting-compensation',
      'job-posting-vacancy',
      'job-posting-canadian-experience',
      'job-posting-interview-status',
      'job-posting-retention',
    ]) {
      expect(result.obligations.find((item) => item.id === id)?.applicability).toBe('required');
    }
    expect(result.obligations.find((item) => item.id === 'job-posting-ai')?.applicability).toBe('not_applicable');
    expect(result.certification).toBe('NOT_CERTIFIED');
    expect(result.liveEffect).toBe('NONE');
  });

  it('models AODA reporting at 20+ and multi-year planning at 50+', () => {
    const twenty = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 20,
      workplaceWorkerCount: 10,
    });
    expect(twenty.obligations.find((item) => item.id === 'aoda-report')?.applicability).toBe('required');
    expect(twenty.obligations.find((item) => item.id === 'aoda-plan')?.applicability).toBe('not_applicable');

    const fifty = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 50,
      workplaceWorkerCount: 50,
    });
    expect(fifty.obligations.find((item) => item.id === 'aoda-plan')?.applicability).toBe('required');
  });

  it('models OHSA HSR and JHSC thresholds', () => {
    const hsr = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 10,
      workplaceWorkerCount: 10,
    });
    expect(hsr.obligations.find((item) => item.id === 'ohsa-representation')?.label).toContain('Representative');

    const jhsc = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 25,
      workplaceWorkerCount: 25,
    });
    expect(jhsc.obligations.find((item) => item.id === 'ohsa-representation')?.label).toContain('Committee');
  });

  it('models the general Pay Equity Act employer-size/type foundation', () => {
    const nine = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 9,
      workplaceWorkerCount: 9,
    });
    expect(nine.obligations.find((item) => item.id === 'pay-equity')?.applicability).toBe('not_applicable');

    const ten = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 10,
      workplaceWorkerCount: 10,
    });
    expect(ten.obligations.find((item) => item.id === 'pay-equity')?.applicability).toBe('required');
  });

  it('registers EHT current exemption and threshold but keeps applicability human-reviewed', () => {
    expect(ONTARIO_EHT_FOUNDATION.exemptionCad).toBe(1_000_000);
    expect(ONTARIO_EHT_FOUNDATION.exemptionThresholdCad).toBe(5_000_000);
    const result = assessOntarioComplianceReadiness({
      ...defaultOntarioComplianceProfile(),
      orgType: 'private',
      ontarioEmployeeCount: 30,
      workplaceWorkerCount: 30,
      annualOntarioPayrollCad: 1_800_000,
      associatedGroupOntarioPayrollCad: 1_800_000,
    });
    expect(result.obligations.find((item) => item.id === 'eht')?.applicability).toBe('review_required');
  });

  it('publishes the minimum-wage and AODA 2026 change calendar', () => {
    expect(ONTARIO_CHANGE_CALENDAR.some((item) => item.effectiveDate === '2026-10-01')).toBe(true);
    expect(ONTARIO_CHANGE_CALENDAR.some((item) => item.effectiveDate === '2026-12-31')).toBe(true);
  });

  it('keeps Country Compliance separate from operational Payroll', () => {
    const country = readFileSync('src/components/country-compliance-workspace.tsx', 'utf8');
    const payroll = readFileSync('src/components/payroll-workspace.tsx', 'utf8');
    expect(country).toContain('OntarioComplianceReadiness');
    expect(country).toContain('Generic Canadian Payroll');
    expect(payroll).not.toContain('SaudiPayrollGuardPanel');
    expect(payroll).not.toContain('OntarioComplianceReadiness');
  });
});