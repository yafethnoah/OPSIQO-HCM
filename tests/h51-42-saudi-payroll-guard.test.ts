import { describe, expect, it } from 'vitest';
import {
  SAUDI_GOLDEN_PAYROLL_CASES,
  SAUDI_PAYROLL_GUARD_SOURCES,
  SAUDI_PAYROLL_RELEASE_POLICY,
  assessSaudiWorkerPayrollGuard,
  saudiPayrollEvidenceIssues,
  validateSaudiGoldenCases,
} from '@/lib/payroll/saudi-payroll-guard';

describe('H51.42 Saudi Payroll Guard', () => {
  it('uses official HRSD sources for WPS and wage-control provenance', () => {
    expect(SAUDI_PAYROLL_GUARD_SOURCES.length).toBeGreaterThanOrEqual(4);
    for (const source of SAUDI_PAYROLL_GUARD_SOURCES) {
      expect(new URL(source.url).hostname).toBe('www.hrsd.gov.sa');
      expect(source.authority).toBe('HRSD');
    }
  });

  it('requires all six production-readiness evidence gates', () => {
    const issues = saudiPayrollEvidenceIssues({ id: 'current' });
    expect(issues).toHaveLength(6);
    expect(issues.join(' ')).toContain('golden-payroll');
    expect(issues.join(' ')).toContain('Arabic/RTL');
    expect(issues.join(' ')).toContain('WPS');
  });

  it('never enables AI payroll release or government submission in H51.42', () => {
    expect(SAUDI_PAYROLL_RELEASE_POLICY.actionClass).toBe('red');
    expect(SAUDI_PAYROLL_RELEASE_POLICY.aiReleaseAllowed).toBe(false);
    expect(SAUDI_PAYROLL_RELEASE_POLICY.productionReleaseEnabled).toBe(false);
    expect(SAUDI_PAYROLL_RELEASE_POLICY.governmentSubmissionEnabled).toBe(false);
  });

  it('keeps the worker blocked until a human Saudi review exists', () => {
    const result = assessSaudiWorkerPayrollGuard({
      workerId: 'w1',
      displayName: 'Worker 1',
      compensation: { id: 'c1', currency: 'SAR', monthlyPay: 10000 },
      profile: { enabled: true, payPeriodsPerYear: 12, payDateRule: 'run_default' },
    });
    expect(result.workerInputsReady).toBe(false);
    expect(result.blockers).toContain('Saudi worker payroll review has not been completed.');
    expect(result.productionReady).toBe(false);
    expect(result.releaseAllowed).toBe(false);
  });

  it('accepts reviewed Saudi inputs for validation but still blocks production release', () => {
    const result = assessSaudiWorkerPayrollGuard({
      workerId: 'w1',
      displayName: 'Worker 1',
      compensation: { id: 'c1', currency: 'SAR', monthlyPay: 10000 },
      profile: { enabled: true, payPeriodsPerYear: 12, payDateRule: 'run_default' },
      review: {
        workerId: 'w1',
        saudiNationalConfirmed: true,
        regime: 'new_1445_no_prior_subscription',
        sanedApplicable: 'yes',
        contributoryWageSar: 10000,
        reviewedBy: 'u1',
        reviewedAt: '2026-09-12T00:00:00.000Z',
      },
    });
    expect(result.workerInputsReady).toBe(true);
    expect(result.contributionPreview?.status).toBe('ready_for_review');
    expect(result.productionReady).toBe(false);
    expect(result.releaseAllowed).toBe(false);
    expect(result.governmentSubmissionAllowed).toBe(false);
  });

  it('blocks non-SAR compensation context for Saudi payroll guard', () => {
    const result = assessSaudiWorkerPayrollGuard({
      workerId: 'w1',
      displayName: 'Worker 1',
      compensation: { id: 'c1', currency: 'CAD', monthlyPay: 10000 },
      profile: { enabled: true, payPeriodsPerYear: 12 },
      review: {
        workerId: 'w1',
        saudiNationalConfirmed: true,
        regime: 'existing_unaffected',
        sanedApplicable: 'yes',
        contributoryWageSar: 10000,
        reviewedBy: 'u1',
        reviewedAt: '2026-09-12T00:00:00.000Z',
      },
    });
    expect(result.workerInputsReady).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes('SAR compensation'))).toBe(true);
  });

  it('runs all deterministic golden foundation cases but leaves them unapproved', () => {
    expect(SAUDI_GOLDEN_PAYROLL_CASES).toHaveLength(3);
    const results = validateSaudiGoldenCases();
    expect(results.every((result) => result.pass)).toBe(true);
    expect(results.every((result) => result.approvalState === 'FOUNDATION_UNAPPROVED')).toBe(true);
  });

  it('preserves the validated SAR 45,000 cap golden case', () => {
    const cap = validateSaudiGoldenCases().find((result) => result.id === 'SA-GOLDEN-NEW-2026-CAP');
    expect(cap?.actual).toEqual({
      wageUsedSar: 45000,
      employeeTotalSar: 4837.5,
      employerTotalSar: 5737.5,
      combinedTotalSar: 10575,
    });
  });
});