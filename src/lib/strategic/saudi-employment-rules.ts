export type SaudiSeparationBasis =
  | 'employer_or_contract_end'
  | 'resignation'
  | 'force_majeure'
  | 'female_article87_exception'
  | 'article80_possible'
  | 'requires_review';

export interface SaudiEmploymentRuleSource {
  id: string;
  title: string;
  url: string;
  observedAt: string;
  articles: string[];
  note: string;
}

export interface SaudiEosbPreviewInput {
  lastMonthlyWageSar: number;
  serviceYears: number;
  separationBasis: SaudiSeparationBasis;
}

export interface SaudiEosbPreview {
  status: 'ready_for_review' | 'blocked';
  simulationOnly: true;
  livePayrollEffect: false;
  countryPackCertification: 'NOT_CERTIFIED';
  baseAwardSar?: number;
  multiplier?: number;
  estimatedAwardSar?: number;
  blockers: string[];
  warnings: string[];
  sourceIds: string[];
}

export interface SaudiWorkLeavePreviewInput {
  yearsOfService: number;
  muslimRamadan: boolean;
  hourlyWageSar: number;
  basicHourlyWageSar: number;
  overtimeHours: number;
}

export interface SaudiWorkLeavePreview {
  status: 'ready_for_review' | 'blocked';
  simulationOnly: true;
  livePayrollEffect: false;
  countryPackCertification: 'NOT_CERTIFIED';
  annualLeaveDays?: number;
  maxActualHoursPerDay?: number;
  maxActualHoursPerWeek?: number;
  overtimePayPerHourSar?: number;
  overtimePayTotalSar?: number;
  blockers: string[];
  warnings: string[];
  sourceIds: string[];
}

export const SAUDI_EMPLOYMENT_RULE_SOURCES: readonly SaudiEmploymentRuleSource[] = [
  {
    id: 'HRSD-LABOR-RELATIONS-CURRENT',
    title: 'Labor Relations — Articles 80 and 84–88',
    url: 'https://www.hrsd.gov.sa/en/%D8%B9%D9%84%D8%A7%D9%82%D8%A7%D8%AA-%D8%A7%D9%84%D8%B9%D9%85%D9%84',
    observedAt: '2026-09-12',
    articles: ['80', '84', '85', '86', '87', '88'],
    note: 'Official HRSD source for termination exclusions, EOSB basis, resignation scaling, exceptions and settlement timing.',
  },
  {
    id: 'HRSD-WORK-HOURS-107',
    title: 'Actual working hours — Articles 98 and 107',
    url: 'https://www.hrsd.gov.sa/en/knowledge-centre/articles/312',
    observedAt: '2026-09-12',
    articles: ['98', '107', '113'],
    note: 'Official HRSD labor-education source for standard hours, Ramadan limits, overtime compensation and personal leave.',
  },
  {
    id: 'HRSD-ANNUAL-LEAVE-109',
    title: 'Annual Leave — Article 109',
    url: 'https://www.hrsd.gov.sa/en/knowledge-centre/articles/321',
    observedAt: '2026-09-12',
    articles: ['109', '111'],
    note: 'Official HRSD source for annual-leave entitlement and proportional unused-leave rights.',
  },
  {
    id: 'HRSD-SICK-LEAVE-117',
    title: 'Sick Leave — Article 117',
    url: 'https://www.hrsd.gov.sa/en/knowledge-centre/articles/325',
    observedAt: '2026-09-12',
    articles: ['117'],
    note: 'Official HRSD source for 30-day full-pay, 60-day three-quarter-pay and following 30-day unpaid sick leave.',
  },
  {
    id: 'HRSD-WOMEN-EMPLOYMENT-151',
    title: 'Women Employment — Article 151',
    url: 'https://www.hrsd.gov.sa/en/%D8%AA%D8%B4%D8%BA%D9%8A%D9%84-%D8%A7%D9%84%D9%86%D8%B3%D8%A7%D8%A1',
    observedAt: '2026-09-12',
    articles: ['151'],
    note: 'Official HRSD source for twelve-week fully paid maternity leave and the mandatory six weeks following childbirth.',
  },
  {
    id: 'HRSD-AMENDMENTS-2025',
    title: '2025 Labor Law amendments',
    url: 'https://www.hrsd.gov.sa/sites/default/files/2025-03/Amendments%20to%20Labor%20Law%20Articles_0.pdf',
    observedAt: '2026-09-12',
    articles: ['107', '113', '151'],
    note: 'Official HRSD amendment comparison used as provenance for current amended provisions.',
  },
] as const;

