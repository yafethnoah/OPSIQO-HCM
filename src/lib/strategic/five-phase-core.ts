import type {
  AgentActionClass,
  AutopilotLevel,
  GccCountryCode,
  StrategicAgentActionPolicy,
  StrategicCapabilityState,
  StrategicChecklistItem,
  StrategicCountryPack,
  StrategicFivePhaseAssessment,
  StrategicFivePhaseId,
  StrategicMetricDefinition,
} from '@/domain/strategic-five-phase';

const weight: Record<StrategicCapabilityState, number> = {
  implemented: 1,
  partial: 0.5,
  missing: 0,
};

const phase = (
  id: StrategicFivePhaseId,
  name: string,
  objective: string,
  checklist: StrategicChecklistItem[],
): StrategicFivePhaseAssessment => {
  const possible = Math.max(1, checklist.length);
  const score = Math.round(
    (checklist.reduce((sum, item) => sum + weight[item.state], 0) / possible) * 100,
  );
  return {
    id,
    name,
    objective,
    score,
    status: score >= 75 ? 'advanced' : score >= 40 ? 'in_progress' : 'major_gap',
    checklist,
  };
};

export function baselineFivePhaseAssessment(): StrategicFivePhaseAssessment[] {
  return [
    phase(1, 'Foundation & Trust Architecture', 'Canonical data, orchestration, evidence, authorization and governed AI.', [
      { id: 'canonical-model', label: 'Canonical workforce and organization model', state: 'partial', evidence: 'Shared worker, position, assignment, compensation and lifecycle services exist; full cross-module schema governance remains.' },
      { id: 'events', label: 'Event-driven platform and reliable cross-module reactions', state: 'implemented', evidence: 'Domain events, automation scheduler and integration event runtime are present.' },
      { id: 'orchestration', label: 'Unified workflow/orchestration controls', state: 'implemented', evidence: 'Workflow engine, orchestrators, retries, approvals and reconciliation are established.' },
      { id: 'evidence', label: 'Immutable evidence/audit path', state: 'partial', evidence: 'Audit, Evidence Center and governed document evidence exist; universal evidence-pack reproduction is not yet complete.' },
      { id: 'tenant-auth', label: 'Tenant isolation and RBAC', state: 'implemented', evidence: 'Organization-scoped actor context, role permissions and Firestore rules fail closed.' },
      { id: 'abac', label: 'ABAC and field-level policy', state: 'partial', evidence: 'Relationship and role controls exist; universal country/entity/data-class ABAC remains to close.' },
      { id: 'ai-gateway', label: 'Governed AI gateway/tool policy', state: 'partial', evidence: 'Governed AI actions and agent controls exist; unified prompt/provider/cost registry remains incomplete.' },
      { id: 'release', label: 'Release, security and exact-SHA evidence gates', state: 'implemented', evidence: 'TypeScript, regression, Rules, build, security scan, source manifest and exact-SHA UAT are established.' },
    ]),
    phase(2, 'GCC Dominance', 'Saudi- and UAE-native payroll, compliance, Arabic and government-integration packs.', [
      { id: 'framework', label: 'Versioned country-pack framework and activation gates', state: 'implemented', evidence: 'H51.38 country-pack registry refuses activation without independent evidence.' },
      { id: 'ksa', label: 'Saudi statutory rule pack', state: 'partial', evidence: 'H51.40 adds verified-source social-insurance simulation and H51.41 adds verified-source EOSB, leave, working-time and overtime foundations. NOT CERTIFIED; independent Saudi legal/payroll validation, golden tests, Arabic/RTL QA and production workflow integration remain.' },
      { id: 'uae', label: 'UAE statutory/free-zone rule pack', state: 'missing' },
      { id: 'connectors', label: 'Government connector/reconciliation architecture', state: 'partial', evidence: 'Generic integration runtime exists; official GCC adapters remain.' },
      { id: 'guard', label: 'Payroll Guard', state: 'partial', evidence: 'Payroll readiness/fail-closed controls exist; GCC statutory pre-flight remains.' },
      { id: 'arabic', label: 'Arabic/RTL critical-flow certification', state: 'partial', evidence: 'Arabic/translation readiness exists; GCC critical-flow RTL certification remains.' },
    ]),
    phase(3, 'Workforce Intelligence', 'Governed People, Skills and Compliance graphs plus explainable scenario intelligence.', [
      { id: 'people-graph', label: 'People/Work Graph', state: 'partial', evidence: 'Work Graph and relationship APIs exist; enterprise graph normalization/provenance should be consolidated.' },
      { id: 'skills-graph', label: 'Skills Graph', state: 'partial', evidence: 'Skills Passport, learning skills and career/talent surfaces exist.' },
      { id: 'compliance-graph', label: 'Compliance Graph', state: 'partial', evidence: 'Compliance requirements/radar exist; law-to-control-to-evidence graph remains to formalize.' },
      { id: 'digital-twin', label: 'Digital Twin and Scenario Lab', state: 'implemented', evidence: 'Digital-twin and scenario APIs are present.' },
      { id: 'semantic', label: 'Governed semantic metric registry', state: 'implemented', evidence: 'H51.38 adds versioned metric definition, source lineage, owner and freshness SLA governance.' },
      { id: 'predictive', label: 'Predictive models with model cards/drift/fairness', state: 'partial', evidence: 'Intelligence exists; full certified model-governance lifecycle remains.' },
      { id: 'actionable', label: 'Actionable analytics linked to workflows', state: 'implemented', evidence: 'Next-actions, control tower and governed workflows are present.' },
    ]),
    phase(4, 'Agentic OPSIQO', 'Bounded HR agents and configurable Autopilot with human authority for consequential decisions.', [
      { id: 'agent-governance', label: 'Agent governance and action caps', state: 'implemented', evidence: 'Agent policies, hard max action levels and shadow mode are present.' },
      { id: 'command', label: 'Universal Ask OPSIQO command interface', state: 'implemented', evidence: 'Command, concierge and contextual AI surfaces are present.' },
      { id: 'classification', label: 'Universal Green / Amber / Red action policy', state: 'implemented', evidence: 'H51.38 adds hard-coded action-class policy outside the LLM.' },
      { id: 'autopilot', label: 'Autopilot levels 1-5', state: 'implemented', evidence: 'H51.38 adds tenant-scoped Autopilot policy with fail-closed red actions.' },
      { id: 'agents', label: 'Specialized HR agents', state: 'partial', evidence: 'Manager copilot, recruiting, payroll, meeting, policy and data-intelligence capabilities exist.' },
      { id: 'kill-switch', label: 'Per-agent canary and kill switch', state: 'missing' },
      { id: 'eval', label: 'Tool-use red-team and post-condition certification', state: 'partial', evidence: 'AI governance/evaluation exists; dedicated agent tool-use certification remains.' },
    ]),
    phase(5, 'Platform, Studio & Ecosystem', 'No-code Studio, developer platform, integrations, marketplace and vertical packs.', [
      { id: 'studio', label: 'No-code workflow/forms/rules Studio', state: 'implemented', evidence: 'Draft HR app, simulation/UAT/review/promotion governance exists.' },
      { id: 'integration', label: 'Integration runtime/hub foundation', state: 'implemented', evidence: 'Connectors, contracts, retries, dead letters, replay, reconciliation and sandbox are present.' },
      { id: 'marketplace', label: 'Marketplace governance', state: 'partial', evidence: 'Automation marketplace/install exists; external publisher signing/certification remains.' },
      { id: 'verticals', label: 'Vertical packs / OPSIQO Impact', state: 'partial', evidence: 'Grant/program workforce exists; full donor/volunteer/safeguarding productization remains.' },
      { id: 'developer', label: 'Public API, signed webhooks, SDK and developer portal', state: 'missing' },
      { id: 'trust', label: 'Customer-facing Trust Center and enterprise procurement pack', state: 'missing' },
    ]),
  ];
}

