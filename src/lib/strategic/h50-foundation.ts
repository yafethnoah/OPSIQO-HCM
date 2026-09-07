import type {
  EvidenceRef,
  ExplainableOutput,
  PermissionDecision,
  StrategicRiskTier,
} from './types';
import type {
  EnterpriseObject,
  EnterpriseRelationship,
} from './enterprise-object-graph';
import {
  assertCanonicalObject,
  assertTenantScope,
  validateRelationship,
} from './enterprise-object-graph';
import { classifyStrategicAction } from './agent-os';

export const h50EnterpriseObjectTypes = [
  'organization',
  'worker',
  'job',
  'position',
  'assignment',
  'skill',
  'compensation',
  'policy',
  'control',
  'document',
  'workflow',
  'case',
  'risk',
  'agent',
  'learning',
] as const;

export type H50EnterpriseObjectType =
  (typeof h50EnterpriseObjectTypes)[number];

export type H50Freshness = 'current' | 'aging' | 'stale';
export type H50SourceQuality = 'authoritative' | 'verified' | 'derived' | 'unknown';

export interface H50GraphEdge extends EnterpriseRelationship {
  confidence: number;
  observedAt: string;
  freshness: H50Freshness;
  sourceQuality: H50SourceQuality;
}

export interface H50EnterpriseGraphSnapshot {
  orgId: string;
  generatedAt: string;
  objects: EnterpriseObject[];
  relationships: H50GraphEdge[];
}

export interface H50GraphCoverage {
  requiredTypes: readonly H50EnterpriseObjectType[];
  presentTypes: H50EnterpriseObjectType[];
  missingTypes: H50EnterpriseObjectType[];
  coveragePercent: number;
}

export function buildH50EnterpriseGraphSnapshot(input: {
  orgId: string;
  generatedAt: string;
  objects: EnterpriseObject[];
  relationships: H50GraphEdge[];
}): H50EnterpriseGraphSnapshot {
  if (!input.orgId.trim()) throw new Error('orgId is required');

  for (const object of input.objects) {
    assertCanonicalObject(object.meta);
    assertTenantScope(input.orgId, { orgId: object.meta.orgId });
  }

  for (const relationship of input.relationships) {
    validateRelationship(relationship);
    assertTenantScope(input.orgId, relationship);

    if (relationship.confidence < 0 || relationship.confidence > 1) {
      throw new Error('relationship confidence must be between 0 and 1');
    }

    if (!relationship.observedAt.trim()) {
      throw new Error('relationship observedAt is required');
    }

    if (
      relationship.sourceQuality !== 'authoritative' &&
      relationship.evidenceRefs.length === 0
    ) {
      throw new Error('non-authoritative relationship requires evidence');
    }
  }

  return {
    orgId: input.orgId,
    generatedAt: input.generatedAt,
    objects: [...input.objects],
    relationships: [...input.relationships],
  };
}

export function h50GraphCoverage(
  snapshot: H50EnterpriseGraphSnapshot,
): H50GraphCoverage {
  const present = new Set(
    snapshot.objects.map((object) => object.meta.objectType),
  );

  const presentTypes = h50EnterpriseObjectTypes.filter((type) =>
    present.has(type),
  );
  const missingTypes = h50EnterpriseObjectTypes.filter(
    (type) => !present.has(type),
  );

  return {
    requiredTypes: h50EnterpriseObjectTypes,
    presentTypes,
    missingTypes,
    coveragePercent:
      (presentTypes.length / h50EnterpriseObjectTypes.length) * 100,
  };
}

export interface H50AgentTelemetry {
  evaluationScore?: number;
  estimatedCostPerRun?: number;
  p95LatencyMs?: number;
  successRate?: number;
  failureRate?: number;
  humanOverrideRate?: number;
  lastEvaluatedAt?: string;
}

export interface H50AgentRegistryEntry {
  agentId: string;
  name: string;
  owner: string;
  purpose: string;
  tools: readonly string[];
  dataScopes: readonly string[];
  permissions: readonly string[];
  prohibitedActions: readonly string[];
  maximumRiskTier: StrategicRiskTier;
  requiredApprovals: readonly string[];
  model: {
    provider: string;
    model: string;
    version?: string;
  };
  enabled: boolean;
  version: number;
  telemetry: H50AgentTelemetry;
}