export const SAUDI_EMPLOYMENT_RULES = [
  { id: 'EOSB-84', label: 'EOSB base award', detail: 'Half a month of the last wage for each of the first five years, one month for each following year, with proportional fractions of a year.', sourceId: 'HRSD-LABOR-RELATIONS-CURRENT' },
  { id: 'EOSB-85', label: 'Resignation scaling', detail: 'Less than 2 years: no award; 2–5 years: one-third; more than 5 and under 10 years: two-thirds; 10+ years: full award.', sourceId: 'HRSD-LABOR-RELATIONS-CURRENT' },
  { id: 'EOSB-87', label: 'Full-award exceptions', detail: 'Force majeure and the qualifying female-worker marriage/childbirth exceptions receive the full award.', sourceId: 'HRSD-LABOR-RELATIONS-CURRENT' },
  { id: 'WORK-98', label: 'Actual working hours', detail: 'Normally 8 hours/day or 48 hours/week; for Muslim workers during Ramadan, 6 hours/day or 36 hours/week.', sourceId: 'HRSD-WORK-HOURS-107' },
  { id: 'OT-107', label: 'Overtime additional wage', detail: 'Per overtime hour: hourly wage plus 50% of the basic hourly wage. Public-holiday work is treated as overtime.', sourceId: 'HRSD-WORK-HOURS-107' },
  { id: 'LEAVE-109', label: 'Annual leave', detail: 'At least 21 days, increasing to at least 30 days after five consecutive years of service.', sourceId: 'HRSD-ANNUAL-LEAVE-109' },
  { id: 'LEAVE-117', label: 'Sick leave', detail: '30 days full pay, next 60 days at three-quarters pay, following 30 days unpaid within the applicable year.', sourceId: 'HRSD-SICK-LEAVE-117' },
  { id: 'LEAVE-151', label: 'Maternity leave', detail: '12 weeks fully paid, including six mandatory weeks following childbirth, subject to the current Article 151 conditions.', sourceId: 'HRSD-WOMEN-EMPLOYMENT-151' },
] as const;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function previewSaudiEosb(input: SaudiEosbPreviewInput): SaudiEosbPreview {
  const blockers: string[] = [];
  const warnings = [
    'Simulation only. No termination decision, payroll posting, payment or legal certification is created.',
    'The last-wage basis and any commission/sales-percentage exclusions under Article 86 must be reviewed by an authorized qualified human.',
  ];

  if (!Number.isFinite(input.lastMonthlyWageSar) || input.lastMonthlyWageSar <= 0) blockers.push('Last monthly wage must be greater than zero.');
  if (!Number.isFinite(input.serviceYears) || input.serviceYears < 0) blockers.push('Service years must be zero or greater.');
  if (input.separationBasis === 'requires_review') blockers.push('A qualified human must determine the separation basis before EOSB can be previewed.');
  if (input.separationBasis === 'article80_possible') blockers.push('Possible Article 80 termination detected. This foundation will not estimate EOSB until a qualified human resolves applicability.');

  if (blockers.length) {
    return { status: 'blocked', simulationOnly: true, livePayrollEffect: false, countryPackCertification: 'NOT_CERTIFIED', blockers, warnings, sourceIds: ['HRSD-LABOR-RELATIONS-CURRENT'] };
  }

  const firstFiveYears = Math.min(input.serviceYears, 5);
  const laterYears = Math.max(0, input.serviceYears - 5);
  const baseAwardSar = round2(input.lastMonthlyWageSar * (0.5 * firstFiveYears + laterYears));

  let multiplier = 1;
  if (input.separationBasis === 'resignation') {
    if (input.serviceYears < 2) multiplier = 0;
    else if (input.serviceYears <= 5) multiplier = 1 / 3;
    else if (input.serviceYears < 10) multiplier = 2 / 3;
    else multiplier = 1;
  }

  return {
    status: 'ready_for_review',
    simulationOnly: true,
    livePayrollEffect: false,
    countryPackCertification: 'NOT_CERTIFIED',
    baseAwardSar,
    multiplier,
    estimatedAwardSar: round2(baseAwardSar * multiplier),
    blockers: [],
    warnings,
    sourceIds: ['HRSD-LABOR-RELATIONS-CURRENT'],
  };
}

