import { GovernedOrchestrator, type OrchestratorRunResult } from '../orchestrator/engine';
import type {
  OrchestrationActor,
  OrchestrationPlan,
  OrchestrationRisk,
  OrchestrationStep,
  OrchestratorDependencies,
} from '../orchestrator/types';
import type { GovernedActionPlan } from './agent-os';
import type { StrategicRiskTier } from './types';

export const strategicExecutionAuthority = 'governed-orchestrator' as const;

export interface StrategicOrchestrationBinding {
  authoritativeService: string;
  permission: string;
  title?: string;
  payloadRef?: string;
  approvalEvidenceRef?: string;
  humanDecisionEvidenceRef?: string;
  specialistReviewEvidenceRef?: string;
}

export interface StrategicOrchestrationRunInput {
  plan: GovernedActionPlan;
  actor: OrchestrationActor;
  binding: StrategicOrchestrationBinding;
  userConfirmed?: boolean;
  simulateOnly?: boolean;
}

export function orchestrationRiskForStrategicTier(
  riskTier: StrategicRiskTier,
): OrchestrationRisk {
  switch (riskTier) {
    case 'R0':
    case 'R1':
    case 'R2':
      return 'read_only';
    case 'R3':
      return 'administrative';
    case 'R4':
      return 'high_impact_admin';
    case 'R5':
    case 'R6':
      return 'consequential';
  }
}

export function buildStrategicOrchestrationPlan(input: {
  plan: GovernedActionPlan;
  actorUid: string;
  binding: StrategicOrchestrationBinding;
}): OrchestrationPlan {
  const { plan, actorUid, binding } = input;

  assertBridgeInput(plan, actorUid, binding);

  const riskClass = orchestrationRiskForStrategicTier(plan.riskTier);
  const stepId = `strategic:${plan.planId}`;
  const evidenceRefs = collectEvidenceRefs(plan, binding);

  const step: OrchestrationStep = {
    id: stepId,
    title: binding.title?.trim() || plan.action,
    dependencies: [],
    authoritativeService: binding.authoritativeService.trim(),
    permission: binding.permission.trim(),
    riskClass,
    state: 'ready',
    confirmationRequired:
      plan.riskTier === 'R3' ||
      plan.riskTier === 'R4' ||
      plan.riskTier === 'R5' ||
      plan.riskTier === 'R6',
    idempotencyRequired: riskClass !== 'read_only',
    humanCheckpoint:
      plan.riskTier === 'R4' ||
      plan.riskTier === 'R5' ||
      plan.riskTier === 'R6',
    evidenceRefs,
    payloadRef: binding.payloadRef?.trim() || undefined,
  };

  return {
    planId: plan.planId,
    organizationId: plan.orgId,
    actorUid,
    goalCode: strategicGoalCode(plan.action),
    state: 'ready',
    createdAtUtc: plan.createdAt,
    authorizationExpiresAtUtc: plan.expiresAt,
    steps: [step],
    evidenceRefs,
    commandHash: plan.idempotencyKey,
    version: 1,
  };
}

export class StrategicGovernedOrchestratorBridge {
  constructor(private readonly dependencies: OrchestratorDependencies) {}

  async run(
    input: StrategicOrchestrationRunInput,
  ): Promise<OrchestratorRunResult> {
    if (input.actor.organizationId !== input.plan.orgId) {
      throw new Error('strategic actor organization does not match the plan');
    }

    const orchestrationPlan = buildStrategicOrchestrationPlan({
      plan: input.plan,
      actorUid: input.actor.uid,
      binding: input.binding,
    });

    const stepId = orchestrationPlan.steps[0]!.id;
    const orchestrator = new GovernedOrchestrator(this.dependencies);

    return orchestrator.run({
      plan: orchestrationPlan,
      actor: input.actor,
      confirmedStepIds: input.userConfirmed ? [stepId] : [],
      simulateOnly: input.simulateOnly === true,
    });
  }
}

function assertBridgeInput(
  plan: GovernedActionPlan,
  actorUid: string,
  binding: StrategicOrchestrationBinding,
): void {
  if (!plan.planId.trim()) throw new Error('strategic planId is required');
  if (!plan.orgId.trim()) throw new Error('strategic orgId is required');
  if (!actorUid.trim()) throw new Error('strategic actor uid is required');
  if (!binding.authoritativeService.trim()) {
    throw new Error('authoritative service binding is required');
  }
  if (!binding.permission.trim()) {
    throw new Error('strategic permission is required');
  }
  if (!plan.idempotencyKey.trim()) {
    throw new Error('strategic idempotency key is required');
  }

  const relevantPlanningChecks = plan.permissionChecks.filter(
    (decision) => decision.permission === binding.permission,
  );

  if (relevantPlanningChecks.length === 0) {
    throw new Error('permission must be checked during strategic planning');
  }

  if (
    relevantPlanningChecks.some((decision) => !decision.allowed) ||
    plan.permissionChecks.some((decision) => !decision.allowed)
  ) {
    throw new Error('strategic planning permission denied the action');
  }

  if (plan.riskTier === 'R4' && !binding.approvalEvidenceRef?.trim()) {
    throw new Error('R4 requires independent approval evidence');
  }

  if (
    (plan.riskTier === 'R5' || plan.riskTier === 'R6') &&
    !binding.humanDecisionEvidenceRef?.trim()
  ) {
    throw new Error('R5-R6 require recorded human-decision evidence');
  }

  if (
    plan.riskTier === 'R6' &&
    !binding.specialistReviewEvidenceRef?.trim()
  ) {
    throw new Error('R6 requires specialist-review evidence');
  }
}

function collectEvidenceRefs(
  plan: GovernedActionPlan,
  binding: StrategicOrchestrationBinding,
): string[] {
  return [
    ...plan.evidenceRefs.map((evidence) => evidence.id),
    binding.approvalEvidenceRef,
    binding.humanDecisionEvidenceRef,
    binding.specialistReviewEvidenceRef,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .filter((value, index, values) => values.indexOf(value) === index);
}

function strategicGoalCode(action: string): string {
  const normalized = action
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `strategic_${normalized || 'action'}`;
}
