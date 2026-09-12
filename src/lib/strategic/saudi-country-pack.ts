export type SaudiSocialInsuranceRegime =
  | 'new_1445_no_prior_subscription'
  | 'existing_unaffected'
  | 'requires_review';

export type SaudiSanedApplicability = 'yes' | 'no' | 'requires_review';

export interface SaudiOfficialSource {
  id: string;
  authority: 'HRSD' | 'GOSI';
  title: string;
  url: string;
  topic: 'labor_law' | 'executive_regulations' | 'social_insurance' | 'saned' | 'wage_protection';
  effectiveDate?: string;
  observedAt: string;
  evidenceState: 'official_source_registered';
  note: string;
}

export interface SaudiContributionPreviewInput {
  saudiNationalConfirmed: boolean;
  regime: SaudiSocialInsuranceRegime;
  contributionDate: string;
  contributoryWageSar: number;
  sanedApplicable: SaudiSanedApplicability;
}

export interface SaudiContributionPreview {
  status: 'ready_for_review' | 'blocked';
  simulationOnly: true;
  livePayrollEffect: false;
  countryPackCertification: 'NOT_CERTIFIED';
  contributoryWageInputSar: number;
  contributoryWageUsedSar?: number;
  rates?: {
    employeePension: number;
    employerPension: number;
    employerOccupationalHazards: number;
    employeeSaned: number;
    employerSaned: number;
  };
  amounts?: {
    employeePensionSar: number;
    employerPensionSar: number;
    employerOccupationalHazardsSar: number;
    employeeSanedSar: number;
    employerSanedSar: number;
    employeeTotalSar: number;
    employerTotalSar: number;
    combinedTotalSar: number;
  };
  blockers: string[];
  warnings: string[];
  sourceIds: string[];
}

export interface SaudiPensionScheduleRow {
  from: string;
  to?: string;
  employeeRate: number;
  employerRate: number;
  sourceId: string;
}

export const SAUDI_OFFICIAL_SOURCES: readonly SaudiOfficialSource[] = [
  {
    id: 'HRSD-LABOR-AMENDMENTS-2025',
    authority: 'HRSD',
    title: 'Saudi Labor Law amendments effective 19 February 2025',
    url: 'https://www.hrsd.gov.sa/en/media-center/news/%D9%88%D8%B2%D8%A7%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D9%88%D8%A7%D8%B1%D8%AF-%D8%A7%D9%84%D8%A8%D8%B4%D8%B1%D9%8A%D8%A9-%D9%88%D8%A7%D9%84%D8%AA%D9%86%D9%85%D9%8A%D8%A9-%D8%A7%D9%84%D8%A7%D8%AC%D8%AA%D9%85%D8%A7%D8%B9%D9%8A%D8%A9-%D8%AA%D8%B9%D9%84%D9%86-%D8%B9%D9%86-%D8%A8%D8%AF%D8%A1-%D8%B3%D8%B1%D9%8A%D8%A7%D9%86-%D8%AA%D8%B9%D8%AF%D9%8A%D9%84%D8%A7%D8%AA-%D9%86%D8%B8%D8%A7%D9%85-%D8%A7%D9%84%D8%B9%D9%85%D9%84',
    topic: 'labor_law',
    effectiveDate: '2025-02-19',
    observedAt: '2026-09-11',
    evidenceState: 'official_source_registered',
    note: 'Registers the official effective date and amendment provenance only. OPSIQO does not infer legal conclusions from this source.',
  },
  {
    id: 'HRSD-EXEC-REGULATIONS-2025',
    authority: 'HRSD',
    title: 'Executive Regulations and attachments effective 19 February 2025',
    url: 'https://www.hrsd.gov.sa/en/media-center/news/%D9%88%D8%B2%D8%A7%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D9%88%D8%A7%D8%B1%D8%AF-%D8%A7%D9%84%D8%A8%D8%B4%D8%B1%D9%8A%D8%A9-%D9%88%D8%A7%D9%84%D8%AA%D9%86%D9%85%D9%8A%D8%A9-%D8%A7%D9%84%D8%A7%D8%AC%D8%AA%D9%85%D8%A7%D8%B9%D9%8A%D8%A9-%D8%AA%D9%8F%D8%B9%D9%84%D9%86-%D8%B9%D9%86-%D9%86%D8%B4%D8%B1-%D8%A7%D9%84%D9%84%D8%A7%D8%A6%D8%AD%D8%A9-%D8%A7%D9%84%D8%AA%D9%86%D9%81%D9%8A%D8%B0%D9%8A%D8%A9-%D9%84%D8%AA%D8%B9%D8%AF%D9%8A%D9%84%D8%A7%D8%AA-%D9%86%D8%B8%D8%A7%D9%85-%D8%A7%D9%84%D8%B9%D9%85%D9%84',
    topic: 'executive_regulations',
    effectiveDate: '2025-02-19',
    observedAt: '2026-09-11',
    evidenceState: 'official_source_registered',
    note: 'Official executive-regulation provenance. Independent legal review remains required before country-pack activation.',
  },
  {
    id: 'GOSI-NEW-SYSTEM-1445',
    authority: 'GOSI',
    title: 'New Social Insurance System 1445H — employer awareness journey',
    url: 'https://awareness.gosi.gov.sa/businessJourney.html',
    topic: 'social_insurance',
    effectiveDate: '2024-07-03',
    observedAt: '2026-09-11',
    evidenceState: 'official_source_registered',
    note: 'Official GOSI awareness source for new entrants with no prior pension/social-insurance subscription before 3 July 2024, including phased pension contribution rates.',
  },
  {
    id: 'GOSI-EXISTING-UNAFFECTED',
    authority: 'GOSI',
    title: 'Existing categories not covered by the new-system amendments',
    url: 'https://awareness.gosi.gov.sa/journey1.html',
    topic: 'social_insurance',
    observedAt: '2026-09-11',
    evidenceState: 'official_source_registered',
    note: 'Official GOSI awareness source stating unchanged contribution rates for the specified unaffected categories.',
  },
  {
    id: 'GOSI-SANED',
    authority: 'GOSI',
    title: 'SANED unemployment insurance FAQ',
    url: 'https://www.gosi.gov.sa/GOSIOnline/%28en_US%29__FAQ_Unemployment_Insurance_%28SANED%29?locale=en_US',
    topic: 'saned',
    observedAt: '2026-09-11',
    evidenceState: 'official_source_registered',
    note: 'Official GOSI source states 1.5% total SANED contribution, 0.75% employer and 0.75% contributor, for applicable contributors.',
  },
  {
    id: 'HRSD-WPS',
    authority: 'HRSD',
    title: 'Wage Protection System overview',
    url: 'https://www.hrsd.gov.sa/en/care-about-you/social-protection',
    topic: 'wage_protection',
    observedAt: '2026-09-11',
    evidenceState: 'official_source_registered',
    note: 'Official HRSD source describes WPS coverage and wage-payment frequency concepts. This H51.40 release does not generate or submit WPS files.',
  },
] as const;

