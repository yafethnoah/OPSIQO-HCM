export type OntarioRuleState = 'implemented_preview' | 'registered' | 'human_review';

export interface OntarioRuleSource {
  id: string;
  authority: 'Ontario' | 'CRA' | 'WSIB' | 'OHRC';
  title: string;
  url: string;
  observedAt: string;
  category: string;
  note: string;
}

export interface OntarioEmploymentPreviewInput {
  effectiveDate: string;
  regularHourlyRate: number;
  workWeekHours: number;
  serviceYears: number;
  vacationGrossWages: number;
  publicHolidayRegularWages4Weeks: number;
  publicHolidayVacationPay4Weeks: number;
}

export interface OntarioSeparationPreviewInput {
  serviceYears: number;
  regularWeeklyWage: number;
  severanceEligibilityReviewed: boolean;
  severanceQualifies: boolean;
}

export const ONTARIO_RULE_SOURCES: readonly OntarioRuleSource[] = [
  {
    id: 'ON-ESA-GUIDE',
    authority: 'Ontario',
    title: 'Your guide to the Employment Standards Act, 2000',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0',
    observedAt: '2026-09-12',
    category: 'Employment standards',
    note: 'Official Ontario guide covering minimum standards including wages, hours, overtime, holidays, vacation, leaves, termination and severance.',
  },
  {
    id: 'ON-ESA-MIN-WAGE',
    authority: 'Ontario',
    title: 'Minimum wage',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/minimum-wage',
    observedAt: '2026-09-12',
    category: 'Wages',
    note: 'Official current and announced Ontario minimum-wage schedule.',
  },
  {
    id: 'ON-ESA-HOURS',
    authority: 'Ontario',
    title: 'Hours of work',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/hours-work',
    observedAt: '2026-09-12',
    category: 'Time',
    note: 'General daily/weekly limits, eating periods and hours-of-work concepts; special rules and exemptions may apply.',
  },
  {
    id: 'ON-ESA-OVERTIME',
    authority: 'Ontario',
    title: 'Overtime pay',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/overtime-pay',
    observedAt: '2026-09-12',
    category: 'Time and pay',
    note: 'General overtime foundation: usually after 44 hours in a work week at 1.5 times the regular rate, subject to exemptions/special rules.',
  },
  {
    id: 'ON-ESA-VACATION',
    authority: 'Ontario',
    title: 'Vacation',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/vacation',
    observedAt: '2026-09-12',
    category: 'Leave and pay',
    note: 'General two/three-week vacation-time and four/six-percent vacation-pay standards.',
  },
  {
    id: 'ON-ESA-HOLIDAYS',
    authority: 'Ontario',
    title: 'Public holidays',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/public-holidays',
    observedAt: '2026-09-12',
    category: 'Leave and pay',
    note: 'Public-holiday entitlement and public-holiday-pay calculation foundation.',
  },
  {
    id: 'ON-ESA-WAGES',
    authority: 'Ontario',
    title: 'Payment of wages',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/payment-wages',
    observedAt: '2026-09-12',
    category: 'Payroll',
    note: 'Payment methods, final wages and wage-statement requirements.',
  },
  {
    id: 'ON-ESA-RECORDS',
    authority: 'Ontario',
    title: 'Record keeping',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/record-keeping',
    observedAt: '2026-09-12',
    category: 'Records',
    note: 'Employment-record and hours/pay record obligations and retention requirements.',
  },
  {
    id: 'ON-ESA-TERMINATION',
    authority: 'Ontario',
    title: 'Termination of employment',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment',
    observedAt: '2026-09-12',
    category: 'Offboarding',
    note: 'ESA statutory notice/pay-in-lieu foundation, including 1–8 week individual notice schedule; exemptions and mass-termination rules require review.',
  },
  {
    id: 'ON-ESA-SEVERANCE',
    authority: 'Ontario',
    title: 'Severance pay',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/severance-pay',
    observedAt: '2026-09-12',
    category: 'Offboarding',
    note: 'ESA severance eligibility and calculation foundation, subject to qualifying conditions and a 26-week maximum.',
  },
  {
    id: 'ON-ESA-LONG-ILLNESS',
    authority: 'Ontario',
    title: 'Long-term illness leave',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/long-term-illness-leave',
    observedAt: '2026-09-12',
    category: 'Leaves',
    note: 'Up to 27 weeks unpaid job-protected leave in a 52-week period for eligible employees with a serious medical condition.',
  },
  {
    id: 'ON-ESA-RECENT-CHANGES',
    authority: 'Ontario',
    title: 'Recent changes to employment standards',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/recent-changes',
    observedAt: '2026-09-12',
    category: 'Change monitoring',
    note: 'Official change log including job-seeking leave, placement-of-child leave and other recent/upcoming ESA changes.',
  },
  {
    id: 'ON-ESA-JOB-POSTINGS',
    authority: 'Ontario',
    title: 'Requirements related to publicly advertised job postings',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/requirements-related-publicly-advertised-job',
    observedAt: '2026-09-12',
    category: 'Recruiting',
    note: 'Effective 2026 requirements include compensation disclosure, AI-use disclosure, vacancy disclosure and Canadian-experience restrictions, subject to statutory exceptions.',
  },
  {
    id: 'ON-OHSA-DUTIES',
    authority: 'Ontario',
    title: 'OHSA employer duties',
    url: 'https://www.ontario.ca/document/guide-occupational-health-and-safety-act/part-iii-duties-employers-and-other-persons',
    observedAt: '2026-09-12',
    category: 'Health and safety',
    note: 'Official guide to employer duties to protect worker health and safety.',
  },
  {
    id: 'ON-OHSA-VIOLENCE-HARASSMENT',
    authority: 'Ontario',
    title: 'Workplace violence and workplace harassment',
    url: 'https://www.ontario.ca/document/guide-occupational-health-and-safety-act/part-iii0i-workplace-violence-and-workplace-harassment',
    observedAt: '2026-09-12',
    category: 'Health and safety',
    note: 'Policies, programs, risk assessment, reporting and investigation requirements.',
  },
  {
    id: 'ON-HUMAN-RIGHTS-CODE',
    authority: 'OHRC',
    title: 'Ontario Human Rights Code and system',
    url: 'https://www3.ohrc.on.ca/en/resources/code',
    observedAt: '2026-09-12',
    category: 'Human rights',
    note: 'Employment discrimination protections and protected grounds under the Ontario Human Rights Code.',
  },
  {
    id: 'ON-AODA-EMPLOYMENT',
    authority: 'Ontario',
    title: 'Accessible workplaces',
    url: 'https://www.ontario.ca/page/accessible-workplaces',
    observedAt: '2026-09-12',
    category: 'Accessibility',
    note: 'AODA employment accessibility standards for organizations, employees and applicants.',
  },
  {
    id: 'ON-PAY-EQUITY',
    authority: 'Ontario',
    title: 'Pay Equity Act',
    url: 'https://www.ontario.ca/laws/statute/90p07',
    observedAt: '2026-09-12',
    category: 'Compensation equity',
    note: 'Applies to private-sector Ontario employers with 10 or more employees and to public-sector employers, subject to the Act.',
  },
  {
    id: 'ON-WSIB-REGISTRATION',
    authority: 'WSIB',
    title: 'WSIB registration and coverage',
    url: 'https://www.wsib.ca/en/howtoregister',
    observedAt: '2026-09-12',
    category: 'Workers compensation',
    note: 'Official Ontario WSIB registration/coverage guidance; coverage obligations vary by industry and status.',
  },
  {
    id: 'ON-WSIB-PAYROLL',
    authority: 'WSIB',
    title: 'Report payroll and pay premiums',
    url: 'https://www.wsib.ca/en/businesses/premiums-and-payment/how-report-your-payroll-and-pay-your-premiums',
    observedAt: '2026-09-12',
    category: 'Workers compensation',
    note: 'Official payroll reporting and premium-payment rules, including reporting cadence based on annual payroll.',
  },
  {
    id: 'ON-EHT',
    authority: 'Ontario',
    title: 'Employer Health Tax',
    url: 'https://www.ontario.ca/document/employer-health-tax-eht',
    observedAt: '2026-09-12',
    category: 'Employer tax',
    note: 'Ontario employer health tax rates, exemption rules and associated-employer considerations.',
  },
  {
    id: 'CA-CRA-T4032-ON-2026',
    authority: 'CRA',
    title: '2026 Ontario payroll deductions tables',
    url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-jan.html',
    observedAt: '2026-09-12',
    category: 'Federal payroll',
    note: 'Official 2026 Ontario CPP, EI, federal and Ontario income-tax payroll tables.',
  },
  {
    id: 'CA-CRA-T4127-JUL-2026',
    authority: 'CRA',
    title: 'Payroll deductions formulas — effective July 1, 2026',
    url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html',
    observedAt: '2026-09-12',
    category: 'Federal payroll',
    note: 'CRA-approved payroll software formulas for income tax, CPP and EI deductions.',
  },
] as const;

