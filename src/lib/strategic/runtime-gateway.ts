import {
  assertExecutionAllowed,
  mayAutonomouslyExecute,
  type GovernedActionPlan,
} from './agent-os';
import type {
  ActorRef,
  EvidenceRef,
  PermissionDecision,
  StrategicRiskTier,
} from './types';

export type RuntimeMutationKind = 'read' | 'create' | 'update';

export interface RuntimeActionTarget {
  objectType: string;
  objectId: string;
  mutationKind: RuntimeMutationKind;
  expectedVersion?: number;
  expectedEtag?: string;
}

export interface GovernedRuntimeRequest<TPayload = unknown> {
  plan: GovernedActionPlan;
  subjectOrgId: string;
  actor: ActorRef;
  target: RuntimeActionTarget;
  requiredPermission: string;
  reason: string;
  payload: TPayload;
  autonomous?: boolean;
  userConfirmed?: boolean;
  independentApproval?: boolean;
  humanDecisionRecorded?: boolean;
  specialistReviewRecorded?: boolean;
}

export interface CurrentAuthoritativeVersion {
  version: number;
  etag: string;
}

export interface PermissionRechecker {
  recheck(input: {
    orgId: string;
    actor: ActorRef;
    permission: string;
    action: string;
    objectType: string;
    objectId: string;
  }): Promise<readonly PermissionDecision[]>;
}

export interface ObjectVersionAuthority {
  resolve(input: {
    orgId: string;
    objectType: string;
    objectId: string;
  }): Promise<CurrentAuthoritativeVersion | null>;
}

export interface RuntimeClock {
  now(): string;
}

export interface GovernedServiceCapabilities {
  tenantScoped: true;
  idempotent: true;
  audit: true;
  domainEvents: true;
}

export interface AuthoritativeServiceCommand<TPayload = unknown> {
  orgId: string;
  subjectOrgId: string;
  action: string;
  actor: ActorRef;
  target: RuntimeActionTarget;
  payload: TPayload;
  idempotencyKey: string;
  governance: {
    planId: string;
    correlationId: string;
    riskTier: StrategicRiskTier;
    reason: string;
    requiredPermission: string;
    evidenceRefs: readonly EvidenceRef[];
    permissionChecks: readonly PermissionDecision[];
  };
}

export interface AuthoritativeExecutionResult<TResult = unknown> {
  result: TResult;
  resultingVersion?: number;
  resultingEtag?: string;
  auditId?: string;
  domainEventId?: string;
}

export interface AuthoritativeDomainService<TPayload = unknown, TResult = unknown> {
  readonly serviceName: string;
  readonly capabilities: GovernedServiceCapabilities;
  execute(
    command: AuthoritativeServiceCommand<TPayload>,
  ): Promise<AuthoritativeExecutionResult<TResult>>;
}

export interface GovernedExecutionReceipt {
  receiptId: string;
  planId: string;
  orgId: string;
  action: string;
  riskTier: StrategicRiskTier;
  serviceName: string;
  targetObjectType: string;
  targetObjectId: string;
  mutationKind: RuntimeMutationKind;
  resultingVersion?: number;
  resultingEtag?: string;
  auditId?: string;
  domainEventId?: string;
  evidenceRefIds: string[];
  completedAt: string;
}

export interface GovernedExecutionOutcome<TResult = unknown> {
  receipt: GovernedExecutionReceipt;
  result?: TResult;
  duplicate: boolean;
}

export interface IdempotencyReceiptStore {
  get(orgId: string, idempotencyKey: string): Promise<GovernedExecutionReceipt | null>;
  put(
    orgId: string,
    idempotencyKey: string,
    receipt: GovernedExecutionReceipt,
  ): Promise<void>;
}

export interface RuntimeGatewayDependencies {
  permissions: PermissionRechecker;
  versions: ObjectVersionAuthority;
  idempotency: IdempotencyReceiptStore;
  clock: RuntimeClock;
}

export class StrategicRuntimeGateway {
  constructor(private readonly dependencies: RuntimeGatewayDependencies) {}