export const STRATEGIC_ACTION_POLICIES: readonly StrategicAgentActionPolicy[] = [
  { key: 'reminder.create', label: 'Create reminder', actionClass: 'green', minimumAutopilotLevel: 4, humanApprovalRequired: false, hardBoundary: 'Low-risk administrative action only.' },
  { key: 'task.create', label: 'Create administrative task', actionClass: 'green', minimumAutopilotLevel: 4, humanApprovalRequired: false, hardBoundary: 'Cannot grant access or alter authoritative employment data.' },
  { key: 'report.draft', label: 'Draft governed report', actionClass: 'green', minimumAutopilotLevel: 4, humanApprovalRequired: false, hardBoundary: 'Draft only; source evidence must remain traceable.' },
  { key: 'workflow.prepare', label: 'Prepare workflow', actionClass: 'green', minimumAutopilotLevel: 3, humanApprovalRequired: false, hardBoundary: 'Preparation does not execute consequential steps.' },
  { key: 'requisition.publish', label: 'Publish job requisition', actionClass: 'amber', minimumAutopilotLevel: 4, humanApprovalRequired: true, hardBoundary: 'Authorized human approval required immediately before execution.' },
  { key: 'compensation.change', label: 'Apply compensation change', actionClass: 'amber', minimumAutopilotLevel: 4, humanApprovalRequired: true, hardBoundary: 'Maker/checker and compensation approval remain authoritative.' },
  { key: 'payroll.correction', label: 'Apply payroll correction', actionClass: 'amber', minimumAutopilotLevel: 4, humanApprovalRequired: true, hardBoundary: 'Payroll approval and reconciliation remain authoritative.' },
  { key: 'payroll.release', label: 'Release payroll', actionClass: 'red', minimumAutopilotLevel: 5, humanApprovalRequired: true, hardBoundary: 'AI may assist only. Authorized human executes payroll release.' },
  { key: 'employee.terminate', label: 'Finalize termination', actionClass: 'red', minimumAutopilotLevel: 5, humanApprovalRequired: true, hardBoundary: 'AI may assist only. Human decision and execution are mandatory.' },
  { key: 'discipline.finalize', label: 'Finalize disciplinary sanction', actionClass: 'red', minimumAutopilotLevel: 5, humanApprovalRequired: true, hardBoundary: 'AI may assist only. Human decision and execution are mandatory.' },
  { key: 'candidate.reject_final', label: 'Final candidate rejection', actionClass: 'red', minimumAutopilotLevel: 5, humanApprovalRequired: true, hardBoundary: 'AI cannot make or execute final adverse employment decisions.' },
];