export const ONTARIO_RULE_REGISTRY = [
  { id: 'ESA-MIN-WAGE', label: 'Minimum wage', state: 'implemented_preview' as OntarioRuleState, sourceId: 'ON-ESA-MIN-WAGE', detail: 'General minimum wage: $17.60/hour through 2026-09-30; $17.95/hour from 2026-10-01 through 2027-09-30. Specialized rates remain separately governed.' },
  { id: 'ESA-HOURS', label: 'Hours of work', state: 'implemented_preview' as OntarioRuleState, sourceId: 'ON-ESA-HOURS', detail: 'General maximum: 8 hours/day or established regular workday if longer; 48 hours/week. Excess hours require a qualifying agreement.' },
  { id: 'ESA-MEAL', label: 'Eating period', state: 'implemented_preview' as OntarioRuleState, sourceId: 'ON-ESA-HOURS', detail: 'Generally 30 minutes free from work after no more than five consecutive hours, subject to permitted split agreement.' },
  { id: 'ESA-OT', label: 'Overtime pay', state: 'implemented_preview' as OntarioRuleState, sourceId: 'ON-ESA-OVERTIME', detail: 'General rule: hours above 44/week at at least 1.5× regular rate; special rules/exemptions may apply.' },
  { id: 'ESA-VACATION', label: 'Vacation time and pay', state: 'implemented_preview' as OntarioRuleState, sourceId: 'ON-ESA-VACATION', detail: 'Generally 2 weeks/4% under 5 years; 3 weeks/6% at 5+ years.' },
  { id: 'ESA-PUBLIC-HOLIDAY', label: 'Public holiday pay', state: 'implemented_preview' as OntarioRuleState, sourceId: 'ON-ESA-HOLIDAYS', detail: 'Foundation formula: regular wages earned + vacation pay payable in the prior four work weeks, divided by 20.' },
  { id: 'ESA-WAGE-STATEMENT', label: 'Payment of wages and wage statements', state: 'registered' as OntarioRuleState, sourceId: 'ON-ESA-WAGES', detail: 'Tracks permitted payment methods, final-wage timing and wage-statement content requirements.' },
  { id: 'ESA-RECORDS', label: 'Employment record keeping', state: 'registered' as OntarioRuleState, sourceId: 'ON-ESA-RECORDS', detail: 'Employee identity, hours and pay records are subject to statutory retention and inspection obligations.' },
  { id: 'ESA-TERMINATION', label: 'Termination notice/pay', state: 'implemented_preview' as OntarioRuleState, sourceId: 'ON-ESA-TERMINATION', detail: 'Individual ESA statutory notice foundation ranges from 0 to 8 weeks based on service; exemptions, mass termination and common-law rights require review.' },
  { id: 'ESA-SEVERANCE', label: 'Severance pay', state: 'human_review' as OntarioRuleState, sourceId: 'ON-ESA-SEVERANCE', detail: 'Requires human confirmation of statutory eligibility; formula preview is capped at 26 weeks.' },
  { id: 'ESA-LONG-ILLNESS', label: 'Long-term illness leave', state: 'registered' as OntarioRuleState, sourceId: 'ON-ESA-LONG-ILLNESS', detail: 'Eligible employees with 13 consecutive weeks of service may have up to 27 weeks unpaid job-protected leave in a 52-week period.' },
  { id: 'ESA-PLACEMENT', label: 'Placement of a child leave', state: 'registered' as OntarioRuleState, sourceId: 'ON-ESA-RECENT-CHANGES', detail: 'Foundation tracks the 16-week unpaid job-protected placement leave for qualifying adoption/surrogacy placements, subject to statutory conditions.' },
  { id: 'ESA-JOB-SEEKING', label: 'Job seeking leave', state: 'registered' as OntarioRuleState, sourceId: 'ON-ESA-RECENT-CHANGES', detail: 'Foundation tracks up to 3 unpaid days for qualifying employees given mass-termination notice.' },
  { id: 'ESA-JOB-POSTINGS', label: '2026 job-posting requirements', state: 'registered' as OntarioRuleState, sourceId: 'ON-ESA-JOB-POSTINGS', detail: 'Tracks compensation-range disclosure, AI-use disclosure, vacancy disclosure, Canadian-experience prohibition and interviewed-applicant status notice requirements, subject to exemptions.' },
  { id: 'OHSA-DUTIES', label: 'OHSA employer duties', state: 'registered' as OntarioRuleState, sourceId: 'ON-OHSA-DUTIES', detail: 'Employer health-and-safety duties, information/instruction/supervision and prescribed protective measures.' },
  { id: 'OHSA-VH', label: 'Violence and harassment', state: 'registered' as OntarioRuleState, sourceId: 'ON-OHSA-VIOLENCE-HARASSMENT', detail: 'Annual policy review plus violence/harassment programs, reporting and investigation controls; writing/posting rules apply based on workforce size.' },
  { id: 'HRC-EMPLOYMENT', label: 'Human rights in employment', state: 'registered' as OntarioRuleState, sourceId: 'ON-HUMAN-RIGHTS-CODE', detail: 'Employment discrimination and accommodation governance across protected grounds.' },
  { id: 'AODA-EMPLOYMENT', label: 'Accessible employment practices', state: 'registered' as OntarioRuleState, sourceId: 'ON-AODA-EMPLOYMENT', detail: 'AODA employment accessibility requirements for employees and job applicants.' },
  { id: 'PAY-EQUITY', label: 'Ontario Pay Equity Act', state: 'registered' as OntarioRuleState, sourceId: 'ON-PAY-EQUITY', detail: 'Applicability/readiness foundation for private-sector employers with 10+ Ontario employees and public-sector employers.' },
  { id: 'WSIB', label: 'WSIB coverage and reporting', state: 'human_review' as OntarioRuleState, sourceId: 'ON-WSIB-PAYROLL', detail: 'Industry/status applicability and insurable earnings require governed review; reporting cadence is registered from WSIB guidance.' },
  { id: 'EHT', label: 'Employer Health Tax', state: 'human_review' as OntarioRuleState, sourceId: 'ON-EHT', detail: 'Ontario remuneration, exemption and associated-employer facts require employer-level review before EHT calculations.' },
  { id: 'CRA-PAYROLL', label: 'CPP, CPP2, EI and income tax', state: 'registered' as OntarioRuleState, sourceId: 'CA-CRA-T4127-JUL-2026', detail: 'Existing Canadian Payroll engine remains the execution surface; Country Compliance registers current CRA source/version provenance without duplicating live payroll.' },
] as const;