  async execute<TPayload, TResult>(
    request: GovernedRuntimeRequest<TPayload>,
    service: AuthoritativeDomainService<TPayload, TResult>,
  ): Promise<GovernedExecutionOutcome<TResult>> {
    validateRequest(request);

    const existing = await this.dependencies.idempotency.get(
      request.plan.orgId,
      request.plan.idempotencyKey,
    );

    if (existing) {
      return {
        receipt: existing,
        duplicate: true,
      };
    }

    assertAuthoritativeService(service);

    await this.assertVersionBoundary(request);

    const recheckedPermissions = await this.dependencies.permissions.recheck({
      orgId: request.plan.orgId,
      actor: request.actor,
      permission: request.requiredPermission,
      action: request.plan.action,
      objectType: request.target.objectType,
      objectId: request.target.objectId,
    });

    assertPermissionRecheck(request.requiredPermission, recheckedPermissions);

    const now = this.dependencies.clock.now();

    assertExecutionAllowed({
      plan: request.plan,
      now,
      recheckedPermissions: [...recheckedPermissions],
      userConfirmed: request.userConfirmed,
      independentApproval: request.independentApproval,
      humanDecisionRecorded: request.humanDecisionRecorded,
      specialistReviewRecorded: request.specialistReviewRecorded,
    });

    const execution = await service.execute({
      orgId: request.plan.orgId,
      subjectOrgId: request.subjectOrgId,
      action: request.plan.action,
      actor: request.actor,
      target: request.target,
      payload: request.payload,
      idempotencyKey: request.plan.idempotencyKey,
      governance: {
        planId: request.plan.planId,
        correlationId: request.plan.planId,
        riskTier: request.plan.riskTier,
        reason: request.reason,
        requiredPermission: request.requiredPermission,
        evidenceRefs: request.plan.evidenceRefs,
        permissionChecks: recheckedPermissions,
      },
    });

    validateAuthoritativeResult(request, execution);

    const receipt: GovernedExecutionReceipt = {
      receiptId: `receipt:${request.plan.planId}`,
      planId: request.plan.planId,
      orgId: request.plan.orgId,
      action: request.plan.action,
      riskTier: request.plan.riskTier,
      serviceName: service.serviceName,
      targetObjectType: request.target.objectType,
      targetObjectId: request.target.objectId,
      mutationKind: request.target.mutationKind,
      resultingVersion: execution.resultingVersion,
      resultingEtag: execution.resultingEtag,
      auditId: execution.auditId,
      domainEventId: execution.domainEventId,
      evidenceRefIds: request.plan.evidenceRefs.map((evidence) => evidence.id),
      completedAt: now,
    };

    await this.dependencies.idempotency.put(
      request.plan.orgId,
      request.plan.idempotencyKey,
      receipt,
    );

    return {
      receipt,
      result: execution.result,
      duplicate: false,
    };
  }

  private async assertVersionBoundary<TPayload>(
    request: GovernedRuntimeRequest<TPayload>,
  ): Promise<void> {
    if (request.target.mutationKind === 'read') return;

    const current = await this.dependencies.versions.resolve({
      orgId: request.plan.orgId,
      objectType: request.target.objectType,
      objectId: request.target.objectId,
    });

    if (request.target.mutationKind === 'create') {
      if (current) {
        throw new Error('authoritative create conflict: target already exists');
      }
      return;
    }

    if (
      !Number.isInteger(request.target.expectedVersion) ||
      (request.target.expectedVersion ?? 0) < 1
    ) {
      throw new Error('authoritative update requires expectedVersion');
    }

    if (!request.target.expectedEtag?.trim()) {
      throw new Error('authoritative update requires expectedEtag');
    }

    if (!current) {
      throw new Error('authoritative update target was not found');
    }

    if (current.version !== request.target.expectedVersion) {
      throw new Error('authoritative version conflict');
    }

    if (current.etag !== request.target.expectedEtag) {
      throw new Error('authoritative etag conflict');
    }
  }
}

