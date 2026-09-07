import type { EvidenceRef, StrategicRiskTier } from './types';

export type H50SkillSource =
  | 'resume'
  | 'job'
  | 'project'
  | 'learning'
  | 'performance'
  | 'certification'
  | 'manager_validation'
  | 'self_profile'
  | 'work_history';

export interface H50SkillEvidence {
  source: H50SkillSource;
  evidenceRef: EvidenceRef;
  confidence: number;
  sourceQuality: 'authoritative' | 'verified' | 'derived';
  observedAt: string;
  humanValidated?: boolean;
}

export interface H50SkillAssertion {
  orgId: string;
  workerId: string;
  skillId: string;
  skillName: string;
  confidence: number;
  evidence: H50SkillEvidence[];
  adjacentSkillIds: string[];
  validatedBy?: string;
}

export function buildH50SkillAssertion(input: {
  orgId: string;
  workerId: string;
  skillId: string;
  skillName: string;
  evidence: H50SkillEvidence[];
  adjacentSkillIds?: string[];
  validatedBy?: string;
}): H50SkillAssertion {
  if (!input.orgId.trim() || !input.workerId.trim() || !input.skillId.trim()) {
    throw new Error('skill assertion identity is required');
  }
  if (input.evidence.length === 0) {
    throw new Error('skill assertion requires evidence');
  }

  for (const item of input.evidence) {
    if (item.confidence < 0 || item.confidence > 1) {
      throw new Error('skill evidence confidence must be between 0 and 1');
    }
  }

  const weighted = input.evidence.reduce((sum, item) => {
    const multiplier =
      item.sourceQuality === 'authoritative'
        ? 1
        : item.sourceQuality === 'verified'
          ? 0.9
          : 0.75;
    return sum + item.confidence * multiplier;
  }, 0);

  return {
    orgId: input.orgId,
    workerId: input.workerId,
    skillId: input.skillId,
    skillName: input.skillName,
    confidence: Math.min(1, weighted / input.evidence.length),
    evidence: [...input.evidence],
    adjacentSkillIds: [...(input.adjacentSkillIds ?? [])],
    validatedBy: input.validatedBy,
  };
}

export interface H50SkillDevelopmentRecommendation {
  workerId: string;
  currentSkillId: string;
  targetSkillId: string;
  path: string[];
  evidenceRefs: EvidenceRef[];
  confidence: number;
  humanReviewRequired: true;
}

export function buildH50SkillDevelopmentPath(input: {
  workerId: string;
  currentSkillId: string;
  targetSkillId: string;
  adjacency: Readonly<Record<string, readonly string[]>>;
  evidenceRefs: EvidenceRef[];
  confidence: number;
}): H50SkillDevelopmentRecommendation {
  if (input.evidenceRefs.length === 0) {
    throw new Error('skill development recommendation requires evidence');
  }
  if (input.confidence < 0 || input.confidence > 1) {
    throw new Error('skill path confidence must be between 0 and 1');
  }

  const path = shortestPath(
    input.currentSkillId,
    input.targetSkillId,
    input.adjacency,
  );

  if (path.length === 0) {
    throw new Error('no skill development path found');
  }

  return {
    workerId: input.workerId,
    currentSkillId: input.currentSkillId,
    targetSkillId: input.targetSkillId,
    path,
    evidenceRefs: [...input.evidenceRefs],
    confidence: input.confidence,
    humanReviewRequired: true,
  };
}

export type H50ComplianceNodeKind =
  | 'jurisdiction'
  | 'worker_type'
  | 'policy'
  | 'law'
  | 'obligation'
  | 'control'
  | 'evidence'
  | 'owner'
  | 'deadline'
  | 'risk'
  | 'workflow'
  | 'training'
  | 'record';

export interface H50ComplianceNode {
  id: string;
  orgId: string;
  kind: H50ComplianceNodeKind;
  label: string;
  evidenceRefs: EvidenceRef[];
}

export interface H50ComplianceEdge {
  id: string;
  orgId: string;
  fromId: string;
  toId: string;
  relationship: string;
  evidenceRefs: EvidenceRef[];
}