export const ONTARIO_2026_PAYROLL_REFERENCE = {
  cpp: {
    ympe: 74600,
    basicExemption: 3500,
    combinedBaseAndFirstAdditionalRate: 0.0595,
    maxCombinedBaseAndFirstAdditional: 4230.45,
    yampe: 85000,
    cpp2Rate: 0.04,
    maxCpp2: 416,
  },
  ei: {
    maxInsurableEarnings: 68900,
    employeeRate: 0.0163,
    employerRate: 0.02282,
    maxEmployeePremium: 1123.07,
    maxEmployerPremium: 1572.30,
  },
  sourceId: 'CA-CRA-T4032-ON-2026',
} as const;

export const ONTARIO_COMPLIANCE_BOUNDARIES = [
  'This is a regulatory foundation and decision-support layer, not legal advice or legal certification.',
  'ESA special rules, exemptions, collective agreements, contracts and common-law entitlements can change the result and require qualified review.',
  'Ontario employment-law previews create no payroll posting, leave balance, termination decision, payment, government filing or employee action.',
  'Federal payroll execution remains in the separate Canadian Payroll workspace; this module registers regulatory provenance and previews only.',
  'Independent Ontario employment-law/payroll review and approved golden-case evidence are required before any country pack can be marked certified.',
] as const;

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function ontarioGeneralMinimumWage(effectiveDate: string) {
  if (effectiveDate >= '2026-10-01' && effectiveDate <= '2027-09-30') {
    return { rate: 17.95, studentRate: 16.9, period: '2026-10-01 to 2027-09-30' };
  }
  if (effectiveDate >= '2025-10-01' && effectiveDate <= '2026-09-30') {
    return { rate: 17.6, studentRate: 16.6, period: '2025-10-01 to 2026-09-30' };
  }
  return null;
}

