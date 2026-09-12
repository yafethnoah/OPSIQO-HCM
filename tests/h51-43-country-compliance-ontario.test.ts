import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ONTARIO_2026_PAYROLL_REFERENCE,
  ONTARIO_RULE_SOURCES,
  ontarioGeneralMinimumWage,
  ontarioTerminationNoticeWeeks,
  previewOntarioEmploymentStandards,
  previewOntarioSeparation,
} from '@/lib/country-compliance/ontario-rules';

describe('H51.43 country compliance separation + Ontario foundation', () => {
  it('keeps Saudi Payroll Guard out of generic Canadian Payroll', () => {
    const payroll = readFileSync('src/components/payroll-workspace.tsx', 'utf8');
    expect(payroll).not.toContain('SaudiPayrollGuardPanel');
    expect(payroll).not.toContain('Saudi Payroll Guard');
  });

  it('renders Saudi controls only from Country Compliance', () => {
    const workspace = readFileSync('src/components/country-compliance-workspace.tsx', 'utf8');
    expect(workspace).toContain('SaudiPayrollGuardPanel');
    expect(workspace).toContain('OntarioComplianceFoundation');
    expect(workspace).toContain('Generic Canadian Payroll');
  });

  it('moves the Saudi Guard API out of the generic payroll route namespace', () => {
    expect(existsSync('src/app/api/organizations/[orgId]/payroll/saudi-guard/route.ts')).toBe(false);
    expect(existsSync('src/app/api/organizations/[orgId]/country-compliance/saudi/payroll-guard/route.ts')).toBe(true);
    const panel = readFileSync('src/components/saudi-payroll-guard-panel.tsx', 'utf8');
    expect(panel).not.toContain('/payroll/saudi-guard');
    expect(panel).toContain('/country-compliance/saudi/payroll-guard');
  });

  it('registers Ontario sources only from official government/authority domains', () => {
    const allowed = new Set(['www.ontario.ca', 'www.canada.ca', 'www.wsib.ca', 'www3.ohrc.on.ca']);
    expect(ONTARIO_RULE_SOURCES.length).toBeGreaterThanOrEqual(20);
    for (const source of ONTARIO_RULE_SOURCES) {
      expect(allowed.has(new URL(source.url).hostname)).toBe(true);
    }
  });

  it('uses the current and announced Ontario minimum-wage schedule', () => {
    expect(ontarioGeneralMinimumWage('2026-09-12')?.rate).toBe(17.6);
    expect(ontarioGeneralMinimumWage('2026-10-01')?.rate).toBe(17.95);
  });

  it('previews Ontario overtime, vacation and public-holiday foundations deterministically', () => {
    const result = previewOntarioEmploymentStandards({
      effectiveDate: '2026-09-12',
      regularHourlyRate: 20,
      workWeekHours: 48,
      serviceYears: 4,
      vacationGrossWages: 50000,
      publicHolidayRegularWages4Weeks: 3200,
      publicHolidayVacationPay4Weeks: 128,
    });
    expect(result.status).toBe('ready_for_review');
    if (result.status !== 'ready_for_review') throw new Error('Unexpected blocked Ontario preview.');
    expect(result.overtimeHours).toBe(4);
    expect(result.overtimeRate).toBe(30);
    expect(result.overtimePay).toBe(120);
    expect(result.vacationWeeks).toBe(2);
    expect(result.vacationRate).toBe(0.04);
    expect(result.vacationPay).toBe(2000);
    expect(result.publicHolidayPay).toBe(166.4);
    expect(result.certification).toBe('NOT_CERTIFIED');
    expect(result.liveEffect).toBe('NONE');
  });

  it('switches vacation foundation at five years', () => {
    const result = previewOntarioEmploymentStandards({
      effectiveDate: '2026-09-12',
      regularHourlyRate: 25,
      workWeekHours: 40,
      serviceYears: 5,
      vacationGrossWages: 50000,
      publicHolidayRegularWages4Weeks: 4000,
      publicHolidayVacationPay4Weeks: 240,
    });
    if (result.status !== 'ready_for_review') throw new Error('Unexpected blocked Ontario preview.');
    expect(result.vacationWeeks).toBe(3);
    expect(result.vacationRate).toBe(0.06);
    expect(result.vacationPay).toBe(3000);
  });

  it('models the ESA individual termination-notice schedule without claiming common-law notice', () => {
    expect(ontarioTerminationNoticeWeeks(0.2)).toBe(0);
    expect(ontarioTerminationNoticeWeeks(0.5)).toBe(1);
    expect(ontarioTerminationNoticeWeeks(2)).toBe(2);
    expect(ontarioTerminationNoticeWeeks(6.5)).toBe(6);
    expect(ontarioTerminationNoticeWeeks(12)).toBe(8);
  });

  it('requires human review for ESA severance eligibility', () => {
    const unresolved = previewOntarioSeparation({
      serviceYears: 6,
      regularWeeklyWage: 1200,
      severanceEligibilityReviewed: false,
      severanceQualifies: false,
    });
    expect(unresolved.severanceStatus).toBe('requires_review');
    expect(unresolved.noticeWeeks).toBe(6);

    const qualified = previewOntarioSeparation({
      serviceYears: 6,
      regularWeeklyWage: 1200,
      severanceEligibilityReviewed: true,
      severanceQualifies: true,
    });
    expect(qualified.severanceStatus).toBe('ready_for_review');
    expect(qualified.severanceWeeks).toBe(6);
    expect(qualified.severancePay).toBe(7200);
    expect(qualified.liveEffect).toBe('NONE');
  });

  it('registers the official 2026 CRA CPP/CPP2/EI reference without moving execution out of Payroll', () => {
    expect(ONTARIO_2026_PAYROLL_REFERENCE.cpp.ympe).toBe(74600);
    expect(ONTARIO_2026_PAYROLL_REFERENCE.cpp.yampe).toBe(85000);
    expect(ONTARIO_2026_PAYROLL_REFERENCE.cpp.combinedBaseAndFirstAdditionalRate).toBe(0.0595);
    expect(ONTARIO_2026_PAYROLL_REFERENCE.ei.employeeRate).toBe(0.0163);
    expect(ONTARIO_2026_PAYROLL_REFERENCE.ei.employerRate).toBe(0.02282);
  });
});