export function previewSaudiWorkLeave(input: SaudiWorkLeavePreviewInput): SaudiWorkLeavePreview {
  const blockers: string[] = [];
  const warnings = [
    'Simulation only. No timecard, leave balance, payroll posting or legal certification is created.',
    'Special worker categories, shift approvals, hazardous work and other statutory exceptions are outside this foundation and require qualified review.',
  ];
  if (!Number.isFinite(input.yearsOfService) || input.yearsOfService < 0) blockers.push('Years of service must be zero or greater.');
  if (!Number.isFinite(input.hourlyWageSar) || input.hourlyWageSar < 0) blockers.push('Hourly wage must be zero or greater.');
  if (!Number.isFinite(input.basicHourlyWageSar) || input.basicHourlyWageSar < 0) blockers.push('Basic hourly wage must be zero or greater.');
  if (!Number.isFinite(input.overtimeHours) || input.overtimeHours < 0) blockers.push('Overtime hours must be zero or greater.');

  if (blockers.length) {
    return { status: 'blocked', simulationOnly: true, livePayrollEffect: false, countryPackCertification: 'NOT_CERTIFIED', blockers, warnings, sourceIds: ['HRSD-WORK-HOURS-107', 'HRSD-ANNUAL-LEAVE-109'] };
  }

  const annualLeaveDays = input.yearsOfService >= 5 ? 30 : 21;
  const maxActualHoursPerDay = input.muslimRamadan ? 6 : 8;
  const maxActualHoursPerWeek = input.muslimRamadan ? 36 : 48;
  const overtimePayPerHourSar = round2(input.hourlyWageSar + 0.5 * input.basicHourlyWageSar);
  const overtimePayTotalSar = round2(overtimePayPerHourSar * input.overtimeHours);

  return {
    status: 'ready_for_review',
    simulationOnly: true,
    livePayrollEffect: false,
    countryPackCertification: 'NOT_CERTIFIED',
    annualLeaveDays,
    maxActualHoursPerDay,
    maxActualHoursPerWeek,
    overtimePayPerHourSar,
    overtimePayTotalSar,
    blockers: [],
    warnings,
    sourceIds: ['HRSD-WORK-HOURS-107', 'HRSD-ANNUAL-LEAVE-109'],
  };
}

export function saudiEmploymentRulesPayload() {
  return {
    certification: 'NOT_CERTIFIED' as const,
    version: '0.1.0',
    simulationOnly: true as const,
    livePayrollEffect: false as const,
    sources: SAUDI_EMPLOYMENT_RULE_SOURCES,
    rules: SAUDI_EMPLOYMENT_RULES,
    fixedLeaveRules: [
      { label: 'Marriage', entitlement: '5 days fully paid', sourceId: 'HRSD-WORK-HOURS-107' },
      { label: 'Death of spouse / ascendant / descendant', entitlement: '5 days fully paid', sourceId: 'HRSD-WORK-HOURS-107' },
      { label: 'Death of brother / sister', entitlement: '3 days fully paid', sourceId: 'HRSD-AMENDMENTS-2025' },
      { label: 'Birth of child', entitlement: '3 days within 7 days of birth', sourceId: 'HRSD-AMENDMENTS-2025' },
      { label: 'Maternity', entitlement: '12 weeks fully paid; 6 weeks after childbirth mandatory', sourceId: 'HRSD-WOMEN-EMPLOYMENT-151' },
      { label: 'Sick leave', entitlement: '30 days full pay + 60 days at 75% + 30 days unpaid', sourceId: 'HRSD-SICK-LEAVE-117' },
    ],
    releaseBlockers: [
      'Independent Saudi legal/compliance review is not yet attached.',
      'Independent payroll validation is not yet attached.',
      'Approved golden employment-rule test evidence is not yet attached.',
      'Arabic/RTL critical-flow QA is not yet attached.',
      'Article 80, Article 81 and other termination-edge-case workflows require dedicated human-reviewed rule packs.',
      'No live Time & Leave, Payroll, Offboarding or contract-engine write integration is enabled by H51.41.',
    ],
  };
}