export function previewOntarioEmploymentStandards(input: OntarioEmploymentPreviewInput) {
  const blockers: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate)) blockers.push('Effective date must use YYYY-MM-DD.');
  for (const [label, value] of [
    ['Regular hourly rate', input.regularHourlyRate],
    ['Work-week hours', input.workWeekHours],
    ['Service years', input.serviceYears],
    ['Vacation gross wages', input.vacationGrossWages],
    ['Public-holiday regular wages', input.publicHolidayRegularWages4Weeks],
    ['Public-holiday vacation pay', input.publicHolidayVacationPay4Weeks],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) blockers.push(`${label} must be zero or greater.`);
  }

  const minimumWage = ontarioGeneralMinimumWage(input.effectiveDate);
  if (!minimumWage) blockers.push('No registered Ontario minimum-wage schedule covers the selected effective date.');

  if (blockers.length) {
    return {
      status: 'blocked' as const,
      certification: 'NOT_CERTIFIED' as const,
      liveEffect: 'NONE' as const,
      blockers,
      warnings: [...ONTARIO_COMPLIANCE_BOUNDARIES],
    };
  }

  const overtimeHours = Math.max(0, input.workWeekHours - 44);
  const overtimeRate = round2(input.regularHourlyRate * 1.5);
  const overtimePay = round2(overtimeHours * overtimeRate);
  const vacationRate = input.serviceYears >= 5 ? 0.06 : 0.04;
  const vacationWeeks = input.serviceYears >= 5 ? 3 : 2;
  const vacationPay = round2(input.vacationGrossWages * vacationRate);
  const publicHolidayPay = round2(
    (input.publicHolidayRegularWages4Weeks + input.publicHolidayVacationPay4Weeks) / 20,
  );

  const warnings: string[] = [...ONTARIO_COMPLIANCE_BOUNDARIES];
  if (minimumWage && input.regularHourlyRate < minimumWage.rate) {
    warnings.unshift(
      `Entered regular hourly rate is below the registered general Ontario minimum wage of $${minimumWage.rate.toFixed(2)} for the selected date. Confirm whether a specialized rate or exemption applies.`,
    );
  }

  return {
    status: 'ready_for_review' as const,
    certification: 'NOT_CERTIFIED' as const,
    liveEffect: 'NONE' as const,
    minimumWage,
    generalDailyHoursLimit: 8,
    generalWeeklyHoursLimit: 48,
    mealBreakMinutes: 30,
    mealBreakAfterConsecutiveHours: 5,
    overtimeThresholdHours: 44,
    overtimeHours: round2(overtimeHours),
    overtimeRate,
    overtimePay,
    vacationWeeks,
    vacationRate,
    vacationPay,
    publicHolidayPay,
    blockers: [],
    warnings,
    sourceIds: ['ON-ESA-MIN-WAGE', 'ON-ESA-HOURS', 'ON-ESA-OVERTIME', 'ON-ESA-VACATION', 'ON-ESA-HOLIDAYS'],
  };
}

