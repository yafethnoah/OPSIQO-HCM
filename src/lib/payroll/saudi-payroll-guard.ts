import type { ActorContext } from '@/domain/security';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { normalizeStoredCompensation } from '@/lib/compensation/pay-normalization';
import {
  previewSaudiContributions,
  type SaudiSocialInsuranceRegime,
  type SaudiSanedApplicability,
} from '@/lib/strategic/saudi-country-pack';
import { describeWorkerPayDateRule } from './pay-date';

export interface SaudiPayrollGuardEvidence {
  id: 'current';
  legalReviewRef?: string;
  payrollValidationRef?: string;
  goldenPayrollEvidenceRef?: string;
  arabicRtlQaEvidenceRef?: string;
  wpsReadinessEvidenceRef?: string;
  governmentConnectorCertificationRef?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SaudiWorkerPayrollReview {
  workerId: string;
  saudiNationalConfirmed: boolean;
  regime: SaudiSocialInsuranceRegime;
  sanedApplicable: SaudiSanedApplicability;
  contributoryWageSar: number;
  note?: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface SaudiPayrollGuardSource {
  id: string;
  authority: 'HRSD';
  title: string;
  url: string;
  observedAt: string;
  note: string;
}

export const SAUDI_PAYROLL_GUARD_SOURCES: readonly SaudiPayrollGuardSource[] = [
  {
    id: 'HRSD-WPS-OVERVIEW',
    authority: 'HRSD',
    title: 'Wage Protection System overview',
    url: 'https://www.hrsd.gov.sa/en/care-about-you/social-protection',
    observedAt: '2026-09-12',
    note: 'Official HRSD WPS overview, including wage-payment frequency concepts and private-sector coverage.',
  },
  {
    id: 'HRSD-WPS-UPLOAD',
    authority: 'HRSD',
    title: 'Uploading the Wage Protection file',
    url: 'https://www.hrsd.gov.sa/en/ministry-services/services/%D8%B1%D9%81%D8%B9-%D9%85%D9%84%D9%81-%D8%AD%D9%85%D8%A7%D9%8A%D8%A9-%D8%A7%D9%84%D8%A3%D8%AC%D9%88%D8%B1',
    observedAt: '2026-09-12',
    note: 'Official HRSD service states wage-protection files are uploaded through the Compliance System in Mudad. H51.42 does not generate or submit a WPS file.',
  },
  {
    id: 'HRSD-WPS-CERTIFICATE',
    authority: 'HRSD',
    title: 'Issue Wage Protection Certificate',
    url: 'https://www.hrsd.gov.sa/en/ministry-services/services/%D8%A3%D8%B5%D8%AF%D8%A7%D8%B1-%D8%B4%D9%87%D8%A7%D8%AF%D8%A9-%D8%AD%D9%85%D8%A7%D9%8A%D8%A9-%D8%A7%D9%84%D8%A3%D8%AC%D9%88%D8%B1',
    observedAt: '2026-09-12',
    note: 'Official HRSD service for wage-protection compliance certificates. Evidence may be referenced in OPSIQO, but OPSIQO does not issue the government certificate.',
  },
  {
    id: 'HRSD-QIWA-WAGE-CLAUSE',
    authority: 'HRSD',
    title: 'Certified employment-contract wage clause as executive instrument',
    url: 'https://www.hrsd.gov.sa/en/media-center/news/%D8%A8%D9%86%D8%AF-%D8%A7%D9%84%D8%A3%D8%AC%D8%B1-%D9%81%D9%8A-%D8%B9%D9%82%D8%AF-%D8%A7%D9%84%D8%B9%D9%85%D9%84-%D8%A7%D9%84%D9%85%D9%88%D8%AB%D9%82-%D8%B3%D9%86%D8%AF%D9%8B%D8%A7-%D8%AA%D9%86%D9%81%D9%8A%D8%B0%D9%8A%D9%8B%D8%A7-%D9%84%D8%AA%D8%B3%D8%B1%D9%8A%D8%B9-%D8%A7%D9%84%D9%81%D8%B5%D9%84-%D9%81%D9%8A-%D8%A7%D9%84%D9%85%D9%86%D8%A7%D8%B2%D8%B9%D8%A7%D8%AA-%D8%A7%D9%84%D8%B9%D9%85%D8%A7%D9%84%D9%8A%D8%A9',
    observedAt: '2026-09-12',
    note: 'Official HRSD provenance for the Qiwa/Mudad/Najiz wage-clause enforcement integration. H51.42 stores readiness evidence only and performs no government action.',
  },
] as const;

export const SAUDI_PAYROLL_RELEASE_POLICY = {
  actionClass: 'red' as const,
  aiReleaseAllowed: false as const,
  authorizedHumanReleaseRequired: true as const,
  productionReleaseEnabled: false as const,
  governmentSubmissionEnabled: false as const,
  reason: 'Saudi payroll release and government submission remain blocked until a later independently certified production release.',
};

export const SAUDI_GOLDEN_PAYROLL_CASES = [
  {
    id: 'SA-GOLDEN-NEW-2026-10K',
    label: 'New-system 2026 · SAR 10,000 · SANED applicable',
    input: {
      saudiNationalConfirmed: true,
      regime: 'new_1445_no_prior_subscription' as const,
      contributionDate: '2026-09-11',
      contributoryWageSar: 10000,
      sanedApplicable: 'yes' as const,
    },
    expected: { wageUsedSar: 10000, employeeTotalSar: 1075, employerTotalSar: 1275, combinedTotalSar: 2350 },
  },
  {
    id: 'SA-GOLDEN-NEW-2026-CAP',
    label: 'New-system 2026 · SAR 60,000 input · SAR 45,000 cap',
    input: {
      saudiNationalConfirmed: true,
      regime: 'new_1445_no_prior_subscription' as const,
      contributionDate: '2026-09-11',
      contributoryWageSar: 60000,
      sanedApplicable: 'yes' as const,
    },
    expected: { wageUsedSar: 45000, employeeTotalSar: 4837.5, employerTotalSar: 5737.5, combinedTotalSar: 10575 },
  },
  {
    id: 'SA-GOLDEN-EXISTING-10K',
    label: 'Existing unaffected category · SAR 10,000 · SANED applicable',
    input: {
      saudiNationalConfirmed: true,
      regime: 'existing_unaffected' as const,
      contributionDate: '2026-09-11',
      contributoryWageSar: 10000,
      sanedApplicable: 'yes' as const,
    },
    expected: { wageUsedSar: 10000, employeeTotalSar: 975, employerTotalSar: 1175, combinedTotalSar: 2150 },
  },
] as const;

const evidenceFields: Array<[keyof SaudiPayrollGuardEvidence, string]> = [
  ['legalReviewRef', 'Independent Saudi legal/compliance review evidence is missing.'],
  ['payrollValidationRef', 'Independent Saudi payroll validation evidence is missing.'],
  ['goldenPayrollEvidenceRef', 'Approved golden-payroll evidence is missing.'],
  ['arabicRtlQaEvidenceRef', 'Arabic/RTL critical payroll-review QA evidence is missing.'],
  ['wpsReadinessEvidenceRef', 'WPS readiness/compliance evidence is missing.'],
  ['governmentConnectorCertificationRef', 'Government connector certification evidence is missing.'],
];

const now = () => new Date().toISOString();

function nonBlank(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function saudiPayrollEvidenceIssues(evidence: SaudiPayrollGuardEvidence): string[] {
  return evidenceFields
    .filter(([field]) => !nonBlank(evidence[field]))
    .map(([, message]) => message);
}

export function validateSaudiGoldenCases() {
  return SAUDI_GOLDEN_PAYROLL_CASES.map((testCase) => {
    const result = previewSaudiContributions(testCase.input);
    const actual = result.amounts
      ? {
          wageUsedSar: result.contributoryWageUsedSar,
          employeeTotalSar: result.amounts.employeeTotalSar,
          employerTotalSar: result.amounts.employerTotalSar,
          combinedTotalSar: result.amounts.combinedTotalSar,
        }
      : null;
    const pass = Boolean(
      actual &&
      actual.wageUsedSar === testCase.expected.wageUsedSar &&
      actual.employeeTotalSar === testCase.expected.employeeTotalSar &&
      actual.employerTotalSar === testCase.expected.employerTotalSar &&
      actual.combinedTotalSar === testCase.expected.combinedTotalSar,
    );
    return {
      id: testCase.id,
      label: testCase.label,
      expected: testCase.expected,
      actual,
      pass,
      approvalState: 'FOUNDATION_UNAPPROVED' as const,
    };
  });
}

export interface SaudiWorkerGuardInput {
  workerId: string;
  displayName: string;
  employeeNumber?: string;
  compensation?: {
    id: string;
    currency: string;
    payBasis?: string;
    basePay?: number;
    annualizedBasePay?: number;
    hourlyRate?: number;
    monthlyPay?: number;
    annualPay?: number;
  };
  profile?: {
    enabled?: boolean;
    payPeriodsPerYear?: number;
    payDateRule?: string;
    payDateOffsetDays?: number;
    payDayOfMonth?: number;
    weekendAdjustment?: string;
  };
  review?: SaudiWorkerPayrollReview;
}

export function assessSaudiWorkerPayrollGuard(input: SaudiWorkerGuardInput) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const review = input.review;

  if (!input.compensation) blockers.push('Current compensation is missing.');
  if (input.compensation && input.compensation.currency !== 'SAR') {
    blockers.push('Saudi Payroll Guard requires SAR compensation context for this worker.');
  }
  if (!input.profile) blockers.push('Payroll profile is missing.');
  if (input.profile && !input.profile.enabled) blockers.push('Payroll profile is disabled.');
  if (input.profile && !input.profile.payPeriodsPerYear) blockers.push('Pay frequency is missing.');
  if (!review) blockers.push('Saudi worker payroll review has not been completed.');

  let contributionPreview: ReturnType<typeof previewSaudiContributions> | undefined;
  if (review) {
    contributionPreview = previewSaudiContributions({
      saudiNationalConfirmed: review.saudiNationalConfirmed,
      regime: review.regime,
      contributionDate: new Date().toISOString().slice(0, 10),
      contributoryWageSar: review.contributoryWageSar,
      sanedApplicable: review.sanedApplicable,
    });
    blockers.push(...contributionPreview.blockers);
    warnings.push(...contributionPreview.warnings);
  }

  const workerInputsReady = blockers.length === 0;
  return {
    workerId: input.workerId,
    displayName: input.displayName,
    employeeNumber: input.employeeNumber,
    scope: review ? 'SAUDI_REVIEWED' as const : 'NOT_ASSESSED' as const,
    workerInputsReady,
    productionReady: false as const,
    releaseAllowed: false as const,
    governmentSubmissionAllowed: false as const,
    actionClass: 'red' as const,
    blockers,
    warnings,
    contributionPreview,
    releaseRule: describeWorkerPayDateRule(input.profile as any),
    compensation: input.compensation,
    review,
  };
}

async function all<T>(path: string, limit = 4000) {
  const snap = await adminDb().collection(path).limit(limit).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
}

function requireRead(actor: ActorContext) {
  if (!actor.permissions.includes('payroll.read')) {
    throw new ApiError(403, 'Payroll read permission required.', 'forbidden');
  }
}

function requireManage(actor: ActorContext) {
  if (!actor.permissions.includes('payroll.provider.manage')) {
    throw new ApiError(403, 'Payroll provider management permission required.', 'forbidden');
  }
}

export async function getSaudiPayrollGuard(actor: ActorContext) {
  requireRead(actor);
  const base = `organizations/${actor.orgId}`;
  const [workers, profiles, compensation, reviews, evidenceSnap] = await Promise.all([
    all<any>(`${base}/workers`),
    all<any>(`${base}/payrollWorkerProfiles`),
    all<any>(`${base}/workerCompensationCurrent`),
    all<SaudiWorkerPayrollReview>(`${base}/saudiPayrollWorkerReviews`),
    adminDb().doc(`${base}/saudiPayrollGuardEvidence/current`).get(),
  ]);

  const profileMap = new Map(profiles.map((row) => [row.workerId, row]));
  const compensationMap = new Map(compensation.map((row) => [row.workerId, row]));
  const reviewMap = new Map(reviews.map((row) => [row.workerId, row]));
  const evidence: SaudiPayrollGuardEvidence = evidenceSnap.exists
    ? ({ id: 'current', ...evidenceSnap.data() } as SaudiPayrollGuardEvidence)
    : { id: 'current' };

  const rows = workers
    .filter((worker) => worker.status === 'active' || worker.status === 'leave')
    .map((worker) => {
      const comp = compensationMap.get(worker.id);
      const normalized = comp ? normalizeStoredCompensation(comp) : undefined;
      return assessSaudiWorkerPayrollGuard({
        workerId: worker.id,
        displayName: worker.displayName || worker.id,
        employeeNumber: worker.employeeNumber,
        compensation: comp
          ? {
              id: comp.id,
              currency: comp.currency,
              payBasis: comp.payBasis,
              basePay: comp.basePay,
              annualizedBasePay: comp.annualizedBasePay,
              hourlyRate: normalized?.hourlyRate,
              monthlyPay: normalized?.monthlyPay,
              annualPay: normalized?.annualPay,
            }
          : undefined,
        profile: profileMap.get(worker.id),
        review: reviewMap.get(worker.id),
      });
    });

  const evidenceIssues = saudiPayrollEvidenceIssues(evidence);
  const reviewedWorkers = rows.filter((row) => row.scope === 'SAUDI_REVIEWED');
  const readyReviewedWorkers = reviewedWorkers.filter((row) => row.workerInputsReady);

  return {
    version: 'H51.42-0.1.0',
    certification: 'NOT_CERTIFIED' as const,
    productionReadiness: 'BLOCKED' as const,
    productionReleaseEnabled: false as const,
    governmentSubmissionEnabled: false as const,
    aiPayrollReleaseAllowed: false as const,
    canManage: actor.permissions.includes('payroll.provider.manage'),
    evidence,
    evidenceIssues,
    evidenceComplete: evidenceFields.length - evidenceIssues.length,
    evidenceRequired: evidenceFields.length,
    reviewedWorkers: reviewedWorkers.length,
    readyReviewedWorkers: readyReviewedWorkers.length,
    workers: rows,
    sources: SAUDI_PAYROLL_GUARD_SOURCES,
    releasePolicy: SAUDI_PAYROLL_RELEASE_POLICY,
    goldenCases: validateSaudiGoldenCases(),
    arabicStatusPreview: {
      direction: 'rtl',
      notCertified: 'غير معتمد',
      payrollReleaseBlocked: 'إصدار الرواتب محظور',
      governmentSubmissionDisabled: 'الإرسال الحكومي معطل',
      humanReviewRequired: 'تتطلب مراجعة بشرية مخولة',
    },
    generatedAt: now(),
  };
}

export async function saveSaudiPayrollGuardEvidence(actor: ActorContext, raw: unknown) {
  requireManage(actor);
  const input = (raw || {}) as Record<string, unknown>;
  const beforeRef = adminDb().doc(`organizations/${actor.orgId}/saudiPayrollGuardEvidence/current`);
  const beforeSnap = await beforeRef.get();
  const before = beforeSnap.data();
  const after: SaudiPayrollGuardEvidence = {
    id: 'current',
    legalReviewRef: String(input.legalReviewRef || '').trim(),
    payrollValidationRef: String(input.payrollValidationRef || '').trim(),
    goldenPayrollEvidenceRef: String(input.goldenPayrollEvidenceRef || '').trim(),
    arabicRtlQaEvidenceRef: String(input.arabicRtlQaEvidenceRef || '').trim(),
    wpsReadinessEvidenceRef: String(input.wpsReadinessEvidenceRef || '').trim(),
    governmentConnectorCertificationRef: String(input.governmentConnectorCertificationRef || '').trim(),
    updatedBy: actor.uid,
    updatedAt: now(),
  };
  await beforeRef.set(after);
  const audit = buildAudit(actor, {
    action: 'payroll.saudi_guard.evidence.save',
    entityType: 'saudiPayrollGuardEvidence',
    entityId: 'current',
    before,
    after,
  });
  await adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);
  return after;
}

export async function saveSaudiWorkerPayrollReview(actor: ActorContext, workerId: string, raw: unknown) {
  requireManage(actor);
  const input = (raw || {}) as Record<string, unknown>;
  const workerRef = adminDb().doc(`organizations/${actor.orgId}/workers/${workerId}`);
  const workerSnap = await workerRef.get();
  if (!workerSnap.exists) throw new ApiError(404, 'Worker not found.', 'worker_not_found');

  const regime = String(input.regime || 'requires_review') as SaudiSocialInsuranceRegime;
  const sanedApplicable = String(input.sanedApplicable || 'requires_review') as SaudiSanedApplicability;
  if (!['new_1445_no_prior_subscription', 'existing_unaffected', 'requires_review'].includes(regime)) {
    throw new ApiError(400, 'Invalid Saudi GOSI regime.', 'invalid_saudi_gosi_regime');
  }
  if (!['yes', 'no', 'requires_review'].includes(sanedApplicable)) {
    throw new ApiError(400, 'Invalid SANED applicability.', 'invalid_saudi_saned_applicability');
  }

  const contributoryWageSar = Number(input.contributoryWageSar);
  if (!Number.isFinite(contributoryWageSar) || contributoryWageSar <= 0) {
    throw new ApiError(400, 'Contributory wage must be greater than zero.', 'invalid_contributory_wage');
  }

  const ref = adminDb().doc(`organizations/${actor.orgId}/saudiPayrollWorkerReviews/${workerId}`);
  const beforeSnap = await ref.get();
  const before = beforeSnap.data();
  const after: SaudiWorkerPayrollReview = {
    workerId,
    saudiNationalConfirmed: input.saudiNationalConfirmed === true,
    regime,
    sanedApplicable,
    contributoryWageSar,
    note: String(input.note || '').trim(),
    reviewedBy: actor.uid,
    reviewedAt: now(),
  };
  await ref.set(after);
  const audit = buildAudit(actor, {
    action: 'payroll.saudi_guard.worker_review.save',
    entityType: 'saudiPayrollWorkerReview',
    entityId: workerId,
    before,
    after,
  });
  await adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);
  return after;
}