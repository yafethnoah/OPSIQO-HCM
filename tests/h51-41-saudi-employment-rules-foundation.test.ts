import { describe, expect, it } from 'vitest';
import {
  SAUDI_EMPLOYMENT_RULE_SOURCES,
  previewSaudiEosb,
  previewSaudiWorkLeave,
  saudiEmploymentRulesPayload,
} from '@/lib/strategic/saudi-employment-rules';

describe('H51.41 Saudi employment rules foundation', () => {
  it('uses only official HRSD domains for employment-rule sources', () => {
    expect(SAUDI_EMPLOYMENT_RULE_SOURCES.length).toBeGreaterThanOrEqual(6);
    for (const source of SAUDI_EMPLOYMENT_RULE_SOURCES) {
      expect(new URL(source.url).hostname).toBe('www.hrsd.gov.sa');
    }
  });

  it('calculates Article 84 base EOSB deterministically', () => {
    const result = previewSaudiEosb({ lastMonthlyWageSar: 10000, serviceYears: 6, separationBasis: 'employer_or_contract_end' });
    expect(result.baseAwardSar).toBe(35000);
    expect(result.multiplier).toBe(1);
    expect(result.estimatedAwardSar).toBe(35000);
    expect(result.livePayrollEffect).toBe(false);
    expect(result.countryPackCertification).toBe('NOT_CERTIFIED');
  });

  it('applies resignation scaling without inferring exceptions', () => {
    expect(previewSaudiEosb({ lastMonthlyWageSar: 10000, serviceYears: 1.5, separationBasis: 'resignation' }).estimatedAwardSar).toBe(0);
    expect(previewSaudiEosb({ lastMonthlyWageSar: 10000, serviceYears: 3, separationBasis: 'resignation' }).multiplier).toBeCloseTo(1 / 3);
    expect(previewSaudiEosb({ lastMonthlyWageSar: 10000, serviceYears: 7, separationBasis: 'resignation' }).multiplier).toBeCloseTo(2 / 3);
    expect(previewSaudiEosb({ lastMonthlyWageSar: 10000, serviceYears: 10, separationBasis: 'resignation' }).multiplier).toBe(1);
  });

  it('blocks unresolved separation and possible Article 80 cases', () => {
    expect(previewSaudiEosb({ lastMonthlyWageSar: 10000, serviceYears: 6, separationBasis: 'requires_review' }).status).toBe('blocked');
    expect(previewSaudiEosb({ lastMonthlyWageSar: 10000, serviceYears: 6, separationBasis: 'article80_possible' }).status).toBe('blocked');
  });

  it('returns 21 days before five years and 30 days from five years', () => {
    expect(previewSaudiWorkLeave({ yearsOfService: 4.99, muslimRamadan: false, hourlyWageSar: 50, basicHourlyWageSar: 40, overtimeHours: 2 }).annualLeaveDays).toBe(21);
    expect(previewSaudiWorkLeave({ yearsOfService: 5, muslimRamadan: false, hourlyWageSar: 50, basicHourlyWageSar: 40, overtimeHours: 2 }).annualLeaveDays).toBe(30);
  });

  it('applies normal and Ramadan actual-hour limits', () => {
    const normal = previewSaudiWorkLeave({ yearsOfService: 5, muslimRamadan: false, hourlyWageSar: 50, basicHourlyWageSar: 40, overtimeHours: 2 });
    const ramadan = previewSaudiWorkLeave({ yearsOfService: 5, muslimRamadan: true, hourlyWageSar: 50, basicHourlyWageSar: 40, overtimeHours: 2 });
    expect([normal.maxActualHoursPerDay, normal.maxActualHoursPerWeek]).toEqual([8, 48]);
    expect([ramadan.maxActualHoursPerDay, ramadan.maxActualHoursPerWeek]).toEqual([6, 36]);
  });

  it('calculates overtime as hourly wage plus 50% of basic hourly wage', () => {
    const result = previewSaudiWorkLeave({ yearsOfService: 5, muslimRamadan: false, hourlyWageSar: 50, basicHourlyWageSar: 40, overtimeHours: 2 });
    expect(result.overtimePayPerHourSar).toBe(70);
    expect(result.overtimePayTotalSar).toBe(140);
  });

  it('registers maternity and sick-leave foundations but keeps country pack not certified', () => {
    const payload = saudiEmploymentRulesPayload();
    expect(payload.fixedLeaveRules.find((r) => r.label === 'Maternity')?.entitlement).toContain('12 weeks');
    expect(payload.fixedLeaveRules.find((r) => r.label === 'Sick leave')?.entitlement).toContain('30 days full pay');
    expect(payload.certification).toBe('NOT_CERTIFIED');
    expect(payload.livePayrollEffect).toBe(false);
  });
});