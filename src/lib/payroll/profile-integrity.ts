import type { PayrollWorkerProfile } from '@/domain/payroll';

export const REQUIRED_PAYROLL_PROFILE_REVIEW_FIELDS = [
  'province',
  'payPeriodsPerYear',
  'federalClaimAmount',
  'provincialClaimAmount',
  'additionalTax',
  'recurringTaxableBenefits',
  'recurringPreTaxDeductions',
  'recurringOtherDeductions',
  'paymentMethodRef',
  'payDateRule',
] as const;

export type PayrollProfileReviewedField =
  (typeof REQUIRED_PAYROLL_PROFILE_REVIEW_FIELDS)[number];

export function missingExplicitProfileInputFields(raw: unknown): PayrollProfileReviewedField[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [...REQUIRED_PAYROLL_PROFILE_REVIEW_FIELDS];
  }
  const row = raw as Record<string, unknown>;
  return REQUIRED_PAYROLL_PROFILE_REVIEW_FIELDS.filter(
    (field) => !Object.prototype.hasOwnProperty.call(row, field),
  );
}

export function missingPayrollProfileReviewFields(
  profile?: Partial<PayrollWorkerProfile> | null,
): PayrollProfileReviewedField[] {
  if (!profile) return [...REQUIRED_PAYROLL_PROFILE_REVIEW_FIELDS];
  const reviewed = new Set(profile.reviewedFields || []);
  return REQUIRED_PAYROLL_PROFILE_REVIEW_FIELDS.filter((field) => !reviewed.has(field));
}

export function payrollProfileExplicitlyReviewed(
  profile?: Partial<PayrollWorkerProfile> | null,
) {
  return missingPayrollProfileReviewFields(profile).length === 0;
}