function validateRequest<TPayload>(
  request: GovernedRuntimeRequest<TPayload>,
): void {
  const { plan, target } = request;

  if (!plan.planId.trim()) throw new Error('planId is required');
  if (!plan.orgId.trim()) throw new Error('orgId is required');
  if (!plan.idempotencyKey.trim()) throw new Error('idempotencyKey is required');
  if (!request.subjectOrgId.trim()) throw new Error('subjectOrgId is required');

  if (request.subjectOrgId !== plan.orgId) {
    throw new Error('cross-organization execution is forbidden');
  }

  if (!target.objectType.trim() || !target.objectId.trim()) {
    throw new Error('authoritative target is required');
  }

  if (
    plan.targetObjectType &&
    plan.targetObjectType !== target.objectType
  ) {
    throw new Error('planned object type does not match runtime target');
  }

  if (
    plan.targetObjectId &&
    plan.targetObjectId !== target.objectId
  ) {
    throw new Error('planned object does not match runtime target');
  }

  if (!request.requiredPermission.trim()) {
    throw new Error('requiredPermission is required');
  }

  if (plan.permissionChecks.length === 0) {
    throw new Error('permission must be checked during planning');
  }

  if (plan.permissionChecks.some((decision) => !decision.allowed)) {
    throw new Error('planned permission decision denied the action');
  }

  if (target.mutationKind !== 'read' && !request.reason.trim()) {
    throw new Error('mutation reason is required');
  }

  if (
    target.mutationKind !== 'read' &&
    (plan.riskTier === 'R0' ||
      plan.riskTier === 'R1' ||
      plan.riskTier === 'R2')
  ) {
    throw new Error('R0-R2 actions cannot perform authoritative mutations');
  }

  if (request.autonomous && !mayAutonomouslyExecute(plan.riskTier)) {
    throw new Error('R3-R6 actions cannot execute autonomously');
  }

  if (
    (plan.riskTier === 'R4' ||
      plan.riskTier === 'R5' ||
      plan.riskTier === 'R6') &&
    plan.evidenceRefs.length === 0
  ) {
    throw new Error('R4-R6 actions require evidence');
  }

  if (plan.riskTier === 'R6' && !request.humanDecisionRecorded) {
    throw new Error('R6 requires a recorded human decision');
  }
}

function assertPermissionRecheck(
  requiredPermission: string,
  decisions: readonly PermissionDecision[],
): void {
  if (decisions.length === 0) {
    throw new Error('permission recheck returned no decision');
  }

  const required = decisions.filter(
    (decision) => decision.permission === requiredPermission,
  );

  if (required.length === 0) {
    throw new Error('required permission was not rechecked');
  }

  if (decisions.some((decision) => !decision.allowed)) {
    throw new Error('permission recheck denied execution');
  }
}

function assertAuthoritativeService<TPayload, TResult>(
  service: AuthoritativeDomainService<TPayload, TResult>,
): void {
  if (!service.serviceName.trim()) {
    throw new Error('authoritative serviceName is required');
  }

  if (
    service.capabilities.tenantScoped !== true ||
    service.capabilities.idempotent !== true ||
    service.capabilities.audit !== true ||
    service.capabilities.domainEvents !== true
  ) {
    throw new Error(
      'authoritative service must guarantee tenant scope, idempotency, audit and domain events',
    );
  }
}

function validateAuthoritativeResult<TResult>(
  request: GovernedRuntimeRequest<unknown>,
  result: AuthoritativeExecutionResult<TResult>,
): void {
  if (request.target.mutationKind === 'read') return;

  if (
    !Number.isInteger(result.resultingVersion) ||
    (result.resultingVersion ?? 0) < 1
  ) {
    throw new Error('authoritative mutation did not return resultingVersion');
  }

  if (!result.resultingEtag?.trim()) {
    throw new Error('authoritative mutation did not return resultingEtag');
  }

  if (!result.auditId?.trim()) {
    throw new Error('authoritative mutation did not return audit evidence');
  }

  if (!result.domainEventId?.trim()) {
    throw new Error('authoritative mutation did not return a domain event');
  }
}
