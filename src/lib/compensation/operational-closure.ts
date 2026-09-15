import type { ActorContext } from '@/domain/security';
import type { PayrollWorkerProfile } from '@/domain/payroll';
import type { WorkerCompensationRecord } from '@/domain/compensation';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { normalizeStoredCompensation } from '@/lib/compensation/pay-normalization';
import { evaluateCompensationPayrollSync } from '@/lib/compensation/payroll-sync-authority';
import {
  missingPayrollProfileReviewFields,
  payrollProfileExplicitlyReviewed,
} from '@/lib/payroll/profile-integrity';
import { resolveWorkerPayDate } from '@/lib/payroll/pay-date';

const now = () => new Date().toISOString();

function canRead(actor: ActorContext) {
  return (
    actor.permissions.includes('compensation.read') ||
    actor.permissions.includes('compensation.manage') ||
    actor.permissions.includes('compensation.approve') ||
    actor.permissions.includes('payroll.read')
  );
}

function canReview(actor: ActorContext) {
  return actor.permissions.includes('compensation.manage') || actor.permissions.includes('payroll.review');
}

export async function getCompensationPayrollSyncReview(actor: ActorContext, workerId: string) {
  if (!canRead(actor)) {
    throw new ApiError(403, 'Compensation or payroll read permission required.', 'forbidden');
  }

  const db = adminDb();
  const base = `organizations/${actor.orgId}`;
  const [workerSnap, compSnap, syncSnap, profileSnap] = await Promise.all([
    db.doc(`${base}/workers/${workerId}`).get(),
    db.doc(`${base}/workerCompensationCurrent/${workerId}`).get(),
    db.doc(`${base}/compensationPayrollSyncCurrent/${workerId}`).get(),
    db.doc(`${base}/payrollWorkerProfiles/${workerId}`).get(),
  ]);

  if (!compSnap.exists) {
    throw new ApiError(
      409,
      'Current compensation is required before synchronization can be reviewed.',
      'compensation_missing',
    );
  }

  const compensation = { id: compSnap.id, ...compSnap.data() } as WorkerCompensationRecord;
  const normalized = normalizeStoredCompensation(compensation);
  const sync = syncSnap.exists ? { id: syncSnap.id, ...(syncSnap.data() || {}) } as any : undefined;
  const profile = profileSnap.exists ? { id: profileSnap.id, ...(profileSnap.data() || {}) } as PayrollWorkerProfile : undefined;
  const evaluation = evaluateCompensationPayrollSync(compensation, sync);

  const numberMatch = (a: unknown, b: unknown) =>
    typeof a === 'number' &&
    typeof b === 'number' &&
    Math.abs(Number(a) - Number(b)) < 0.005;

  const comparisons = [
    {
      field: 'Compensation record',
      compensation: compensation.id,
      synchronization: sync?.compensationRecordId || 'missing',
      match: sync?.compensationRecordId === compensation.id,
    },
    {
      field: 'Currency',
      compensation: compensation.currency,
      synchronization: sync?.currency || 'missing',
      match: sync?.currency === compensation.currency,
    },
    {
      field: 'Hourly',
      compensation: normalized.hourlyRate,
      synchronization: sync?.hourlyRate,
      match: numberMatch(normalized.hourlyRate, sync?.hourlyRate),
    },
    {
      field: 'Monthly',
      compensation: normalized.monthlyPay,
      synchronization: sync?.monthlyPay,
      match: numberMatch(normalized.monthlyPay, sync?.monthlyPay),
    },
    {
      field: 'Annual',
      compensation: normalized.annualPay,
      synchronization: sync?.annualPay,
      match: numberMatch(normalized.annualPay, sync?.annualPay),
    },
  ];

  const firstAffectedPayrollDate = profile
    ? resolveWorkerPayDate(
        { payDate: compensation.effectiveDate, workerPayDates: undefined },
        profile,
        workerId,
      ).payDate
    : undefined;

  return {
    workerId,
    displayName: workerSnap.data()?.displayName || workerId,
    compensation: {
      recordId: compensation.id,
      effectiveDate: compensation.effectiveDate,
      currency: compensation.currency,
      payBasis: compensation.payBasis,
      hourlyRate: normalized.hourlyRate,
      monthlyPay: normalized.monthlyPay,
      annualPay: normalized.annualPay,
    },
    synchronization: sync
      ? {
          compensationRecordId: sync.compensationRecordId,
          status: sync.status,
          currency: sync.currency,
          hourlyRate: sync.hourlyRate,
          monthlyPay: sync.monthlyPay,
          annualPay: sync.annualPay,
          updatedAt: sync.updatedAt,
          reviewedBy: sync.reviewedBy,
          reviewedAt: sync.reviewedAt,
        }
      : undefined,
    payrollProfile: profile
      ? {
          enabled: profile.enabled,
          province: profile.province,
          payPeriodsPerYear: profile.payPeriodsPerYear,
          payDateRule: profile.payDateRule || 'run_default',
          paymentMethodConfigured: Boolean(profile.paymentMethodRef),
          explicitReviewComplete: payrollProfileExplicitlyReviewed(profile),
          missingReviewFields: missingPayrollProfileReviewFields(profile),
        }
      : undefined,
    firstAffectedPayrollDate,
    evaluation,
    comparisons,
    canConfirm:
      Boolean(profile?.enabled) &&
      payrollProfileExplicitlyReviewed(profile) &&
      Boolean(profile?.paymentMethodRef),
  };
}

export async function reviewCompensationPayrollSync(
  actor: ActorContext,
  workerId: string,
  note?: string,
) {
  if (!canReview(actor)) {
    throw new ApiError(
      403,
      'Compensation management or payroll review permission required.',
      'forbidden',
    );
  }

  const review = await getCompensationPayrollSyncReview(actor, workerId);
  if (!review.canConfirm) {
    throw new ApiError(
      409,
      'Payroll profile must be enabled, explicitly human-reviewed and have a payment-method reference before synchronization can be confirmed.',
      'payroll_profile_review_required',
    );
  }

  const db = adminDb();
  const base = `organizations/${actor.orgId}`;
  const syncRef = db.doc(`${base}/compensationPayrollSyncCurrent/${workerId}`);
  const syncSnap = await syncRef.get();
  const before = syncSnap.exists ? { id: syncSnap.id, ...(syncSnap.data() || {}) } : undefined;
  const timestamp = now();

  const after = {
    id: workerId,
    workerId,
    compensationRecordId: review.compensation.recordId,
    compensationEffectiveDate: review.compensation.effectiveDate,
    currency: review.compensation.currency,
    hourlyRate: review.compensation.hourlyRate,
    monthlyPay: review.compensation.monthlyPay,
    annualPay: review.compensation.annualPay,
    payrollProfileId: workerId,
    firstAffectedPayrollDate: review.firstAffectedPayrollDate,
    status: 'reviewed',
    source: 'human.compensation_payroll_sync_review',
    target: 'payrollWorkerProfiles',
    reviewNote: String(note || '').trim(),
    reviewedBy: actor.uid,
    reviewedAt: timestamp,
    updatedBy: actor.uid,
    updatedAt: timestamp,
  };

  await syncRef.set(after, { merge: true });

  const audit = buildAudit(actor, {
    action: 'compensation.payroll_sync.review',
    entityType: 'compensationPayrollSync',
    entityId: workerId,
    before,
    after,
  });
  await db.doc(`${base}/auditLogs/${audit.id}`).create(audit);

  return after;
}