export interface H50ComplianceGraph {
  orgId: string;
  nodes: H50ComplianceNode[];
  edges: H50ComplianceEdge[];
}

export interface H50ComplianceChangeImpact {
  orgId: string;
  changedNodeId: string;
  affectedNodeIds: string[];
  affectedKinds: H50ComplianceNodeKind[];
  remediation: Array<{
    nodeId: string;
    action: string;
    approval: 'hr' | 'legal' | 'specialist';
  }>;
  legalConclusionMade: false;
}

export function assessH50ComplianceChange(
  graph: H50ComplianceGraph,
  changedNodeId: string,
): H50ComplianceChangeImpact {
  const changed = graph.nodes.find((node) => node.id === changedNodeId);

  if (!changed) throw new Error('changed compliance node was not found');
  if (changed.orgId !== graph.orgId) {
    throw new Error('cross-organization compliance node');
  }

  const related = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.orgId !== graph.orgId) {
      throw new Error('cross-organization compliance edge');
    }
    if (edge.fromId === changedNodeId) related.add(edge.toId);
    if (edge.toId === changedNodeId) related.add(edge.fromId);
  }

  const affected = graph.nodes.filter((node) => related.has(node.id));

  return {
    orgId: graph.orgId,
    changedNodeId,
    affectedNodeIds: affected.map((node) => node.id),
    affectedKinds: [...new Set(affected.map((node) => node.kind))],
    remediation: affected.map((node) => ({
      nodeId: node.id,
      action: remediationForKind(node.kind),
      approval:
        node.kind === 'law' || node.kind === 'obligation'
          ? 'legal'
          : node.kind === 'risk'
            ? 'specialist'
            : 'hr',
    })),
    legalConclusionMade: false,
  };
}

export interface H50WorkforceState {
  orgId: string;
  headcount: number;
  positions: number;
  vacancies: number;
  payrollCost: number;
  contractorCost: number;
  overtimeHours: number;
  hiringDemand: number;
  spanOfControl: number;
  successionCoverage: number;
  turnoverRisk: number;
  criticalSkillCoverage: number;
}

export interface H50ScenarioAlternative {
  id: string;
  label: string;
  strategy: 'external_hire' | 'internal_promotion' | 'contractor' | 'automation' | 'reorganization' | 'combined';
  proposed: H50WorkforceState;
  assumptions: string[];
  evidenceRefs: EvidenceRef[];
}

export interface H50ScenarioComparison {
  alternativeId: string;
  strategy: H50ScenarioAlternative['strategy'];
  deltas: Omit<H50WorkforceState, 'orgId'>;
  warnings: string[];
  downstreamProposals: Array<{
    kind: 'requisition' | 'budget_request' | 'training_plan' | 'org_design_change';
    mode: 'proposal_only';
    humanApprovalRequired: true;
  }>;
}

