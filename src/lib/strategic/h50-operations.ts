import type { EvidenceRef, StrategicRiskTier } from './types';
import {
  generateHrProcessDraft,
  type GeneratedHrProcessDraft,
} from './hr-process-generator';

export interface H50FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'checkbox' | 'attachment';
  required: boolean;
}

export interface H50GeneratedRule {
  id: string;
  description: string;
  when: string;
  then: string;
  riskTier: StrategicRiskTier;
}

export interface H50GeneratedApproval {
  id: string;
  role: string;
  independent: boolean;
  requiredForRiskTier: StrategicRiskTier;
}

export interface H50GeneratedSla {
  acknowledgementHours: number;
  targetResolutionHours: number;
  escalationHours: number;
}

export interface H50GeneratedNotification {
  event: string;
  audience: string[];
  channel: 'in_app' | 'email' | 'task';
}

export interface H50ProcessPackage {
  packageId: string;
  prompt: string;
  draft: GeneratedHrProcessDraft;
  form: {
    title: string;
    fields: H50FormField[];
  };
  rules: H50GeneratedRule[];
  approvals: H50GeneratedApproval[];
  sla: H50GeneratedSla;
  notifications: H50GeneratedNotification[];
  evidenceRequirements: string[];
  dashboard: {
    widgets: string[];
  };
  reporting: {
    metrics: string[];
  };
  simulationScenarios: string[];
  lifecycle: H50ProcessLifecycleState;
  lifecycleEvidence: EvidenceRef[];
  rollbackAvailable: boolean;
}

export type H50ProcessLifecycleState =
  | 'draft'
  | 'simulated'
  | 'tested'
  | 'uat_reviewed'
  | 'approved'
  | 'promoted'
  | 'rolled_back';

export function buildH50ProcessPackage(prompt: string): H50ProcessPackage {
  const draft = generateHrProcessDraft(prompt);
  const fields = fieldsForProcess(draft.processKind);

  return {
    packageId: `h50:${slug(draft.processKind)}:${slug(prompt).slice(0, 48)}`,
    prompt,
    draft,
    form: {
      title: draft.name,
      fields,
    },
    rules: rulesForProcess(draft),
    approvals: approvalsForProcess(draft),
    sla: {
      acknowledgementHours: 4,
      targetResolutionHours: draft.maximumRiskTier === 'R6' ? 120 : 72,
      escalationHours: draft.maximumRiskTier === 'R6' ? 24 : 48,
    },
    notifications: [
      {
        event: 'submitted',
        audience: ['requester', 'process-owner'],
        channel: 'in_app',
      },
      {
        event: 'approval_required',
        audience: ['approver'],
        channel: 'task',
      },
      {
        event: 'completed',
        audience: ['requester', 'process-owner'],
        channel: 'in_app',
      },
    ],
    evidenceRequirements: [
      'request source',
      'permission decision',
      'risk assessment',
      'approval evidence when required',
      'execution receipt for authoritative steps',
    ],
    dashboard: {
      widgets: [
        'open items',
        'waiting approvals',
        'SLA risk',
        'exceptions',
        'completion trend',
      ],
    },
    reporting: {
      metrics: [
        'cycle time',
        'approval time',
        'exception rate',
        'human effort',
        'SLA attainment',
      ],
    },
    simulationScenarios: [
      'happy path',
      'permission denied',
      'approval rejected',
      'SLA escalation',
      'authoritative service unavailable',
    ],
    lifecycle: 'draft',
    lifecycleEvidence: [],
    rollbackAvailable: true,
  };
}