export function ontarioTerminationNoticeWeeks(serviceYears: number) {
  if (!Number.isFinite(serviceYears) || serviceYears < 0) return null;
  if (serviceYears < 0.25) return 0;
  if (serviceYears < 1) return 1;
  if (serviceYears < 3) return 2;
  if (serviceYears < 4) return 3;
  if (serviceYears < 5) return 4;
  if (serviceYears < 6) return 5;
  if (serviceYears < 7) return 6;
  if (serviceYears < 8) return 7;
  return 8;
}

export function previewOntarioSeparation(input: OntarioSeparationPreviewInput) {
  const blockers: string[] = [];
  if (!Number.isFinite(input.serviceYears) || input.serviceYears < 0) blockers.push('Service years must be zero or greater.');
  if (!Number.isFinite(input.regularWeeklyWage) || input.regularWeeklyWage < 0) blockers.push('Regular weekly wage must be zero or greater.');

  const noticeWeeks = ontarioTerminationNoticeWeeks(input.serviceYears);
  if (noticeWeeks === null) blockers.push('Unable to determine the ESA notice foundation.');

  let severanceStatus: 'requires_review' | 'not_qualified' | 'ready_for_review' = 'requires_review';
  let severanceWeeks: number | undefined;
  let severancePay: number | undefined;

  if (input.severanceEligibilityReviewed) {
    if (!input.severanceQualifies) {
      severanceStatus = 'not_qualified';
      severanceWeeks = 0;
      severancePay = 0;
    } else if (input.serviceYears < 5) {
      blockers.push('Severance was marked qualified but service is under five years; resolve statutory eligibility with a qualified human.');
    } else {
      severanceStatus = 'ready_for_review';
      severanceWeeks = round2(Math.min(26, input.serviceYears));
      severancePay = round2(input.regularWeeklyWage * severanceWeeks);
    }
  }

  return {
    status: blockers.length ? 'blocked' as const : 'ready_for_review' as const,
    certification: 'NOT_CERTIFIED' as const,
    liveEffect: 'NONE' as const,
    noticeWeeks,
    noticePayFoundation: noticeWeeks === null ? undefined : round2(input.regularWeeklyWage * noticeWeeks),
    severanceStatus,
    severanceWeeks,
    severancePay,
    blockers,
    warnings: [
      ...ONTARIO_COMPLIANCE_BOUNDARIES,
      'The ESA statutory notice/severance preview does not determine common-law reasonable notice, contractual rights, just cause, constructive dismissal, mass-termination obligations or other legal entitlements.',
    ],
    sourceIds: ['ON-ESA-TERMINATION', 'ON-ESA-SEVERANCE'],
  };
}

