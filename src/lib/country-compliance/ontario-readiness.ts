export type OntarioOrgType = 'private' | 'nonprofit' | 'public' | 'unknown';
export type OntarioApplicability = 'required' | 'not_applicable' | 'review_required';
export type OntarioReadinessState = 'complete' | 'open' | 'review_required';

export interface OntarioComplianceProfile {
  id: 'current';
  orgType: OntarioOrgType;
  ontarioEmployeeCount: number;
  workplaceWorkerCount: number;
  usesPublicJobPostings: boolean;
  usesAiInRecruiting: boolean;
  electronicallyMonitorsEmployees: boolean;
  usesRecruitersOrTempAgencies: boolean;
  unionizedWorkplace: boolean;
  specialRulesOrExemptionsReviewed: boolean;
  annualOntarioPayrollCad: number;
  associatedGroupOntarioPayrollCad: number;
  registeredCharity: boolean;
  ehtEligibleEmployerReviewed: boolean;
  ehtEligibleEmployer: boolean;
  disconnectingPolicyRef?: string;
  electronicMonitoringPolicyRef?: string;
  jobPostingProcedureRef?: string;
  aodaComplianceReportRef?: string;
  accessibilityPlanRef?: string;
  hsrOrJhscRef?: string;
  payEquityReviewRef?: string;
  recruiterLicenseReviewRef?: string;
  wsibCoverageReviewRef?: string;
  ehtReviewRef?: string;
  collectiveAgreementReviewRef?: string;
  specialRulesReviewRef?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface OntarioReadinessObligation {
  id: string;
  label: string;
  category: string;
  applicability: OntarioApplicability;
  state: OntarioReadinessState;
  reason: string;
  sourceId: string;
  evidenceField?: keyof OntarioComplianceProfile;
  dueDate?: string;
  severity: 'green' | 'amber' | 'red';
}

export interface OntarioComplianceSource {
  id: string;
  authority: 'Ontario' | 'WSIB' | 'CRA' | 'OHRC';
  title: string;
  url: string;
  observedAt: string;
  category: string;
}

export interface OntarioLeaveRule {
  id: string;
  label: string;
  foundationEntitlement: string;
  eligibilityFoundation: string;
  paidFoundation: string;
  sourceUrl: string;
  liveEffect: 'NONE';
  reviewRequired: boolean;
}

export const ONTARIO_INTELLIGENCE_SOURCES: readonly OntarioComplianceSource[] = [
  {
    id: 'ON-ESA-HOURS-REST',
    authority: 'Ontario',
    title: 'Hours of work',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/hours-work',
    observedAt: '2026-09-12',
    category: 'Hours and rest',
  },
  {
    id: 'ON-ESA-DISCONNECT',
    authority: 'Ontario',
    title: 'Written policy on disconnecting from work',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/written-policy-disconnecting-from-work',
    observedAt: '2026-09-12',
    category: 'Policy governance',
  },
  {
    id: 'ON-ESA-E-MONITORING',
    authority: 'Ontario',
    title: 'Written policy on electronic monitoring of employees',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/written-policy-electronic-monitoring-employees',
    observedAt: '2026-09-12',
    category: 'Policy governance',
  },
  {
    id: 'ON-ESA-JOB-POSTINGS-2026',
    authority: 'Ontario',
    title: 'Requirements related to publicly advertised job postings',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/requirements-related-publicly-advertised-job',
    observedAt: '2026-09-12',
    category: 'Recruiting',
  },
  {
    id: 'ON-ESA-RECRUITER-LICENSING',
    authority: 'Ontario',
    title: 'Licensing for temporary help agencies and recruiters',
    url: 'https://www.ontario.ca/page/licensing-temporary-help-agencies-and-recruiters',
    observedAt: '2026-09-12',
    category: 'Recruiting',
  },
  {
    id: 'ON-AODA-REPORT-2026',
    authority: 'Ontario',
    title: 'Completing your accessibility compliance report',
    url: 'https://www.ontario.ca/page/completing-your-accessibility-compliance-report',
    observedAt: '2026-09-12',
    category: 'Accessibility',
  },
  {
    id: 'ON-AODA-BUSINESS',
    authority: 'Ontario',
    title: 'Accessibility rules for businesses and non-profits',
    url: 'https://www.ontario.ca/page/accessibility-rules-businesses-and-non-profits',
    observedAt: '2026-09-12',
    category: 'Accessibility',
  },
  {
    id: 'ON-OHSA-HSR',
    authority: 'Ontario',
    title: 'Health and safety representatives',
    url: 'https://www.ontario.ca/page/health-and-safety-representatives',
    observedAt: '2026-09-12',
    category: 'Health and safety',
  },
  {
    id: 'ON-OHSA-CAMPAIGN-2026',
    authority: 'Ontario',
    title: 'Health and safety compliance campaigns 2026–2027',
    url: 'https://www.ontario.ca/page/health-and-safety-compliance-campaigns-2026-2027',
    observedAt: '2026-09-12',
    category: 'Health and safety',
  },
  {
    id: 'ON-PAY-EQUITY-ACT',
    authority: 'Ontario',
    title: 'Pay Equity Act',
    url: 'https://www.ontario.ca/laws/statute/90p07',
    observedAt: '2026-09-12',
    category: 'Pay equity',
  },
  {
    id: 'ON-EHT-2026',
    authority: 'Ontario',
    title: 'Employer Health Tax',
    url: 'https://www.ontario.ca/document/employer-health-tax-eht',
    observedAt: '2026-09-12',
    category: 'Employer tax',
  },
  {
    id: 'ON-ESA-RECORDS-2026',
    authority: 'Ontario',
    title: 'Record keeping',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/record-keeping',
    observedAt: '2026-09-12',
    category: 'Records',
  },
  {
    id: 'ON-ESA-LEAVES',
    authority: 'Ontario',
    title: 'Your guide to the Employment Standards Act — leaves',
    url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0',
    observedAt: '2026-09-12',
    category: 'Leaves',
  },
] as const;

export const ONTARIO_MINIMUM_WAGE_SCHEDULE = {
  currentThrough20260930: {
    generalHourly: 17.6,
    studentHourly: 16.6,
    huntingFishingGuideUnder5HoursDaily: 88.05,
    huntingFishingGuide5PlusHoursDaily: 176.15,
  },
  effective20261001Through20270930: {
    generalHourly: 17.95,
    studentHourly: 16.9,
    huntingFishingGuideUnder5HoursDaily: 89.75,
    huntingFishingGuide5PlusHoursDaily: 179.5,
  },
  sourceId: 'ON-ESA-MIN-WAGE',
} as const;

export const ONTARIO_HOURS_REST_FOUNDATION = {
  dailyHoursGeneralLimit: 8,
  weeklyHoursGeneralLimit: 48,
  consecutiveDailyRestHours: 11,
  betweenShiftRestHours: 8,
  weeklyRestHours: 24,
  biweeklyRestHours: 48,
  overtimeThresholdHours: 44,
  eatingPeriodMinutes: 30,
  eatingPeriodAfterHours: 5,
  sourceId: 'ON-ESA-HOURS-REST',
  note: 'General ESA foundation only. Agreements, emergencies, on-call rules, special rules and exemptions can change applicability.',
} as const;

export const ONTARIO_RECRUITING_2026_FOUNDATION = {
  employerThreshold: 25,
  effectiveDate: '2026-01-01',
  interviewDecisionStatusDeadlineDays: 45,
  postingRetentionYears: 3,
  interviewStatusRetentionYears: 3,
  expectedCompensationRequired: true,
  aiUseDisclosureRequired: true,
  vacancyDisclosureRequired: true,
  canadianExperienceRequirementProhibited: true,
  sourceId: 'ON-ESA-JOB-POSTINGS-2026',
} as const;

export const ONTARIO_EHT_FOUNDATION = {
  exemptionCad: 1_000_000,
  exemptionThresholdCad: 5_000_000,
  standardTopRate: 0.0195,
  nextInflationAdjustmentYear: 2029,
  sourceId: 'ON-EHT-2026',
  note: 'Eligibility, associated-employer allocation, charity status, part-year rules and taxable Ontario remuneration require governed review.',
} as const;

export const ONTARIO_LEAVE_CATALOGUE: readonly OntarioLeaveRule[] = [
  {
    id: 'pregnancy',
    label: 'Pregnancy leave',
    foundationEntitlement: 'Up to 17 weeks for most eligible employees, with statutory timing rules.',
    eligibilityFoundation: 'ESA-covered employee; detailed start/timing rules require case review.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/pregnancy-and-parental-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'parental',
    label: 'Parental leave',
    foundationEntitlement: 'Up to 61 weeks for a birth mother who took pregnancy leave; up to 63 weeks for other new parents.',
    eligibilityFoundation: 'ESA-covered employee meeting parental-leave conditions.',
    paidFoundation: 'Unpaid under the ESA; federal EI is separate.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/pregnancy-and-parental-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'sick',
    label: 'Sick leave',
    foundationEntitlement: 'Up to 3 unpaid job-protected days each calendar year.',
    eligibilityFoundation: 'Generally after at least 2 consecutive weeks of employment.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/sick-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'long_term_illness',
    label: 'Long-term illness leave',
    foundationEntitlement: 'Up to 27 weeks of unpaid job-protected leave in a 52-week period.',
    eligibilityFoundation: 'Foundation requires service and serious-medical-condition evidence review.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/long-term-illness-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'family_responsibility',
    label: 'Family responsibility leave',
    foundationEntitlement: 'Up to 3 unpaid job-protected days each calendar year.',
    eligibilityFoundation: 'Generally after at least 2 consecutive weeks of employment; qualifying relative/event required.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/family-responsibility-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'bereavement',
    label: 'Bereavement leave',
    foundationEntitlement: 'Up to 2 unpaid job-protected days each calendar year.',
    eligibilityFoundation: 'Generally after at least 2 consecutive weeks of employment; qualifying family relationship required.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/bereavement-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'family_caregiver',
    label: 'Family caregiver leave',
    foundationEntitlement: 'Up to 8 weeks per calendar year for each qualifying family member.',
    eligibilityFoundation: 'Serious medical condition and qualifying family relationship require review.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/family-caregiver-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'family_medical',
    label: 'Family medical leave',
    foundationEntitlement: 'Up to 28 weeks within a specified 52-week period.',
    eligibilityFoundation: 'Qualified health-practitioner certificate and significant risk-of-death criteria apply.',
    paidFoundation: 'Unpaid under the ESA; federal compassionate-care benefits are separate.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/family-medical-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'critical_illness_minor',
    label: 'Critical illness leave — minor child',
    foundationEntitlement: 'Up to 37 weeks within a 52-week period.',
    eligibilityFoundation: 'Qualified health-practitioner certificate and critically-ill criteria apply.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/critical-illness-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'critical_illness_adult',
    label: 'Critical illness leave — adult',
    foundationEntitlement: 'Up to 17 weeks within a 52-week period.',
    eligibilityFoundation: 'Qualified health-practitioner certificate and critically-ill criteria apply.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/critical-illness-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'organ_donor',
    label: 'Organ donor leave',
    foundationEntitlement: 'Up to 13 weeks, with medically-supported extensions up to an additional 13 weeks.',
    eligibilityFoundation: 'At least 13 weeks of service and qualifying organ-donation surgery.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/organ-donor-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'domestic_sexual_violence',
    label: 'Domestic or sexual violence leave',
    foundationEntitlement: 'Up to 10 days and 15 weeks in a calendar year for qualifying purposes.',
    eligibilityFoundation: 'At least 13 consecutive weeks of employment plus statutory event/purpose criteria.',
    paidFoundation: 'First 5 leave days taken in the calendar year are paid; remaining entitlement is unpaid.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/domestic-or-sexual-violence-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'child_death',
    label: 'Child death leave',
    foundationEntitlement: 'Up to 104 weeks.',
    eligibilityFoundation: 'Generally at least 6 consecutive months of employment plus statutory child/event criteria.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/child-death-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'crime_child_disappearance',
    label: 'Crime-related child disappearance leave',
    foundationEntitlement: 'Up to 104 weeks.',
    eligibilityFoundation: 'Generally at least 6 consecutive months of employment and statutory crime-related criteria.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/crime-related-child-disappearance-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'reservist',
    label: 'Reservist leave',
    foundationEntitlement: 'Duration depends on the qualifying deployment, training or operation.',
    eligibilityFoundation: 'Generally at least 2 consecutive months of employment; no minimum for specified domestic emergency deployments.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/reservist-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'placement_child',
    label: 'Placement of a child leave',
    foundationEntitlement: 'Up to 16 weeks for qualifying adoption/surrogacy placements under the current foundation.',
    eligibilityFoundation: 'Statutory placement and service conditions require review.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/recent-changes',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'job_seeking',
    label: 'Job seeking leave',
    foundationEntitlement: 'Up to 3 unpaid days for qualifying employees receiving mass-termination notice.',
    eligibilityFoundation: 'Mass-termination notice and actual-notice conditions require review.',
    paidFoundation: 'Unpaid under the ESA.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/job-seeking-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
  {
    id: 'infectious_disease_emergency',
    label: 'Infectious disease emergency leave',
    foundationEntitlement: 'Job-protected unpaid leave while statutory designated-disease conditions apply.',
    eligibilityFoundation: 'Current designated-disease and statutory reason must be reviewed at time of request.',
    paidFoundation: 'Unpaid under the current ESA foundation.',
    sourceUrl: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/infectious-disease-emergency-leave',
    liveEffect: 'NONE',
    reviewRequired: true,
  },
] as const;

export const ONTARIO_CHANGE_CALENDAR = [
  {
    id: 'minimum-wage-2026',
    effectiveDate: '2026-10-01',
    label: 'Ontario minimum-wage increase',
    detail: 'General minimum wage moves from $17.60 to $17.95; student rate moves from $16.60 to $16.90.',
    sourceId: 'ON-ESA-MIN-WAGE',
  },
  {
    id: 'aoda-report-2026',
    effectiveDate: '2026-12-31',
    label: 'AODA accessibility compliance report deadline',
    detail: 'Businesses and non-profits with 20 or more employees must file the 2026 accessibility compliance report.',
    sourceId: 'ON-AODA-REPORT-2026',
  },
  {
    id: 'job-posting-active',
    effectiveDate: '2026-01-01',
    label: 'Ontario public job-posting rules active',
    detail: 'Compensation, AI-use and vacancy disclosures; Canadian-experience restriction; interview decision-status and retention controls.',
    sourceId: 'ON-ESA-JOB-POSTINGS-2026',
  },
] as const;

const hasEvidence = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

function obligation(
  id: string,
  label: string,
  category: string,
  applicability: OntarioApplicability,
  reason: string,
  sourceId: string,
  evidenceField: keyof OntarioComplianceProfile | undefined,
  evidencePresent: boolean,
  severity: 'green' | 'amber' | 'red' = 'amber',
  dueDate?: string,
): OntarioReadinessObligation {
  const state: OntarioReadinessState =
    applicability === 'not_applicable'
      ? 'complete'
      : applicability === 'review_required'
        ? 'review_required'
        : evidencePresent
          ? 'complete'
          : 'open';
  return { id, label, category, applicability, state, reason, sourceId, evidenceField, dueDate, severity };
}

export function defaultOntarioComplianceProfile(): OntarioComplianceProfile {
  return {
    id: 'current',
    orgType: 'unknown',
    ontarioEmployeeCount: 0,
    workplaceWorkerCount: 0,
    usesPublicJobPostings: false,
    usesAiInRecruiting: false,
    electronicallyMonitorsEmployees: false,
    usesRecruitersOrTempAgencies: false,
    unionizedWorkplace: false,
    specialRulesOrExemptionsReviewed: false,
    annualOntarioPayrollCad: 0,
    associatedGroupOntarioPayrollCad: 0,
    registeredCharity: false,
    ehtEligibleEmployerReviewed: false,
    ehtEligibleEmployer: false,
  };
}

export function assessOntarioComplianceReadiness(profile: OntarioComplianceProfile) {
  const obligations: OntarioReadinessObligation[] = [];
  const count = Math.max(0, Number(profile.ontarioEmployeeCount) || 0);
  const workers = Math.max(0, Number(profile.workplaceWorkerCount) || 0);

  const policyThreshold = count >= 25;
  obligations.push(
    obligation(
      'disconnecting-policy',
      'Written policy on disconnecting from work',
      'ESA policy governance',
      policyThreshold ? 'required' : 'not_applicable',
      policyThreshold
        ? '25 or more Ontario employees triggers the annual written-policy threshold.'
        : 'Below the 25-employee threshold on the current profile.',
      'ON-ESA-DISCONNECT',
      'disconnectingPolicyRef',
      hasEvidence(profile.disconnectingPolicyRef),
      policyThreshold ? 'red' : 'green',
      policyThreshold ? '2026-03-01' : undefined,
    ),
  );

  obligations.push(
    obligation(
      'electronic-monitoring-policy',
      'Written policy on electronic monitoring',
      'ESA policy governance',
      policyThreshold ? 'required' : 'not_applicable',
      policyThreshold
        ? '25 or more Ontario employees triggers the written-policy requirement, whether monitoring occurs or not.'
        : 'Below the 25-employee threshold on the current profile.',
      'ON-ESA-E-MONITORING',
      'electronicMonitoringPolicyRef',
      hasEvidence(profile.electronicMonitoringPolicyRef),
      policyThreshold ? 'red' : 'green',
      policyThreshold ? '2026-03-01' : undefined,
    ),
  );

  const postingApplies = count >= ONTARIO_RECRUITING_2026_FOUNDATION.employerThreshold && profile.usesPublicJobPostings;
  obligations.push(
    obligation(
      'public-job-postings',
      '2026 publicly advertised job-posting controls',
      'Recruiting',
      postingApplies ? 'required' : 'not_applicable',
      postingApplies
        ? 'Employer has 25+ Ontario employees and uses publicly advertised job postings.'
        : 'Threshold/use conditions are not both met in the current profile.',
      'ON-ESA-JOB-POSTINGS-2026',
      'jobPostingProcedureRef',
      hasEvidence(profile.jobPostingProcedureRef),
      postingApplies ? 'red' : 'green',
    ),
  );

  obligations.push(
    obligation(
      'recruiter-license-review',
      'Recruiter / temporary-help agency licence verification',
      'Recruiting',
      profile.usesRecruitersOrTempAgencies ? 'required' : 'not_applicable',
      profile.usesRecruitersOrTempAgencies
        ? 'Employers must not knowingly use unlicensed recruiters or temporary-help agencies where licensing rules apply.'
        : 'No recruiter/temporary-help-agency use is recorded.',
      'ON-ESA-RECRUITER-LICENSING',
      'recruiterLicenseReviewRef',
      hasEvidence(profile.recruiterLicenseReviewRef),
      profile.usesRecruitersOrTempAgencies ? 'red' : 'green',
    ),
  );

  const privateAoda = profile.orgType === 'private' || profile.orgType === 'nonprofit';
  const publicAoda = profile.orgType === 'public';
  const aodaReportApplies = publicAoda || (privateAoda && count >= 20);
  obligations.push(
    obligation(
      'aoda-report',
      'AODA accessibility compliance report',
      'Accessibility',
      profile.orgType === 'unknown' ? 'review_required' : aodaReportApplies ? 'required' : 'not_applicable',
      profile.orgType === 'unknown'
        ? 'Organization type is required to determine AODA reporting applicability.'
        : publicAoda
          ? 'Public-sector organizations have accessibility reporting obligations.'
          : count >= 20
            ? 'Business/non-profit has 20 or more Ontario employees.'
            : 'Private/non-profit profile is below the 20-employee reporting threshold.',
      'ON-AODA-REPORT-2026',
      'aodaComplianceReportRef',
      hasEvidence(profile.aodaComplianceReportRef),
      aodaReportApplies ? 'red' : 'amber',
      aodaReportApplies && privateAoda ? '2026-12-31' : undefined,
    ),
  );

  const multiYearPlanApplies = privateAoda && count >= 50;
  obligations.push(
    obligation(
      'aoda-plan',
      'Documented accessibility policies and multi-year plan',
      'Accessibility',
      profile.orgType === 'unknown' ? 'review_required' : multiYearPlanApplies ? 'required' : 'not_applicable',
      profile.orgType === 'unknown'
        ? 'Organization type is unresolved.'
        : multiYearPlanApplies
          ? 'Business/non-profit has 50 or more Ontario employees.'
          : 'Current private/non-profit size does not trigger this specific 50+ foundation.',
      'ON-AODA-BUSINESS',
      'accessibilityPlanRef',
      hasEvidence(profile.accessibilityPlanRef),
      multiYearPlanApplies ? 'red' : 'amber',
    ),
  );

  const hsrRequired = workers >= 6 && workers <= 19;
  const jhscRequired = workers >= 20;
  obligations.push(
    obligation(
      'ohsa-representation',
      hsrRequired ? 'Health and Safety Representative' : jhscRequired ? 'Joint Health and Safety Committee' : 'OHSA worker representation',
      'Health and safety',
      hsrRequired || jhscRequired ? 'required' : workers === 0 ? 'review_required' : 'not_applicable',
      hsrRequired
        ? 'Most Ontario workplaces with 6–19 workers require an HSR.'
        : jhscRequired
          ? workers >= 50
            ? 'Most workplaces with 50+ workers require a JHSC with at least four members.'
            : 'Most workplaces with 20–49 workers require a JHSC with at least two members.'
          : workers === 0
            ? 'Workplace worker count is required to determine HSR/JHSC applicability.'
            : 'Current worker count is below the general HSR/JHSC threshold; designated-substance and special rules still require review.',
      'ON-OHSA-CAMPAIGN-2026',
      'hsrOrJhscRef',
      hasEvidence(profile.hsrOrJhscRef),
      hsrRequired || jhscRequired ? 'red' : 'amber',
    ),
  );

  const payEquityApplies =
    profile.orgType === 'public' ||
    ((profile.orgType === 'private' || profile.orgType === 'nonprofit') && count >= 10);
  obligations.push(
    obligation(
      'pay-equity',
      'Ontario Pay Equity Act applicability / maintenance review',
      'Pay equity',
      profile.orgType === 'unknown' ? 'review_required' : payEquityApplies ? 'required' : 'not_applicable',
      profile.orgType === 'unknown'
        ? 'Organization type is unresolved.'
        : payEquityApplies
          ? 'Current profile meets the general Ontario Pay Equity Act employer-size/type foundation.'
          : 'Current profile is below the general private-sector 10-employee threshold.',
      'ON-PAY-EQUITY-ACT',
      'payEquityReviewRef',
      hasEvidence(profile.payEquityReviewRef),
      payEquityApplies ? 'red' : 'amber',
    ),
  );

  obligations.push(
    obligation(
      'wsib',
      'WSIB coverage / classification review',
      'Workers compensation',
      'review_required',
      'WSIB coverage and classification depend on industry, activity and worker status and must be confirmed.',
      'ON-WSIB-REGISTRATION',
      'wsibCoverageReviewRef',
      hasEvidence(profile.wsibCoverageReviewRef),
      'amber',
    ),
  );

  obligations.push(
    obligation(
      'eht',
      'Employer Health Tax applicability / exemption review',
      'Employer tax',
      'review_required',
      profile.ehtEligibleEmployerReviewed
        ? profile.ehtEligibleEmployer
          ? 'Employer eligibility has been human-reviewed; validate Ontario remuneration, associated employers and exemption allocation.'
          : 'Human review indicates the employer is not eligible for the general exemption; EHT liability still requires tax review.'
        : 'EHT employer eligibility, Ontario remuneration and associated-employer facts require human review.',
      'ON-EHT-2026',
      'ehtReviewRef',
      hasEvidence(profile.ehtReviewRef),
      'amber',
    ),
  );

  if (profile.unionizedWorkplace) {
    obligations.push(
      obligation(
        'collective-agreement',
        'Collective agreement / ESA interaction review',
        'Labour relations',
        'required',
        'Unionized workplace recorded; collective-agreement terms and statutory interaction must be reviewed before automated conclusions.',
        'ON-ESA-GUIDE',
        'collectiveAgreementReviewRef',
        hasEvidence(profile.collectiveAgreementReviewRef),
        'red',
      ),
    );
  }

  obligations.push(
    obligation(
      'special-rules',
      'ESA special rules / exemptions review',
      'Applicability',
      'required',
      'Industry, occupation and employee-status special rules can change ESA entitlements and must be reviewed.',
      'ON-ESA-GUIDE',
      'specialRulesReviewRef',
      profile.specialRulesOrExemptionsReviewed && hasEvidence(profile.specialRulesReviewRef),
      'red',
    ),
  );

  const actionable = obligations.filter((item) => item.applicability !== 'not_applicable');
  const completed = actionable.filter((item) => item.state === 'complete').length;
  const readinessPercent = actionable.length ? Math.round((completed / actionable.length) * 100) : 100;

  const openRed = obligations.filter((item) => item.state !== 'complete' && item.severity === 'red');
  const openAmber = obligations.filter((item) => item.state !== 'complete' && item.severity === 'amber');

  return {
    certification: 'NOT_CERTIFIED' as const,
    liveEffect: 'NONE' as const,
    readinessPercent,
    completedObligations: completed,
    actionableObligations: actionable.length,
    openRed: openRed.length,
    openAmber: openAmber.length,
    obligations,
    sourceFreshness: ONTARIO_INTELLIGENCE_SOURCES.map((source) => ({
      ...source,
      status: source.observedAt === '2026-09-12' ? 'CURRENT_BASELINE' as const : 'REVIEW' as const,
    })),
    changeCalendar: ONTARIO_CHANGE_CALENDAR,
    leaveCatalogue: ONTARIO_LEAVE_CATALOGUE,
    minimumWageSchedule: ONTARIO_MINIMUM_WAGE_SCHEDULE,
    hoursRestFoundation: ONTARIO_HOURS_REST_FOUNDATION,
    recruiting2026: ONTARIO_RECRUITING_2026_FOUNDATION,
    ehtFoundation: ONTARIO_EHT_FOUNDATION,
    blockers: [
      ...openRed.map((item) => item.label),
      ...(profile.orgType === 'unknown' ? ['Organization type is unresolved.'] : []),
    ],
    warnings: [
      'Readiness scoring is implementation/evidence readiness only; it is not legal certification.',
      'No Ontario readiness action can post payroll, change leave balances, decide termination, file a government return or change employee rights.',
      'Independent Ontario legal/payroll review remains required before any certification state can change.',
    ],
  };
}