export interface ActionExecutionDecision {
  allowed: boolean;
  mode: 'inform' | 'recommend' | 'prepare' | 'execute_after_approval' | 'execute' | 'assist_only';
  requiresHumanApproval: boolean;
  reason: string;
}

export function evaluateStrategicAction(
  actionClass: AgentActionClass,
  autopilotLevel: AutopilotLevel,
  humanApproved = false,
): ActionExecutionDecision {
  if (actionClass === 'red') {
    return {
      allowed: false,
      mode: 'assist_only',
      requiresHumanApproval: true,
      reason: 'Red actions can never be completed by an agent-only flow.',
    };
  }
  if (autopilotLevel <= 1) {
    return { allowed: false, mode: 'inform', requiresHumanApproval: actionClass === 'amber', reason: 'Autopilot level 1 is informational only.' };
  }
  if (autopilotLevel === 2) {
    return { allowed: false, mode: 'recommend', requiresHumanApproval: actionClass === 'amber', reason: 'Autopilot level 2 provides recommendations only.' };
  }
  if (autopilotLevel === 3) {
    return { allowed: false, mode: 'prepare', requiresHumanApproval: actionClass === 'amber', reason: 'Autopilot level 3 may prepare a complete workflow but a human submits it.' };
  }
  if (actionClass === 'amber' && !humanApproved) {
    return { allowed: false, mode: 'prepare', requiresHumanApproval: true, reason: 'Amber actions require fresh authorized human approval before execution.' };
  }
  return {
    allowed: true,
    mode: actionClass === 'amber' ? 'execute_after_approval' : 'execute',
    requiresHumanApproval: actionClass === 'amber',
    reason: actionClass === 'amber'
      ? 'Fresh authorized human approval permits this bounded execution.'
      : 'Configured Green action is eligible for bounded execution.',
  };
}

export function defaultCountryPacks(): StrategicCountryPack[] {
  return [
    { country: 'SA', name: 'Saudi Arabia', version: '0.1.0', status: 'draft', officialSources: [] },
    { country: 'AE', name: 'United Arab Emirates', version: '0.1.0', status: 'draft', officialSources: [] },
  ];
}

export function normalizeCountryCode(value: unknown): GccCountryCode | null {
  const code = String(value || '').trim().toUpperCase();
  return code === 'SA' || code === 'AE' ? code : null;
}

export function countryPackActivationBlockers(pack: StrategicCountryPack): string[] {
  const blockers: string[] = [];
  if (!pack.officialSources.length) blockers.push('At least one official regulatory source is required.');
  if (!pack.statutoryRuleSetRef?.trim()) blockers.push('A versioned statutory rule-set reference is required.');
  if (!pack.legalReviewRef?.trim()) blockers.push('Independent legal/compliance review evidence is required.');
  if (!pack.payrollValidationRef?.trim()) blockers.push('Independent payroll validation evidence is required.');
  if (!pack.goldenTestEvidenceRef?.trim()) blockers.push('Approved golden payroll test evidence is required.');
  if (!pack.arabicQaEvidenceRef?.trim()) blockers.push('Arabic/RTL critical-flow QA evidence is required.');
  return blockers;
}

export function metricDefinitionIssues(
  metric: Pick<StrategicMetricDefinition, 'code' | 'name' | 'businessDefinition' | 'formula' | 'grain' | 'sourceEntities' | 'owner' | 'freshnessSlaMinutes'>,
): string[] {
  const issues: string[] = [];
  if (!metric.code.trim()) issues.push('Metric code is required.');
  if (!metric.name.trim()) issues.push('Metric name is required.');
  if (!metric.businessDefinition.trim()) issues.push('Business definition is required.');
  if (!metric.formula.trim()) issues.push('Formula is required.');
  if (!metric.grain.trim()) issues.push('Metric grain is required.');
  if (!metric.sourceEntities.length) issues.push('At least one source entity is required.');
  if (!metric.owner.trim()) issues.push('Metric owner is required.');
  if (!Number.isFinite(metric.freshnessSlaMinutes) || metric.freshnessSlaMinutes < 1) issues.push('Freshness SLA must be at least one minute.');
  return issues;
}

export function overallFivePhaseScore(phases: readonly StrategicFivePhaseAssessment[]): number {
  if (!phases.length) return 0;
  return Math.round(phases.reduce((sum, item) => sum + item.score, 0) / phases.length);
}