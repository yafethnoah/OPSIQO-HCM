import { describe, expect, it } from 'vitest';
import {
  SAUDI_NEW_SYSTEM_PENSION_SCHEDULE,
  SAUDI_OFFICIAL_SOURCES,
  newSystemPensionRatesForDate,
  previewSaudiContributions,
  saudiFoundationPayload,
} from '@/lib/strategic/saudi-country-pack';
import { baselineFivePhaseAssessment } from '@/lib/strategic/five-phase-core';

describe('H51.40 Saudi country-pack foundation', () => {
  it('registers only official HRSD/GOSI source domains', () => {
    expect(SAUDI_OFFICIAL_SOURCES.length).toBeGreaterThanOrEqual(6);
    for (const source of SAUDI_OFFICIAL_SOURCES) {
      const host = new URL(source.url).hostname;
      expect(
        host === 'www.hrsd.gov.sa' ||
        host === 'www.gosi.gov.sa' ||
        host === 'awareness.gosi.gov.sa'
      ).toBe(true);
      expect(source.evidenceState).toBe('official_source_registered');
    }
  });

  it('registers labor-law amendments and wage-protection provenance without certifying them', () => {
    expect(SAUDI_OFFICIAL_SOURCES.find((source) => source.id === 'HRSD-LABOR-AMENDMENTS-2025')?.effectiveDate).toBe('2025-02-19');
    expect(SAUDI_OFFICIAL_SOURCES.some((source) => source.topic === 'wage_protection')).toBe(true);
    expect(saudiFoundationPayload().certification).toBe('NOT_CERTIFIED');
    expect(saudiFoundationPayload().livePayrollEffect).toBe(false);
  });

  it('models the official phased new-system pension schedule deterministically', () => {
    expect(SAUDI_NEW_SYSTEM_PENSION_SCHEDULE).toHaveLength(5);
    expect(newSystemPensionRatesForDate('2024-08-01')).toEqual(expect.objectContaining({ employeeRate: 0.09, employerRate: 0.09 }));
    expect(newSystemPensionRatesForDate('2025-08-01')).toEqual(expect.objectContaining({ employeeRate: 0.095, employerRate: 0.095 }));
    expect(newSystemPensionRatesForDate('2026-09-11')).toEqual(expect.objectContaining({ employeeRate: 0.10, employerRate: 0.10 }));
    expect(newSystemPensionRatesForDate('2027-09-11')).toEqual(expect.objectContaining({ employeeRate: 0.105, employerRate: 0.105 }));
    expect(newSystemPensionRatesForDate('2028-09-11')).toEqual(expect.objectContaining({ employeeRate: 0.11, employerRate: 0.11 }));
  });

  it('blocks calculation until nationality, regime and SANED applicability are human confirmed', () => {
    const result = previewSaudiContributions({
      saudiNationalConfirmed: false,
      regime: 'requires_review',
      contributionDate: '2026-09-11',
      contributoryWageSar: 10000,
      sanedApplicable: 'requires_review',
    });
    expect(result.status).toBe('blocked');
    expect(result.livePayrollEffect).toBe(false);
    expect(result.blockers.length).toBeGreaterThanOrEqual(3);
  });

  it('previews 2026 new-system Saudi contributions without writing payroll', () => {
    const result = previewSaudiContributions({
      saudiNationalConfirmed: true,
      regime: 'new_1445_no_prior_subscription',
      contributionDate: '2026-09-11',
      contributoryWageSar: 10000,
      sanedApplicable: 'yes',
    });
    expect(result.status).toBe('ready_for_review');
    expect(result.rates).toEqual({
      employeePension: 0.10,
      employerPension: 0.10,
      employerOccupationalHazards: 0.02,
      employeeSaned: 0.0075,
      employerSaned: 0.0075,
    });
    expect(result.amounts).toEqual(expect.objectContaining({
      employeePensionSar: 1000,
      employerPensionSar: 1000,
      employerOccupationalHazardsSar: 200,
      employeeSanedSar: 75,
      employerSanedSar: 75,
      employeeTotalSar: 1075,
      employerTotalSar: 1275,
      combinedTotalSar: 2350,
    }));
    expect(result.simulationOnly).toBe(true);
    expect(result.livePayrollEffect).toBe(false);
    expect(result.countryPackCertification).toBe('NOT_CERTIFIED');
  });

  it('uses registered unchanged rates only when that regime is explicitly selected', () => {
    const result = previewSaudiContributions({
      saudiNationalConfirmed: true,
      regime: 'existing_unaffected',
      contributionDate: '2026-09-11',
      contributoryWageSar: 10000,
      sanedApplicable: 'yes',
    });
    expect(result.rates?.employeePension).toBe(0.09);
    expect(result.rates?.employerPension).toBe(0.09);
    expect(result.sourceIds).toContain('GOSI-EXISTING-UNAFFECTED');
  });

  it('caps the simulation wage at SAR 45,000 and discloses the cap', () => {
    const result = previewSaudiContributions({
      saudiNationalConfirmed: true,
      regime: 'new_1445_no_prior_subscription',
      contributionDate: '2026-09-11',
      contributoryWageSar: 60000,
      sanedApplicable: 'yes',
    });
    expect(result.contributoryWageUsedSar).toBe(45000);
    expect(result.warnings.some((warning) => warning.includes('SAR 45,000'))).toBe(true);
  });

  it('moves Saudi capability only to partial, never implemented or certified', () => {
    const ksa = baselineFivePhaseAssessment()
      .find((phase) => phase.id === 2)!
      .checklist.find((item) => item.id === 'ksa')!;
    expect(ksa.state).toBe('partial');
    expect(ksa.evidence).toContain('NOT CERTIFIED');
  });
});