export function transitionH50ProcessPackage(
  current: H50ProcessPackage,
  input: {
    next: H50ProcessLifecycleState;
    evidenceRefs: EvidenceRef[];
    independentApprovalRecorded?: boolean;
    humanDecisionRecorded?: boolean;
    specialistReviewRecorded?: boolean;
    productionPromotionApproved?: boolean;
  },
): H50ProcessPackage {
  const expectedNext: Readonly<Record<H50ProcessLifecycleState, H50ProcessLifecycleState[]>> = {
    draft: ['simulated'],
    simulated: ['tested'],
    tested: ['uat_reviewed'],
    uat_reviewed: ['approved'],
    approved: ['promoted'],
    promoted: ['rolled_back'],
    rolled_back: [],
  };

  if (!expectedNext[current.lifecycle].includes(input.next)) {
    throw new Error(
      `invalid process lifecycle transition: ${current.lifecycle} -> ${input.next}`,
    );
  }

  if (input.evidenceRefs.length === 0) {
    throw new Error('process lifecycle transition requires evidence');
  }

  if (input.next === 'approved' && !input.independentApprovalRecorded) {
    throw new Error('independent approval is required');
  }

  if (input.next === 'promoted') {
    if (!input.productionPromotionApproved) {
      throw new Error('explicit production promotion approval is required');
    }

    if (
      (current.draft.maximumRiskTier === 'R5' ||
        current.draft.maximumRiskTier === 'R6') &&
      !input.humanDecisionRecorded
    ) {
      throw new Error('R5/R6 process promotion requires a recorded human decision');
    }

    if (
      current.draft.maximumRiskTier === 'R6' &&
      !input.specialistReviewRecorded
    ) {
      throw new Error('R6 process promotion requires specialist review');
    }
  }

  return {
    ...current,
    lifecycle: input.next,
    lifecycleEvidence: [
      ...current.lifecycleEvidence,
      ...input.evidenceRefs,
    ],
  };
}

export type H50OnboardingStepStatus =
  | 'planned'
  | 'waiting'
  | 'blocked'
  | 'completed';

export interface H50OnboardingOutcomeStep {
  id: string;
  label: string;
  riskTier: StrategicRiskTier;
  serviceHint: string;
  executionMode:
    | 'authoritative'
    | 'workflow_mediated'
    | 'human_checkpoint';
  dependsOn: string[];
  status: H50OnboardingStepStatus;
}

export interface H50OnboardingOutcomePlan {
  approvedHireEvidenceRef: string;
  directHiringDecisionMadeByAi: false;
  steps: H50OnboardingOutcomeStep[];
}

export function buildH50ApprovedHireOnboardingPlan(
  approvedHireEvidenceRef: string,
): H50OnboardingOutcomePlan {
  if (!approvedHireEvidenceRef.trim()) {
    throw new Error('approved-hire evidence is required');
  }

  const steps: H50OnboardingOutcomeStep[] = [
    {
      id: 'approved-hire',
      label: 'Verify recorded human hiring decision',
      riskTier: 'R5',
      serviceHint: 'governance.human_decision_evidence',
      executionMode: 'human_checkpoint',
      dependsOn: [],
      status: 'planned',
    },
    {
      id: 'employee-record',
      label: 'Create employee record',
      riskTier: 'R3',
      serviceHint: 'core_hr.create_employee',
      executionMode: 'authoritative',
      dependsOn: ['approved-hire'],
      status: 'waiting',
    },
    {
      id: 'assignment',
      label: 'Create assignment and position relationship',
      riskTier: 'R3',
      serviceHint: 'workflow.start',
      executionMode: 'workflow_mediated',
      dependsOn: ['employee-record'],
      status: 'waiting',
    },
    {
      id: 'onboarding-case',
      label: 'Create onboarding case',
      riskTier: 'R3',
      serviceHint: 'onboarding.create_prehire_case',
      executionMode: 'authoritative',
      dependsOn: ['employee-record'],
      status: 'waiting',
    },
    {
      id: 'manager-tasks',
      label: 'Create manager onboarding tasks',
      riskTier: 'R3',
      serviceHint: 'workflow.start',
      executionMode: 'workflow_mediated',
      dependsOn: ['onboarding-case'],
      status: 'waiting',
    },
    {
      id: 'equipment',
      label: 'Create IT/equipment request',
      riskTier: 'R3',
      serviceHint: 'workflow.start',
      executionMode: 'workflow_mediated',
      dependsOn: ['onboarding-case'],
      status: 'waiting',
    },
    {
      id: 'policy-ack',
      label: 'Create policy acknowledgement tasks',
      riskTier: 'R3',
      serviceHint: 'workflow.start',
      executionMode: 'workflow_mediated',
      dependsOn: ['onboarding-case'],
      status: 'waiting',
    },
    {
      id: 'learning',
      label: 'Assign mandatory learning',
      riskTier: 'R3',
      serviceHint: 'learning.assign',
      executionMode: 'authoritative',
      dependsOn: ['onboarding-case'],
      status: 'waiting',
    },
    {
      id: 'payroll-intake',
      label: 'Create payroll intake checklist',
      riskTier: 'R4',
      serviceHint: 'workflow.start',
      executionMode: 'workflow_mediated',
      dependsOn: ['employee-record'],
      status: 'waiting',
    },
    {
      id: 'benefits',
      label: 'Create benefits eligibility review',
      riskTier: 'R4',
      serviceHint: 'workflow.start',
      executionMode: 'workflow_mediated',
      dependsOn: ['employee-record'],
      status: 'waiting',
    },
    {
      id: 'followups',
      label: 'Schedule 30/60/90-day follow-ups',
      riskTier: 'R3',
      serviceHint: 'workflow.start',
      executionMode: 'workflow_mediated',
      dependsOn: ['onboarding-case'],
      status: 'waiting',
    },
  ];

  return {
    approvedHireEvidenceRef,
    directHiringDecisionMadeByAi: false,
    steps,
  };
}

