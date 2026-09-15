import type { WorkerCompensationRecord } from '@/domain/compensation';

export type CompensationPayrollSyncState =
  | 'not_applicable'
  | 'missing_sync_evidence'
  | 'stale_compensation_record'
  | 'payroll_review_required'
  | 'reviewed';

export interface CompensationPayrollSyncEvaluation {
  state: CompensationPayrollSyncState;
  label: string;
  requiresAttention: boolean;
  reason: string;
}

const REVIEWED_STATES = new Set(['reviewed', 'profile_reviewed', 'synced']);

export function compensationPayrollSyncLabel(state: CompensationPayrollSyncState) {
  const labels: Record<CompensationPayrollSyncState, string> = {
    not_applicable: 'Not Applicable',
    missing_sync_evidence: 'Missing Sync Evidence',
    stale_compensation_record: 'Stale Compensation Record',
    payroll_review_required: 'Payroll Review Required',
    reviewed: 'Reviewed',
  };
  return labels[state];
}

function result(
  state: CompensationPayrollSyncState,
  requiresAttention: boolean,
  reason: string,
): CompensationPayrollSyncEvaluation {
  return { state, label: compensationPayrollSyncLabel(state), requiresAttention, reason };
}

export function evaluateCompensationPayrollSync(
  compensation?: Pick<WorkerCompensationRecord, 'id'>,
  sync?: { compensationRecordId?: string; status?: string } | null,
): CompensationPayrollSyncEvaluation {
  if (!compensation) {
    return result(
      'not_applicable',
      false,
      'No current compensation record exists, so synchronization cannot yet be reviewed.',
    );
  }

  if (!sync) {
    return result(
      'missing_sync_evidence',
      true,
      'Current compensation exists but no Compensation → Payroll synchronization evidence exists.',
    );
  }

  if (!sync.compensationRecordId || sync.compensationRecordId !== compensation.id) {
    return result(
      'stale_compensation_record',
      true,
      'Synchronization evidence does not reference the current compensation record.',
    );
  }

  if (!REVIEWED_STATES.has(String(sync.status || ''))) {
    return result(
      'payroll_review_required',
      true,
      'Current compensation is linked, but authorized Payroll/Compensation review is still required.',
    );
  }

  return result(
    'reviewed',
    false,
    'Current compensation and synchronization evidence are aligned and human-reviewed.',
  );
}