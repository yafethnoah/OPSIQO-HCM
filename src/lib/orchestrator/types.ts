export type OrchestrationRisk =
  | "read_only"
  | "administrative"
  | "high_impact_admin"
  | "consequential";

export type OrchestrationStepState =
  | "waiting"
  | "ready"
  | "awaiting_confirmation"
  | "executing"
  | "reconciliation_required"
  | "completed"
  | "blocked"
  | "failed"
  | "cancelled";

export type OrchestrationPlanState =
  | "draft"
  | "ready"
  | "executing"
  | "waiting_for_human"
  | "reconciliation_required"
  | "partially_completed"
  | "completed"
  | "blocked"
  | "cancelled";

export type StepExecutionOutcome =
  | "completed"
  | "blocked"
  | "failed_before_write"
  | "unknown_after_write"
  | "reconciliation_required";

export type OrchestrationActor = {
  uid: string;
  organizationId: string;
  roleClass: string;
};

export type StepReceipt = {
  planId: string;
  stepId: string;
  serviceKey: string;
  status:
    | "completed"
    | "blocked"
    | "failed"
    | "reconciliation_required";
  executedAtUtc: string;
  idempotencyKeyHash?: string;
  resultReference?: string;
  auditReference?: string;
  messageCode?: string;
};

export type OrchestrationStep = {
  id: string;
  title: string;
  dependencies: string[];
  authoritativeService: string;
  permission: string;
  riskClass: OrchestrationRisk;
  state: OrchestrationStepState;
  confirmationRequired: boolean;
  idempotencyRequired: boolean;
  humanCheckpoint?: boolean;
  optional?: boolean;
  evidenceRefs?: string[];
  payloadRef?: string;
  resultRef?: string;
  blockedReason?: string;
};

export type OrchestrationPlan = {
  planId: string;
  organizationId: string;
  actorUid: string;
  goalCode: string;
  state: OrchestrationPlanState;
  createdAtUtc: string;
  authorizationExpiresAtUtc: string;
  steps: OrchestrationStep[];
  evidenceRefs: string[];
  commandHash?: string;
  version: number;
};

export type PermissionChecker = (input: {
  actor: OrchestrationActor;
  permission: string;
  organizationId: string;
  step: OrchestrationStep;
}) => Promise<boolean>;

export type TenantScopeChecker = (input: {
  actor: OrchestrationActor;
  organizationId: string;
}) => Promise<boolean>;

export type ServiceExecutionContext = {
  plan: OrchestrationPlan;
  step: OrchestrationStep;
  actor: OrchestrationActor;
  idempotencyKey: string | null;
  simulateOnly: boolean;
};

export type ServiceExecutionResult = {
  outcome: StepExecutionOutcome;
  resultReference?: string;
  auditReference?: string;
  messageCode?: string;
};

export type AuthoritativeServiceBinding = {
  key: string;
  execute(context: ServiceExecutionContext): Promise<ServiceExecutionResult>;
  reconcile?(context: ServiceExecutionContext): Promise<ServiceExecutionResult>;
};

export type OrchestratorDependencies = {
  permissionChecker: PermissionChecker;
  tenantScopeChecker: TenantScopeChecker;
  services: ReadonlyMap<string, AuthoritativeServiceBinding>;
  now: () => Date;
};