export const SAUDI_NEW_SYSTEM_PENSION_SCHEDULE: readonly SaudiPensionScheduleRow[] = [
  { from: '2024-07-03', to: '2025-07-02', employeeRate: 0.09, employerRate: 0.09, sourceId: 'GOSI-NEW-SYSTEM-1445' },
  { from: '2025-07-03', to: '2026-07-02', employeeRate: 0.095, employerRate: 0.095, sourceId: 'GOSI-NEW-SYSTEM-1445' },
  { from: '2026-07-03', to: '2027-07-02', employeeRate: 0.10, employerRate: 0.10, sourceId: 'GOSI-NEW-SYSTEM-1445' },
  { from: '2027-07-03', to: '2028-07-02', employeeRate: 0.105, employerRate: 0.105, sourceId: 'GOSI-NEW-SYSTEM-1445' },
  { from: '2028-07-03', employeeRate: 0.11, employerRate: 0.11, sourceId: 'GOSI-NEW-SYSTEM-1445' },
] as const;

const MAX_CONTRIBUTORY_WAGE_SAR = 45_000;
const OCCUPATIONAL_HAZARDS_EMPLOYER_RATE = 0.02;
const SANED_EMPLOYEE_RATE = 0.0075;
const SANED_EMPLOYER_RATE = 0.0075;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dateValue(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function newSystemPensionRatesForDate(date: string): {
  employeeRate: number;
  employerRate: number;
  sourceId: string;
} | null {
  const target = dateValue(date);
  if (target === null) return null;

  for (const row of SAUDI_NEW_SYSTEM_PENSION_SCHEDULE) {
    const from = dateValue(row.from)!;
    const to = row.to ? dateValue(row.to)! : Number.POSITIVE_INFINITY;
    if (target >= from && target <= to) {
      return { employeeRate: row.employeeRate, employerRate: row.employerRate, sourceId: row.sourceId };
    }
  }
  return null;
}

export function previewSaudiContributions(input: SaudiContributionPreviewInput): SaudiContributionPreview {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const sourceIds = new Set<string>(['GOSI-SANED']);

  if (!input.saudiNationalConfirmed) {
    blockers.push('This foundation calculator is limited to a human-confirmed Saudi-national applicability case.');
  }
  if (input.regime === 'requires_review') {
    blockers.push('A qualified human must determine the applicable GOSI regime; OPSIQO will not infer it from hire date alone.');
  }
  if (input.sanedApplicable === 'requires_review') {
    blockers.push('SANED applicability requires human review before contribution amounts can be previewed.');
  }
  const date = dateValue(input.contributionDate);
  if (date === null) blockers.push('Contribution date must be a valid YYYY-MM-DD date.');
  if (!Number.isFinite(input.contributoryWageSar) || input.contributoryWageSar <= 0) {
    blockers.push('Contributory wage must be greater than zero.');
  }

  if (blockers.length) {
    return {
      status: 'blocked',
      simulationOnly: true,
      livePayrollEffect: false,
      countryPackCertification: 'NOT_CERTIFIED',
      contributoryWageInputSar: input.contributoryWageSar,
      blockers,
      warnings,
      sourceIds: [...sourceIds],
    };
  }

  let employeePension = 0;
  let employerPension = 0;

  if (input.regime === 'new_1445_no_prior_subscription') {
    const rates = newSystemPensionRatesForDate(input.contributionDate);
    if (!rates) {
      return {
        status: 'blocked',
        simulationOnly: true,
        livePayrollEffect: false,
        countryPackCertification: 'NOT_CERTIFIED',
        contributoryWageInputSar: input.contributoryWageSar,
        blockers: ['The selected contribution date is outside the registered H51.40 new-system schedule.'],
        warnings,
        sourceIds: ['GOSI-NEW-SYSTEM-1445'],
      };
    }
    employeePension = rates.employeeRate;
    employerPension = rates.employerRate;
    sourceIds.add(rates.sourceId);
  } else {
    employeePension = 0.09;
    employerPension = 0.09;
    sourceIds.add('GOSI-EXISTING-UNAFFECTED');
  }

  const contributoryWageUsedSar = Math.min(input.contributoryWageSar, MAX_CONTRIBUTORY_WAGE_SAR);
  if (input.contributoryWageSar > MAX_CONTRIBUTORY_WAGE_SAR) {
    warnings.push('Preview capped contributory wage at SAR 45,000 using the registered official GOSI source. Independent payroll validation remains required.');
  }

  const employeeSaned = input.sanedApplicable === 'yes' ? SANED_EMPLOYEE_RATE : 0;
  const employerSaned = input.sanedApplicable === 'yes' ? SANED_EMPLOYER_RATE : 0;

  const employeePensionSar = round2(contributoryWageUsedSar * employeePension);
  const employerPensionSar = round2(contributoryWageUsedSar * employerPension);
  const employerOccupationalHazardsSar = round2(contributoryWageUsedSar * OCCUPATIONAL_HAZARDS_EMPLOYER_RATE);
  const employeeSanedSar = round2(contributoryWageUsedSar * employeeSaned);
  const employerSanedSar = round2(contributoryWageUsedSar * employerSaned);
  const employeeTotalSar = round2(employeePensionSar + employeeSanedSar);
  const employerTotalSar = round2(employerPensionSar + employerOccupationalHazardsSar + employerSanedSar);

  warnings.push('Foundation simulation only. No deduction, payroll record, government filing or compliance certification is created.');
  warnings.push('Regime and SANED applicability must be confirmed by an authorized qualified human before any production payroll implementation.');

  return {
    status: 'ready_for_review',
    simulationOnly: true,
    livePayrollEffect: false,
    countryPackCertification: 'NOT_CERTIFIED',
    contributoryWageInputSar: input.contributoryWageSar,
    contributoryWageUsedSar,
    rates: {
      employeePension,
      employerPension,
      employerOccupationalHazards: OCCUPATIONAL_HAZARDS_EMPLOYER_RATE,
      employeeSaned,
      employerSaned,
    },
    amounts: {
      employeePensionSar,
      employerPensionSar,
      employerOccupationalHazardsSar,
      employeeSanedSar,
      employerSanedSar,
      employeeTotalSar,
      employerTotalSar,
      combinedTotalSar: round2(employeeTotalSar + employerTotalSar),
    },
    blockers: [],
    warnings,
    sourceIds: [...sourceIds],
  };
}

export function saudiFoundationPayload() {
  return {
    certification: 'NOT_CERTIFIED' as const,
    foundationVersion: '0.1.0',
    simulationOnly: true as const,
    livePayrollEffect: false as const,
    officialSources: SAUDI_OFFICIAL_SOURCES,
    newSystemPensionSchedule: SAUDI_NEW_SYSTEM_PENSION_SCHEDULE,
    releaseBlockers: [
      'Independent Saudi legal/compliance review is not yet attached.',
      'Independent payroll validation is not yet attached.',
      'Approved golden payroll test evidence is not yet attached.',
      'Arabic/RTL critical-flow QA evidence is not yet attached.',
      'Official government connector certification is not yet attached.',
      'H51.41 now adds read-only EOSB, leave, working-time and overtime foundations; independent legal validation and live workflow integration remain required.',
    ],
  };
}