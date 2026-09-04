export const WORKFLOW_TRIGGER_VALUES = [
  'manual',
  'employee.created',
  'employee.updated',
  'position.created',
  'position.updated',
  'requisition.created',
  'requisition.opened',
  'application.created',
  'application.stage_changed',
  'recruiting.ats_review_completed',
  'offer.accepted',
  'hire.completed',
  'onboarding.started',
  'onboarding.ready',
  'onboarding.activated',
  'onboarding.completed',
  'document.uploaded',
  'document.expiring',
  'policy.published',
  'policy.review_due',
  'policy.acknowledged',
  'policy.reattestation_started',
  'compliance.gap',
  'leave.requested',
  'leave.approved',
  'timesheet.submitted',
  'timesheet.approved',
  'time.exception',
  'time.shift.published',
  'time.shift.cancelled',
  'expense.submitted',
  'expense.manager_approved',
  'expense.finance_approved',
  'expense.rejected',
  'expense.paid',
  'expense.cancelled',
  'separation.requested',
  'separation.approved',
  'separation.ready',
  'separation.closed',
  'separation.task_overdue',
  'performance.cycle_started',
  'performance.review_submitted',
  'performance.calibrated',
  'performance.goal_completed',
  'performance.pip_started',
  'performance.pip_overdue',
  'learning.assigned',
  'learning.completed',
  'learning.skill_verified',
  'learning.certificate_expiring',
  'career.interest_created',
  'succession.nomination_confirmed',
  'succession.review_due',
  'compensation.changed',
  'compensation.cycle_opened',
  'compensation.cycle_applied',
  'compensation.pay_equity_review_due',
  'er.case_opened',
  'er.investigation_started',
  'er.finding_recorded',
  'er.action_overdue',
  'er.case_closed',
  'accommodation.review_due',
  'safety.incident_reported',
  'safety.investigation_started',
  'safety.hazard_reported',
  'safety.action_overdue',
  'safety.incident_closed',
  'experience.survey_published',
  'experience.survey_closed',
  'experience.feedback_submitted',
  'service.ticket_created',
  'service.ticket_sla_breached',
  'service.ticket_resolved',
  'recognition.sent',
  'workforce.plan_approved',
  'workforce.scenario_approved',
  'workforce.demand_due',
  'analytics.forecast_generated',
  'analytics.forecast_approved',
  'ai.recommendation_created',
  'ai.action_plan_approved',
  'diagnostic.finding_created',
  'diagnostic.assessment_approved',
  'diagnostic.remediation_overdue',
  'diagnostic.reassessment_due',
  'governance.source_review_due',
] as const;

export type WorkflowTrigger = typeof WORKFLOW_TRIGGER_VALUES[number];

const workflowTriggerLabel = (value: WorkflowTrigger) => {
  if (value === 'manual') return 'Manual';
  return value
    .replace('recruiting.ats', 'ATS')
    .replace('er.', 'Employee relations ')
    .replaceAll('.', ' ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const WORKFLOW_TRIGGER_OPTIONS = WORKFLOW_TRIGGER_VALUES.map((value) => ({ value, label: workflowTriggerLabel(value) }));


export type WorkflowConditionOperator = 'eq'|'neq'|'contains'|'in'|'exists'|'gt'|'gte'|'lt'|'lte';
export interface WorkflowCondition {
  field: string;
  operator: WorkflowConditionOperator;
  value?: string | number | boolean | string[];
}
export type WorkflowConditionMode = 'all'|'any';

export type WorkflowStepType = 'task' | 'approval' | 'notification';
export type WorkflowStepRunStatus = 'blocked' | 'ready' | 'in_progress' | 'completed' | 'rejected' | 'skipped' | 'failed';
export type WorkflowSlaStatus = 'on_track' | 'overdue' | 'escalated' | 'met' | 'completed_late';

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  ownerRole?: string;
  dueInDays?: number;
  dependsOn?: string[];
  escalationOwnerRole?: string;
  escalateAfterHours?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  conditions?: WorkflowCondition[];
  conditionMode?: WorkflowConditionMode;
  enabled: boolean;
  version: number;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowVersion: number;
  workflowName?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalSteps: number;
  completedSteps: number;
  stepsSnapshot: WorkflowStep[];
  entityType?: string;
  entityId?: string;
  sourceEventId?: string;
  dispatchKey?: string;
  startedBy: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WorkflowStepRun {
  id: string;
  runId: string;
  workflowStepId: string;
  name: string;
  type: WorkflowStepType;
  ownerRole?: string | null;
  dueInDays?: number | null;
  dueAt?: string | null;
  escalateAfterHours?: number | null;
  escalateAt?: string | null;
  escalationOwnerRole?: string | null;
  escalationCount?: number;
  escalatedAt?: string;
  slaStatus?: WorkflowSlaStatus;
  dependsOn: string[];
  status: WorkflowStepRunStatus;
  outcome?: 'approved' | 'rejected' | 'completed' | 'skipped';
  note?: string;
  actedBy?: string;
  actedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowEscalation {
  id: string;
  runId: string;
  stepRunId: string;
  workflowStepId: string;
  targetRole: string;
  level: number;
  reason: 'sla_overdue';
  createdAt: string;
}