export function h50OnboardingProgress(
  plan: H50OnboardingOutcomePlan,
): {
  completed: number;
  total: number;
  percent: number;
  blocked: string[];
  waiting: string[];
} {
  const completed = plan.steps.filter((step) => step.status === 'completed');
  const blocked = plan.steps.filter((step) => step.status === 'blocked');
  const waiting = plan.steps.filter((step) => step.status === 'waiting');

  return {
    completed: completed.length,
    total: plan.steps.length,
    percent:
      plan.steps.length === 0
        ? 0
        : (completed.length / plan.steps.length) * 100,
    blocked: blocked.map((step) => step.id),
    waiting: waiting.map((step) => step.id),
  };
}

export type H50ProactiveDetectionType =
  | 'overtime_threshold'
  | 'probation_review_overdue'
  | 'certification_expiring'
  | 'succession_gap'
  | 'recruiting_delay'
  | 'turnover_anomaly'
  | 'approval_overdue'
  | 'salary_compression'
  | 'policy_gap'
  | 'payroll_variance'
  | 'vacation_balance_excess';

export interface H50ProactiveFinding {
  id: string;
  orgId: string;
  type: H50ProactiveDetectionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskTier: StrategicRiskTier;
  evidenceRefs: EvidenceRef[];
  actionClass:
    | 'auto_resolvable'
    | 'approval_required'
    | 'specialist_review';
  usefulnessScore?: number;
  confirmedTruePositive?: boolean;
}

export function buildH50ProactiveFinding(input: Omit<
  H50ProactiveFinding,
  'actionClass'
>): H50ProactiveFinding {
  if (input.evidenceRefs.length === 0) {
    throw new Error('proactive finding requires evidence');
  }

  const actionClass =
    input.riskTier === 'R0' ||
    input.riskTier === 'R1' ||
    input.riskTier === 'R2' ||
    input.riskTier === 'R3'
      ? 'auto_resolvable'
      : input.riskTier === 'R4'
        ? 'approval_required'
        : 'specialist_review';

  return {
    ...input,
    actionClass,
  };
}

export interface H50QualityOfHireObservation {
  orgId: string;
  workerId: string;
  jobFamily: string;
  hiredAt: string;
  retainedDays: number;
  performanceRating?: number;
  managerQualityScore?: number;
  evidenceRefs: EvidenceRef[];
}

const protectedTraitPatterns = [
  'race',
  'ethnicity',
  'religion',
  'sex',
  'gender',
  'sexual',
  'disability',
  'age',
  'marital',
  'pregnancy',
  'citizenship',
];

