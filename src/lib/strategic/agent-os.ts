import type {
  EvidenceRef,
  PermissionDecision,
  StrategicRiskTier,
} from './types';

export interface AgentDefinition {
  agentId: string;
  name: string;
  purpose: string;
  allowedActions: readonly string[];
  maximumRiskTier: StrategicRiskTier;
  enabled: boolean;
  version: number;
}

export interface GovernedActionPlan {
  planId: string;
  orgId: string;
  agentId: string;
  action: string;
  riskTier: StrategicRiskTier;
  createdAt: string;
  expiresAt: string;
  targetObjectType?: string;
  targetObjectId?: string;
  fieldChanges?: Record<string, unknown>;
  evidenceRefs: EvidenceRef[];
  permissionChecks: PermissionDecision[];
  assumptions: string[];
  status: 'planned' | 'confirmed' | 'executed' | 'rejected' | 'expired';
  idempotencyKey: string;
}

export const riskPolicy: Readonly<
  Record<
    StrategicRiskTier,
    {
      description: string;
      execution: 'automatic' | 'confirmation' | 'approval' | 'human-decision' | 'specialist-review';
    }
  >
> = {
  R0: { description: 'navigation/search', execution: 'automatic' },
  R1: { description: 'reports/read-only', execution: 'automatic' },
  R2: { description: 'draft generation', execution: 'automatic' },
  R3: { description: 'routine transaction', execution: 'confirmation' },
  R4: { description: 'compensation or broad-data action', execution: 'approval' },
  R5: { description: 'hiring/discipline/promotion/succession', execution: 'human-decision' },
  R6: { description: 'termination/legal action', execution: 'specialist-review' },
};

export function classifyStrategicAction(action: string): StrategicRiskTier {
  const normalized = action.trim().toLowerCase();

  if (/(terminate|termination|legal hold|legal decision)/.test(normalized)) return 'R6';
  if (/(hire|reject candidate|discipline|promote|demote|successor|succession)/.test(normalized)) return 'R5';
  if (/(salary|compensation|pay change|broad export|bulk sensitive)/.test(normalized)) return 'R4';
  if (/(request leave|submit leave|create employee|onboard|create position|clock|timesheet)/.test(normalized)) return 'R3';
  if (/(draft|prepare|compose|suggest)/.test(normalized)) return 'R2';
  if (/(report|read|view|summarize|analyze)/.test(normalized)) return 'R1';
  return 'R0';
}

export function assertAgentCanPlan(
  agent: AgentDefinition,
  plan: GovernedActionPlan,
): void {
  if (!agent.enabled) throw new Error('agent is disabled');
  if (agent.agentId !== plan.agentId) throw new Error('agent mismatch');
  if (!agent.allowedActions.includes(plan.action)) {
    throw new Error('action is not allow-listed for this agent');
  }
  if (riskRank(plan.riskTier) > riskRank(agent.maximumRiskTier)) {
    throw new Error('plan exceeds agent maximum risk tier');
  }
  if (!plan.idempotencyKey.trim()) throw new Error('idempotencyKey is required');
  if (plan.expiresAt <= plan.createdAt) throw new Error('plan expiry is invalid');
  if (plan.permissionChecks.some((decision) => !decision.allowed)) {
    throw new Error('plan contains a denied permission decision');
  }
}

export function requiresHumanControl(tier: StrategicRiskTier): boolean {
  return riskRank(tier) >= riskRank('R3');
}

export function mayAutonomouslyExecute(tier: StrategicRiskTier): boolean {
  return tier === 'R0' || tier === 'R1' || tier === 'R2';
}

export function assertExecutionAllowed(input: {
  plan: GovernedActionPlan;
  now: string;
  recheckedPermissions: PermissionDecision[];
  userConfirmed?: boolean;
  independentApproval?: boolean;
  humanDecisionRecorded?: boolean;
  specialistReviewRecorded?: boolean;
}): void {
  const { plan } = input;

  if (plan.status !== 'planned' && plan.status !== 'confirmed') {
    throw new Error('plan is not executable');
  }
  if (input.now >= plan.expiresAt) throw new Error('plan is expired');
  if (input.recheckedPermissions.some((decision) => !decision.allowed)) {
    throw new Error('permission recheck denied execution');
  }

  switch (riskPolicy[plan.riskTier].execution) {
    case 'automatic':
      return;
    case 'confirmation':
      if (!input.userConfirmed) throw new Error('user confirmation is required');
      return;
    case 'approval':
      if (!input.independentApproval) throw new Error('independent approval is required');
      return;
    case 'human-decision':
      if (!input.humanDecisionRecorded) throw new Error('human decision is required');
      return;
    case 'specialist-review':
      if (!input.specialistReviewRecorded) throw new Error('specialist review is required');
      return;
  }
}

function riskRank(tier: StrategicRiskTier): number {
  return Number(tier.slice(1));
}