export const h50InitialAgentRegistry: readonly H50AgentRegistryEntry[] = [
  {
    agentId: 'hr-concierge',
    name: 'HR Concierge',
    owner: 'HR Operations',
    purpose: 'Navigation, policy answers and self-service guidance.',
    tools: ['command-router', 'organizational-memory'],
    dataScopes: ['self', 'published-policy'],
    permissions: ['self.read', 'policies.read', 'service.read'],
    prohibitedActions: ['hire', 'terminate', 'discipline', 'promote', 'salary-change'],
    maximumRiskTier: 'R2',
    requiredApprovals: [],
    model: { provider: 'configured-provider', model: 'configured-model' },
    enabled: true,
    version: 1,
    telemetry: {},
  },
  {
    agentId: 'hr-operations',
    name: 'HR Operations',
    owner: 'HR',
    purpose: 'Prepare and govern employee, position and leave administration.',
    tools: ['orchestrator', 'core-hr', 'leave', 'workflow'],
    dataScopes: ['people', 'positions', 'leave'],
    permissions: ['people.manage', 'positions.manage', 'leave.manage'],
    prohibitedActions: ['terminate', 'hire', 'discipline', 'promote'],
    maximumRiskTier: 'R4',
    requiredApprovals: ['risk-policy'],
    model: { provider: 'configured-provider', model: 'configured-model' },
    enabled: true,
    version: 1,
    telemetry: {},
  },
  {
    agentId: 'onboarding',
    name: 'Onboarding',
    owner: 'HR Operations',
    purpose: 'Coordinate approved-hire onboarding outcomes.',
    tools: ['orchestrator', 'onboarding', 'learning', 'workflow'],
    dataScopes: ['approved-hire', 'onboarding', 'learning'],
    permissions: ['onboarding.manage', 'learning.assign', 'workflow.run'],
    prohibitedActions: ['make-hiring-decision', 'terminate'],
    maximumRiskTier: 'R4',
    requiredApprovals: ['approved-hire-evidence'],
    model: { provider: 'configured-provider', model: 'configured-model' },
    enabled: true,
    version: 1,
    telemetry: {},
  },
  {
    agentId: 'compliance',
    name: 'Compliance',
    owner: 'Compliance',
    purpose: 'Assess obligations, evidence and remediation proposals.',
    tools: ['compliance-radar', 'organizational-memory', 'regulatory'],
    dataScopes: ['policy', 'control', 'evidence', 'regulatory'],
    permissions: ['compliance.read', 'regulatory.read', 'assurance.read'],
    prohibitedActions: ['make-legal-decision', 'override-compliance-control'],
    maximumRiskTier: 'R4',
    requiredApprovals: ['legal-or-hr-review'],
    model: { provider: 'configured-provider', model: 'configured-model' },
    enabled: true,
    version: 1,
    telemetry: {},
  },
  {
    agentId: 'analytics',
    name: 'Analytics',
    owner: 'People Analytics',
    purpose: 'Answer workforce questions and explain root causes.',
    tools: ['people-analytics', 'digital-twin', 'knowledge-graph'],
    dataScopes: ['aggregated-workforce', 'scenario'],
    permissions: ['peopleanalytics.read', 'workforce.read'],
    prohibitedActions: ['mutate-worker', 'make-employment-decision'],
    maximumRiskTier: 'R1',
    requiredApprovals: [],
    model: { provider: 'configured-provider', model: 'configured-model' },
    enabled: true,
    version: 1,
    telemetry: {},
  },
] as const;

export function validateH50AgentRegistryEntry(
  entry: H50AgentRegistryEntry,
): void {
  if (!entry.agentId.trim() || !entry.name.trim() || !entry.owner.trim()) {
    throw new Error('agent identity and owner are required');
  }
  if (entry.tools.length === 0) throw new Error('agent tools are required');
  if (entry.dataScopes.length === 0) throw new Error('agent data scopes are required');

  for (const metric of [
    entry.telemetry.evaluationScore,
    entry.telemetry.successRate,
    entry.telemetry.failureRate,
    entry.telemetry.humanOverrideRate,
  ]) {
    if (metric !== undefined && (metric < 0 || metric > 100)) {
      throw new Error('agent percentage telemetry must be between 0 and 100');
    }
  }
}

export function recordH50AgentEvaluation(
  entry: H50AgentRegistryEntry,
  input: {
    score: number;
    successRate: number;
    failureRate: number;
    humanOverrideRate: number;
    p95LatencyMs: number;
    evaluatedAt: string;
  },
): H50AgentRegistryEntry {
  validatePercentage(input.score, 'evaluation score');
  validatePercentage(input.successRate, 'success rate');
  validatePercentage(input.failureRate, 'failure rate');
  validatePercentage(input.humanOverrideRate, 'human override rate');

  if (input.p95LatencyMs < 0 || !Number.isFinite(input.p95LatencyMs)) {
    throw new Error('p95 latency must be a non-negative finite number');
  }

  return {
    ...entry,
    telemetry: {
      ...entry.telemetry,
      evaluationScore: input.score,
      successRate: input.successRate,
      failureRate: input.failureRate,
      humanOverrideRate: input.humanOverrideRate,
      p95LatencyMs: input.p95LatencyMs,
      lastEvaluatedAt: input.evaluatedAt,
    },
  };
}

export interface H50ActionRiskFactors {
  dataSensitivity: number;
  financialImpact: number;
  employmentImpact: number;
  legalImpact: number;
  reversibility: number;
  scope: number;
  confidence: number;
  novelty: number;
}

export interface H50ActionRiskAssessment {
  action: string;
  score: number;
  scoreTier: StrategicRiskTier;
  hardPolicyTier: StrategicRiskTier;
  finalTier: StrategicRiskTier;
  factors: H50ActionRiskFactors;
  contributions: Record<keyof H50ActionRiskFactors, number>;
  requiredControl:
    | 'automatic'
    | 'confirmation'
    | 'approval'
    | 'human-decision'
    | 'specialist-review';
}