export function ontarioCompliancePayload() {
  return {
    version: 'H51.43-ON-0.1.0',
    jurisdiction: 'Ontario, Canada',
    certification: 'NOT_CERTIFIED' as const,
    liveEffect: 'NONE' as const,
    sources: ONTARIO_RULE_SOURCES,
    rules: ONTARIO_RULE_REGISTRY,
    payrollReference2026: ONTARIO_2026_PAYROLL_REFERENCE,
    boundaries: ONTARIO_COMPLIANCE_BOUNDARIES,
    majorCoverage: [
      'Employment Standards Act minimum standards',
      'Recruiting and 2026 public job-posting rules',
      'Hours, overtime, vacation and public-holiday foundations',
      'Leaves and employment-record obligations',
      'Termination and severance foundations',
      'Occupational Health and Safety Act duties',
      'Workplace violence and harassment',
      'Ontario Human Rights Code employment protections',
      'Accessibility for Ontarians with Disabilities Act employment standards',
      'Ontario Pay Equity Act applicability',
      'WSIB coverage/payroll reporting provenance',
      'Employer Health Tax provenance',
      'CRA Ontario payroll tables and 2026 CPP/CPP2/EI reference',
    ],
    openCertificationGates: [
      'Independent Ontario employment-law review',
      'Independent Canadian payroll review',
      'Approved Ontario golden-case suite across special rules/exemptions',
      'Collective-agreement and unionized-workplace exception validation',
      'Industry-specific ESA special-rule coverage',
      'Production regulatory change-monitoring approval workflow',
    ],
  };
}