export function compareH50WorkforceAlternative(
  baseline: H50WorkforceState,
  alternative: H50ScenarioAlternative,
): H50ScenarioComparison {
  if (baseline.orgId !== alternative.proposed.orgId) {
    throw new Error('cross-organization scenario comparison is forbidden');
  }
  if (alternative.assumptions.length === 0) {
    throw new Error('scenario assumptions are required');
  }
  if (alternative.evidenceRefs.length === 0) {
    throw new Error('scenario evidence is required');
  }

  const deltas = {
    headcount: alternative.proposed.headcount - baseline.headcount,
    positions: alternative.proposed.positions - baseline.positions,
    vacancies: alternative.proposed.vacancies - baseline.vacancies,
    payrollCost: alternative.proposed.payrollCost - baseline.payrollCost,
    contractorCost: alternative.proposed.contractorCost - baseline.contractorCost,
    overtimeHours: alternative.proposed.overtimeHours - baseline.overtimeHours,
    hiringDemand: alternative.proposed.hiringDemand - baseline.hiringDemand,
    spanOfControl: alternative.proposed.spanOfControl - baseline.spanOfControl,
    successionCoverage:
      alternative.proposed.successionCoverage - baseline.successionCoverage,
    turnoverRisk: alternative.proposed.turnoverRisk - baseline.turnoverRisk,
    criticalSkillCoverage:
      alternative.proposed.criticalSkillCoverage - baseline.criticalSkillCoverage,
  };

  const warnings: string[] = [];
  if (deltas.payrollCost + deltas.contractorCost > 0) warnings.push('workforce cost increases');
  if (deltas.turnoverRisk > 0) warnings.push('turnover risk increases');
  if (deltas.criticalSkillCoverage < 0) warnings.push('critical skill coverage decreases');
  if (deltas.successionCoverage < 0) warnings.push('succession coverage decreases');

  const downstreamProposals: H50ScenarioComparison['downstreamProposals'] = [];
  if (
    alternative.strategy === 'external_hire' ||
    alternative.strategy === 'combined'
  ) {
    downstreamProposals.push({
      kind: 'requisition',
      mode: 'proposal_only',
      humanApprovalRequired: true,
    });
  }
  if (deltas.payrollCost !== 0 || deltas.contractorCost !== 0) {
    downstreamProposals.push({
      kind: 'budget_request',
      mode: 'proposal_only',
      humanApprovalRequired: true,
    });
  }
  if (deltas.criticalSkillCoverage < 0) {
    downstreamProposals.push({
      kind: 'training_plan',
      mode: 'proposal_only',
      humanApprovalRequired: true,
    });
  }
  if (alternative.strategy === 'reorganization') {
    downstreamProposals.push({
      kind: 'org_design_change',
      mode: 'proposal_only',
      humanApprovalRequired: true,
    });
  }

  return {
    alternativeId: alternative.id,
    strategy: alternative.strategy,
    deltas,
    warnings,
    downstreamProposals,
  };
}

export type H50ImpactDimension =
  | 'budget'
  | 'equity'
  | 'skills'
  | 'succession'
  | 'compliance'
  | 'headcount'
  | 'reporting_line'
  | 'downstream_workflow';

export interface H50ImpactSignal {
  dimension: H50ImpactDimension;
  level: 'positive' | 'neutral' | 'warning' | 'high_risk';
  summary: string;
  evidenceRefs: EvidenceRef[];
}

export interface H50ImpactPreview {
  orgId: string;
  action: string;
  riskTier: StrategicRiskTier;
  signals: H50ImpactSignal[];
  assumptions: string[];
  alternatives: string[];
  accountableHumanRequired: true;
}

export function buildH50ImpactPreview(input: {
  orgId: string;
  action: string;
  riskTier: StrategicRiskTier;
  signals: H50ImpactSignal[];
  assumptions: string[];
  alternatives: string[];
}): H50ImpactPreview {
  if (!input.orgId.trim() || !input.action.trim()) {
    throw new Error('impact preview identity is required');
  }
  if (input.assumptions.length === 0) {
    throw new Error('impact preview assumptions are required');
  }
  if (input.signals.some((signal) => signal.evidenceRefs.length === 0)) {
    throw new Error('every material impact signal requires evidence');
  }

  return {
    ...input,
    signals: [...input.signals],
    assumptions: [...input.assumptions],
    alternatives: [...input.alternatives],
    accountableHumanRequired: true,
  };
}

function shortestPath(
  start: string,
  target: string,
  adjacency: Readonly<Record<string, readonly string[]>>,
): string[] {
  if (start === target) return [start];

  const queue: string[][] = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;

    const last = path[path.length - 1]!;
    for (const next of adjacency[last] ?? []) {
      if (visited.has(next)) continue;
      const candidate = [...path, next];
      if (next === target) return candidate;
      visited.add(next);
      queue.push(candidate);
    }
  }

  return [];
}

function remediationForKind(kind: H50ComplianceNodeKind): string {
  switch (kind) {
    case 'policy':
      return 'review and revise policy';
    case 'control':
      return 'assess and update control';
    case 'training':
      return 'review training requirement';
    case 'workflow':
      return 'review workflow logic';
    case 'record':
      return 'review affected records';
    case 'deadline':
      return 'recalculate compliance deadline';
    case 'risk':
      return 'perform specialist risk review';
    default:
      return 'perform impact review';
  }
}