const riskWeights: Record<keyof H50ActionRiskFactors, number> = {
  dataSensitivity: 0.15,
  financialImpact: 0.15,
  employmentImpact: 0.2,
  legalImpact: 0.2,
  reversibility: 0.1,
  scope: 0.08,
  confidence: 0.06,
  novelty: 0.06,
};

export function scoreH50ActionRisk(
  action: string,
  factors: H50ActionRiskFactors,
): H50ActionRiskAssessment {
  validateRiskFactors(factors);

  const riskNormalized: H50ActionRiskFactors = {
    ...factors,
    reversibility: 1 - factors.reversibility,
    confidence: 1 - factors.confidence,
  };

  const contributions = Object.fromEntries(
    (Object.keys(riskWeights) as Array<keyof H50ActionRiskFactors>).map(
      (key) => [key, riskNormalized[key] * riskWeights[key] * 100],
    ),
  ) as Record<keyof H50ActionRiskFactors, number>;

  const score = Object.values(contributions).reduce(
    (sum, value) => sum + value,
    0,
  );

  const scoreTier = riskTierFromScore(score);
  const hardPolicyTier = classifyStrategicAction(action);
  const finalTier =
    riskRank(hardPolicyTier) > riskRank(scoreTier)
      ? hardPolicyTier
      : scoreTier;

  return {
    action,
    score,
    scoreTier,
    hardPolicyTier,
    finalTier,
    factors: { ...factors },
    contributions,
    requiredControl: controlForTier(finalTier),
  };
}

export interface H50MaterialAiOutput<T> extends ExplainableOutput<T> {
  recommendation: string;
  sourceReferences: string[];
  missingInformation: string[];
  policyBasis: string[];
  dataFreshness: {
    asOf: string;
    status: H50Freshness;
  };
  alternatives: string[];
  humanReviewer: string | null;
  model: {
    provider: string;
    model: string;
    version: string;
  };
}

export function assertH50ExplainableOutput<T>(
  output: H50MaterialAiOutput<T>,
): H50MaterialAiOutput<T> {
  validatePercentage(output.confidence * 100, 'AI confidence');

  if (!output.recommendation.trim()) {
    throw new Error('recommendation is required');
  }
  if (output.evidenceRefs.length === 0) {
    throw new Error('material AI output requires evidence');
  }
  if (output.sourceReferences.length === 0) {
    throw new Error('material AI output requires source references');
  }
  if (output.assumptions.length === 0) {
    throw new Error('material AI output requires assumptions');
  }
  if (output.limitations.length === 0) {
    throw new Error('material AI output requires limitations');
  }
  if (output.policyBasis.length === 0) {
    throw new Error('material AI output requires policy/rule basis');
  }
  if (!output.dataFreshness.asOf.trim()) {
    throw new Error('material AI output requires data freshness');
  }
  if (
    !Array.isArray(output.missingInformation) ||
    !Array.isArray(output.alternatives)
  ) {
    throw new Error('material AI output requires missing-information and alternatives metadata');
  }
  if (output.humanReviewer === undefined) {
    throw new Error('material AI output requires human reviewer metadata');
  }
  if (
    !output.model.provider.trim() ||
    !output.model.model.trim() ||
    !output.model.version.trim()
  ) {
    throw new Error('material AI output requires model/version provenance');
  }

  return output;
}

export function assertH50ExecutionPermissionRecheck(
  planDecisions: readonly PermissionDecision[],
  executionDecisions: readonly PermissionDecision[],
): void {
  if (planDecisions.length === 0 || executionDecisions.length === 0) {
    throw new Error('plan and execution permission checks are required');
  }

  if (executionDecisions.some((decision) => !decision.allowed)) {
    throw new Error('execution permission recheck denied the action');
  }
}

function validateRiskFactors(factors: H50ActionRiskFactors): void {
  for (const key of Object.keys(riskWeights) as Array<keyof H50ActionRiskFactors>) {
    const value = factors[key];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${key} must be between 0 and 1`);
    }
  }
}

function validatePercentage(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be between 0 and 100`);
  }
}

function riskTierFromScore(score: number): StrategicRiskTier {
  if (score <= 10) return 'R0';
  if (score <= 25) return 'R1';
  if (score <= 40) return 'R2';
  if (score <= 55) return 'R3';
  if (score <= 70) return 'R4';
  if (score <= 85) return 'R5';
  return 'R6';
}

function riskRank(tier: StrategicRiskTier): number {
  return Number(tier.slice(1));
}

function controlForTier(
  tier: StrategicRiskTier,
): H50ActionRiskAssessment['requiredControl'] {
  if (tier === 'R0' || tier === 'R1' || tier === 'R2') return 'automatic';
  if (tier === 'R3') return 'confirmation';
  if (tier === 'R4') return 'approval';
  if (tier === 'R5') return 'human-decision';
  return 'specialist-review';
}
