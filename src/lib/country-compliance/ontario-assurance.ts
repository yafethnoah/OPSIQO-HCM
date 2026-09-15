import {
  assessOntarioComplianceReadiness,
  type OntarioComplianceProfile,
  type OntarioReadinessObligation,
} from '@/lib/country-compliance/ontario-readiness';

export type OntarioEvidenceReviewStatus = 'submitted' | 'approved' | 'rejected' | 'expired';
export type OntarioTaskStatus = 'open' | 'in_progress' | 'blocked' | 'complete' | 'closed_not_applicable';
export type OntarioTaskPriority = 'critical' | 'high' | 'medium';

export interface OntarioComplianceEvidence {
  id: string;
  obligationId: string;
  title: string;
  reference: string;
  status: OntarioEvidenceReviewStatus;
  validFrom?: string;
  reviewDueDate?: string;
  reviewNote?: string;
  reviewerUid?: string;
  reviewedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface OntarioComplianceTask {
  id: string;
  obligationId: string;
  label: string;
  owner: string;
  sourceId: string;
  nextAction: string;
  dueDate?: string;
  priority: OntarioTaskPriority;
  status: OntarioTaskStatus;
  completionReason?: 'approved_evidence' | 'not_applicable';
  note?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface OntarioEvidenceState {
  obligationId: string;
  state: 'approved' | 'pending_review' | 'rejected' | 'expired' | 'missing';
  evidenceId?: string;
  reviewDueDate?: string;
}

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const compareDate = (left: string, right: string) => parseDate(left) - parseDate(right);

export function evidenceOperationalStatus(
  evidence: OntarioComplianceEvidence,
  asOfDate: string,
): OntarioEvidenceReviewStatus {
  if (evidence.status === 'approved' && evidence.reviewDueDate && compareDate(evidence.reviewDueDate, asOfDate) < 0) {
    return 'expired';
  }
  if (evidence.status === 'approved' && evidence.validFrom && compareDate(asOfDate, evidence.validFrom) < 0) {
    return 'submitted';
  }
  return evidence.status;
}

export function evidenceStateForObligation(
  obligationId: string,
  evidence: readonly OntarioComplianceEvidence[],
  asOfDate: string,
): OntarioEvidenceState {
  const records = evidence
    .filter((item) => item.obligationId === obligationId)
    .map((item) => ({ item, operational: evidenceOperationalStatus(item, asOfDate) }))
    .sort((a, b) => b.item.updatedAt.localeCompare(a.item.updatedAt));

  const approved = records.find((entry) => entry.operational === 'approved');
  if (approved) {
    return {
      obligationId,
      state: 'approved',
      evidenceId: approved.item.id,
      reviewDueDate: approved.item.reviewDueDate,
    };
  }

  const pending = records.find((entry) => entry.operational === 'submitted');
  if (pending) {
    return {
      obligationId,
      state: 'pending_review',
      evidenceId: pending.item.id,
      reviewDueDate: pending.item.reviewDueDate,
    };
  }

  const expired = records.find((entry) => entry.operational === 'expired');
  if (expired) {
    return {
      obligationId,
      state: 'expired',
      evidenceId: expired.item.id,
      reviewDueDate: expired.item.reviewDueDate,
    };
  }

  const rejected = records.find((entry) => entry.operational === 'rejected');
  if (rejected) {
    return { obligationId, state: 'rejected', evidenceId: rejected.item.id };
  }

  return { obligationId, state: 'missing' };
}

function taskPriority(obligation: OntarioReadinessObligation): OntarioTaskPriority {
  if (obligation.operationalStatus === 'overdue') return 'critical';
  if (obligation.severity === 'red' || obligation.operationalStatus === 'due_soon') return 'high';
  return 'medium';
}

export function buildOntarioRemediationPlan(
  profile: OntarioComplianceProfile,
  evidence: readonly OntarioComplianceEvidence[],
  existingTasks: readonly OntarioComplianceTask[],
  asOfDate: string,
): OntarioComplianceTask[] {
  const assessment = assessOntarioComplianceReadiness(profile, asOfDate);
  const existing = new Map(existingTasks.map((task) => [task.obligationId, task]));

  return assessment.obligations.map((obligation) => {
    const evidenceState = evidenceStateForObligation(obligation.id, evidence, asOfDate);
    const previous = existing.get(obligation.id);

    let status: OntarioTaskStatus;
    let completionReason: OntarioComplianceTask['completionReason'] | undefined;

    if (obligation.applicability === 'not_applicable') {
      status = 'closed_not_applicable';
      completionReason = 'not_applicable';
    } else if (evidenceState.state === 'approved') {
      status = 'complete';
      completionReason = 'approved_evidence';
    } else if (previous && (previous.status === 'in_progress' || previous.status === 'blocked')) {
      status = previous.status;
    } else {
      status = 'open';
    }

    return {
      id: `ontario-${obligation.id}`,
      obligationId: obligation.id,
      label: obligation.label,
      owner: obligation.owner,
      sourceId: obligation.sourceId,
      nextAction: obligation.nextAction,
      dueDate: obligation.dueDate,
      priority: taskPriority(obligation),
      status,
      completionReason,
      note: previous?.note,
      createdBy: previous?.createdBy,
      createdAt: previous?.createdAt,
      updatedBy: previous?.updatedBy,
      updatedAt: previous?.updatedAt,
    };
  });
}

export function computeOntarioAssurance(
  profile: OntarioComplianceProfile,
  evidence: readonly OntarioComplianceEvidence[],
  tasks: readonly OntarioComplianceTask[],
  asOfDate: string,
) {
  const assessment = assessOntarioComplianceReadiness(profile, asOfDate);
  const actionable = assessment.obligations.filter((item) => item.applicability !== 'not_applicable');
  const evidenceStates = actionable.map((item) => evidenceStateForObligation(item.id, evidence, asOfDate));
  const approved = evidenceStates.filter((item) => item.state === 'approved').length;
  const pending = evidenceStates.filter((item) => item.state === 'pending_review').length;
  const expired = evidenceStates.filter((item) => item.state === 'expired').length;
  const rejected = evidenceStates.filter((item) => item.state === 'rejected').length;
  const missing = evidenceStates.filter((item) => item.state === 'missing').length;
  const assuranceReadinessPercent = actionable.length ? Math.round((approved / actionable.length) * 100) : 100;

  const openTasks = tasks.filter((task) => task.status === 'open' || task.status === 'in_progress' || task.status === 'blocked');
  const criticalTasks = openTasks.filter((task) => task.priority === 'critical');

  return {
    certification: 'NOT_CERTIFIED' as const,
    liveEffect: 'NONE' as const,
    assuranceReadinessPercent,
    actionableObligations: actionable.length,
    approvedEvidenceCount: approved,
    pendingEvidenceCount: pending,
    expiredEvidenceCount: expired,
    rejectedEvidenceCount: rejected,
    missingEvidenceCount: missing,
    openTaskCount: openTasks.length,
    criticalTaskCount: criticalTasks.length,
    evidenceStates,
    warnings: [
      'Assurance readiness counts only current evidence explicitly approved by an authorized human reviewer.',
      'A document reference or uploaded evidence does not complete an obligation until it is reviewed and approved.',
      'Approved evidence and completed remediation tasks do not constitute legal certification.',
      'This module cannot post payroll, alter leave balances, make recruiting or termination decisions, or submit government filings.',
    ],
  };
}