import type { WorkerCompensationRecord } from '@/domain/compensation';

export type CompensationPayrollSyncState =
  | 'not_applicable'
  | 'missing_sync_evidence'
  | 'stale_compensation_record'
  | 'payroll_review_required'
  | 'reviewed';

export interface CompensationPayrollSyncEvaluation {
  state: CompensationPayrollSyncState;
  requiresAttention: boolean;
  reason: string;
}

const REVIEWED_STATES = new Set(['reviewed', 'profile_reviewed', 'synced']);

export function evaluateCompensationPayrollSync(
  compensation?: Pick<WorkerCompensationRecord, 'id'>,
  sync?: { compensationRecordId?: string; status?: string } | null,
): CompensationPayrollSyncEvaluation {
  if (!compensation) {
    return {
      state: 'not_applicable',
      requiresAttention: false,
      reason: 'No current compensation record exists, so synchronization cannot yet be reviewed.',
    };
  }
  if (!sync) {
    return {
      state: 'missing_sync_evidence',
      requiresAttention: true,
      reason: 'Current compensation exists but no Compensation → Payroll synchronization evidence exists.',
    };
  }
  if (!sync.compensationRecordId || sync.compensationRecordId !== compensation.id) {
    return {
      state: 'stale_compensation_record',
      requiresAttention: true,
      reason: 'Synchronization evidence does not reference the current compensation record.',
    };
  }
  if (!REVIEWED_STATES.has(String(sync.status || ''))) {
    return {
      state: 'payroll_review_required',
      requiresAttention: true,
      reason: 'Current compensation is linked, but authorized Payroll/Compensation review is still required.',
    };
  }
  return {
    state: 'reviewed',
    requiresAttention: false,
    reason: 'Current compensation and synchronization evidence are aligned and human-reviewed.',
  };
}