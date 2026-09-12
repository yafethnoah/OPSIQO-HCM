import type { ActorContext } from '@/domain/security';
import type { Worker } from '@/domain/hr';
import type { WorkerCompensationRecord } from '@/domain/compensation';
import type { PayrollWorkerProfile } from '@/domain/payroll';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { normalizeStoredCompensation } from '@/lib/compensation/pay-normalization';
import { describeWorkerPayDateRule } from './pay-date';
import { preparePayrollProfileDrafts } from '@/lib/compensation/readiness';

async function all<T>(path: string, limit = 4000) {
  const s = await adminDb().collection(path).limit(limit).get();
  return s.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function getPayrollReadiness(a: ActorContext) {
  if (!a.permissions.includes('payroll.read')) {
    throw new ApiError(403, 'Payroll read permission required.', 'forbidden');
  }

  const base = `organizations/${a.orgId}`;
  const [workers, current, profiles, drafts, syncEvidence] = await Promise.all([
    all<Worker>(`${base}/workers`),
    all<WorkerCompensationRecord>(`${base}/workerCompensationCurrent`),
    all<PayrollWorkerProfile>(`${base}/payrollWorkerProfiles`),
    all<any>(`${base}/payrollProfileDrafts`),
    all<any>(`${base}/compensationPayrollSyncCurrent`),
  ]);

  const compMap = new Map(current.map((x) => [x.workerId, x]));
  const profileMap = new Map(profiles.map((x) => [x.workerId, x]));
  const draftMap = new Map(drafts.map((x) => [x.workerId, x]));
  const syncMap = new Map(syncEvidence.map((x) => [x.workerId || x.id, x]));

  const rows = workers
    .filter((w) => w.status === 'active' || w.status === 'leave')
    .map((w) => {
      const comp = compMap.get(w.id);
      const profile = profileMap.get(w.id);
      const draft = draftMap.get(w.id);
      const sync = syncMap.get(w.id);
      const issues: string[] = [];

      if (!comp) issues.push('Missing compensation');
      if (!profile) issues.push(draft ? 'Payroll profile draft requires review' : 'Missing payroll profile');
      if (profile && !profile.enabled) issues.push('Payroll profile disabled');
      if (profile && !profile.payPeriodsPerYear) issues.push('Pay frequency is missing');

      const rule = profile?.payDateRule || (profile?.payDayOfMonth ? 'fixed_day_of_month' : Number(profile?.payDateOffsetDays || 0) !== 0 ? 'offset_days' : 'run_default');
      const offset = Number(profile?.payDateOffsetDays || 0);
      if (rule === 'offset_days' && (!Number.isInteger(offset) || offset < -31 || offset > 31)) {
        issues.push('Invalid member release-date offset');
      }
      if (rule === 'fixed_day_of_month') {
        const day = Number(profile?.payDayOfMonth || 0);
        if (!Number.isInteger(day) || day < 1 || day > 31) {
          issues.push('Invalid fixed salary release day');
        }
      }

      const pay = comp ? normalizeStoredCompensation(comp) : undefined;

      return {
        workerId: w.id,
        displayName: w.displayName,
        employeeNumber: w.employeeNumber,
        hourlyRate: pay?.hourlyRate,
        monthlyPay: pay?.monthlyPay,
        annualPay: pay?.annualPay,
        currency: comp?.currency,
        issues,
        ready: issues.length === 0,
        draft: Boolean(draft),
        payDateRule: rule,
        payDateOffsetDays: offset,
        payDayOfMonth: profile?.payDayOfMonth,
        weekendAdjustment: profile?.weekendAdjustment || 'none',
        releaseRule: describeWorkerPayDateRule(profile),
        syncStatus: sync?.status,
        syncUpdatedAt: sync?.updatedAt,
        compensationRecordId: sync?.compensationRecordId,
      };
    });

  return {
    totalWorkers: rows.length,
    readyWorkers: rows.filter((x) => x.ready).length,
    missingCompensation: rows.filter((x) => x.issues.includes('Missing compensation')).length,
    missingProfiles: rows.filter((x) =>
      x.issues.some((i) => i.toLowerCase().includes('payroll profile')),
    ).length,
    draftProfiles: rows.filter((x) => x.draft).length,
    syncPending: rows.filter((x) => x.syncStatus === 'payroll_review_required').length,
    workers: rows,
    generatedAt: new Date().toISOString(),
  };
}

export async function preparePayrollReadinessDrafts(a: ActorContext) {
  if (!a.permissions.includes('payroll.provider.manage')) {
    throw new ApiError(403, 'Payroll provider management permission required.', 'forbidden');
  }
  return preparePayrollProfileDrafts(a);
}