export function validateH50QualityOfHireObservation(
  observation: H50QualityOfHireObservation,
): void {
  const keys = Object.keys(observation).map((key) => key.toLowerCase());

  if (
    keys.some((key) =>
      protectedTraitPatterns.some((pattern) => key.includes(pattern)),
    )
  ) {
    throw new Error('quality-of-hire data must not contain protected traits');
  }

  if (observation.evidenceRefs.length === 0) {
    throw new Error('quality-of-hire observation requires evidence');
  }
}

export function summarizeH50QualityOfHire(
  observations: H50QualityOfHireObservation[],
): {
  sampleSize: number;
  averageRetentionDays: number;
  averagePerformance?: number;
  automaticHiringDecisionPermitted: false;
} {
  if (observations.length < 5) {
    throw new Error('quality-of-hire analytics require a minimum sample of 5');
  }

  observations.forEach(validateH50QualityOfHireObservation);

  const averageRetentionDays =
    observations.reduce((sum, item) => sum + item.retainedDays, 0) /
    observations.length;

  const ratings = observations
    .map((item) => item.performanceRating)
    .filter((value): value is number => value !== undefined);

  return {
    sampleSize: observations.length,
    averageRetentionDays,
    averagePerformance:
      ratings.length === 0
        ? undefined
        : ratings.reduce((sum, value) => sum + value, 0) / ratings.length,
    automaticHiringDecisionPermitted: false,
  };
}

function fieldsForProcess(
  kind: GeneratedHrProcessDraft['processKind'],
): H50FormField[] {
  const base: H50FormField[] = [
    { id: 'requester', label: 'Requester', type: 'text', required: true },
    { id: 'reason', label: 'Business reason', type: 'textarea', required: true },
    { id: 'requested-date', label: 'Requested date', type: 'date', required: true },
    { id: 'evidence', label: 'Supporting evidence', type: 'attachment', required: false },
  ];

  if (kind === 'leave') {
    base.push(
      { id: 'start-date', label: 'Start date', type: 'date', required: true },
      { id: 'end-date', label: 'End date', type: 'date', required: true },
    );
  }

  if (kind === 'onboarding' || kind === 'recruiting') {
    base.push({
      id: 'position',
      label: 'Position',
      type: 'text',
      required: true,
    });
  }

  return base;
}

function rulesForProcess(
  draft: GeneratedHrProcessDraft,
): H50GeneratedRule[] {
  return [
    {
      id: 'permission',
      description: 'Required permission must be valid at planning and execution.',
      when: 'before plan and immediately before execution',
      then: 'recheck permission',
      riskTier: 'R3',
    },
    {
      id: 'risk',
      description: 'Risk tier governs execution authority.',
      when: `risk tier is ${draft.maximumRiskTier}`,
      then: 'apply R0-R6 control policy',
      riskTier: draft.maximumRiskTier,
    },
    {
      id: 'evidence',
      description: 'Material action requires evidence.',
      when: 'action is submitted',
      then: 'attach source/evidence references',
      riskTier: draft.maximumRiskTier,
    },
  ];
}

function approvalsForProcess(
  draft: GeneratedHrProcessDraft,
): H50GeneratedApproval[] {
  const approvals: H50GeneratedApproval[] = [
    {
      id: 'owner-review',
      role: 'process-owner',
      independent: false,
      requiredForRiskTier: 'R3',
    },
  ];

  if (
    draft.maximumRiskTier === 'R4' ||
    draft.maximumRiskTier === 'R5' ||
    draft.maximumRiskTier === 'R6'
  ) {
    approvals.push({
      id: 'independent-approval',
      role: 'independent-approver',
      independent: true,
      requiredForRiskTier: 'R4',
    });
  }

  if (draft.maximumRiskTier === 'R5' || draft.maximumRiskTier === 'R6') {
    approvals.push({
      id: 'human-decision',
      role: 'accountable-human',
      independent: true,
      requiredForRiskTier: 'R5',
    });
  }

  if (draft.maximumRiskTier === 'R6') {
    approvals.push({
      id: 'specialist-review',
      role: 'specialist-reviewer',
      independent: true,
      requiredForRiskTier: 'R6',
    });
  }

  return approvals;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'process';
}
