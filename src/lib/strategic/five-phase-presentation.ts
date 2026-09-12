import type {
  StrategicCountryPack,
  StrategicFivePhaseAssessment,
} from '@/domain/strategic-five-phase';

export type TowerTab = 'overview' | 'gcc' | 'metrics' | 'agents';

export interface CapabilityPresentation {
  owner: string;
  nextAction: string;
  targetTab?: TowerTab;
  href?: string;
}

const capabilityMap: Record<string, CapabilityPresentation> = {
  'canonical-model': { owner: 'Platform Architecture', nextAction: 'Consolidate canonical schema governance.' },
  events: { owner: 'Platform Engineering', nextAction: 'Keep event contracts and delivery evidence under regression.' },
  orchestration: { owner: 'Workflow Platform', nextAction: 'Converge remaining module-specific state machines.' },
  evidence: { owner: 'Governance & Assurance', nextAction: 'Complete universal reproducible evidence packages.', href: '/governance' },
  'tenant-auth': { owner: 'Security & Identity', nextAction: 'Maintain organization isolation and access reviews.' },
  abac: { owner: 'Security & Privacy', nextAction: 'Complete country/entity/data-class ABAC and field masking.', href: '/privacy' },
  'ai-gateway': { owner: 'AI Governance', nextAction: 'Unify prompt, provider, model, cost and evaluation governance.', targetTab: 'agents' },
  release: { owner: 'Release Engineering', nextAction: 'Maintain exact-SHA release certification.' },

  framework: { owner: 'GCC Product & Compliance', nextAction: 'Maintain evidence-gated country-pack lifecycle.', targetTab: 'gcc' },
  ksa: { owner: 'Saudi Compliance & Payroll', nextAction: 'Load independently verified Saudi statutory rules and golden payroll evidence.', targetTab: 'gcc' },
  uae: { owner: 'UAE Compliance & Payroll', nextAction: 'Load independently verified UAE statutory/free-zone rules and golden payroll evidence.', targetTab: 'gcc' },
  connectors: { owner: 'Integration Engineering', nextAction: 'Bind verified GCC government/payroll adapters through the integration runtime.', targetTab: 'gcc' },
  guard: { owner: 'Payroll & Regulatory', nextAction: 'Extend Payroll Guard with GCC statutory pre-flight controls.', targetTab: 'gcc' },
  arabic: { owner: 'Product Localization', nextAction: 'Certify Arabic/RTL critical payroll and compliance flows.', targetTab: 'gcc' },

  'people-graph': { owner: 'Workforce Intelligence', nextAction: 'Normalize relationship provenance across the enterprise graph.', href: '/people-analytics' },
  'skills-graph': { owner: 'Talent & Learning', nextAction: 'Strengthen skill evidence provenance and aliases.', href: '/learning' },
  'compliance-graph': { owner: 'Compliance Intelligence', nextAction: 'Formalize law → requirement → control → evidence relationships.', href: '/compliance' },
  'digital-twin': { owner: 'Workforce Planning', nextAction: 'Keep assumptions, rule versions and uncertainty traceable.', href: '/workforce-planning' },
  semantic: { owner: 'People Analytics', nextAction: 'Register and approve governed enterprise KPIs.', targetTab: 'metrics' },
  predictive: { owner: 'AI Governance', nextAction: 'Add model cards, drift, calibration and fairness certification.', targetTab: 'agents' },
  actionable: { owner: 'People Analytics', nextAction: 'Keep insights connected to governed next actions.', href: '/people-analytics' },

  'agent-governance': { owner: 'AI Governance', nextAction: 'Maintain hard agent action caps.', targetTab: 'agents' },
  command: { owner: 'OPSIQO One', nextAction: 'Expand permission-scoped command coverage safely.', targetTab: 'agents' },
  classification: { owner: 'AI Governance', nextAction: 'Maintain Green / Amber / Red classification outside the LLM.', targetTab: 'agents' },
  autopilot: { owner: 'AI Governance', nextAction: 'Tune tenant Autopilot within hard safety boundaries.', targetTab: 'agents' },
  agents: { owner: 'AI Product', nextAction: 'Certify specialized agents against domain post-conditions.', targetTab: 'agents' },
  'kill-switch': { owner: 'AI Reliability', nextAction: 'Implement per-agent canary rollout and emergency kill switches.', targetTab: 'agents' },
  eval: { owner: 'AI Assurance', nextAction: 'Complete tool-use red-team and post-condition certification.', targetTab: 'agents' },

  studio: { owner: 'Platform Studio', nextAction: 'Maintain Studio simulation, UAT and promotion governance.' },
  integration: { owner: 'Integrations', nextAction: 'Productize certified external connectors.', href: '/integrations' },
  marketplace: { owner: 'Ecosystem', nextAction: 'Add publisher signing, certification and rollback.' },
  verticals: { owner: 'Industry Solutions', nextAction: 'Productize OPSIQO Impact vertical capabilities.' },
  developer: { owner: 'Developer Platform', nextAction: 'Build public API, signed webhooks, SDK and developer portal.', href: '/integrations' },
  trust: { owner: 'Trust & Assurance', nextAction: 'Build customer-facing Trust Center and procurement evidence pack.', href: '/governance' },
};

export const SCORE_METHODOLOGY =
  'Implementation score only: Implemented = 1.0, Partial = 0.5, Missing = 0.0. Each phase is the mean of its checklist items; the overall blueprint score is the mean of the five phase scores. This score is not regulatory certification, is not UAT certification, is not production certification, and is not legal advice.';

export function displayPhaseName(phase: Pick<StrategicFivePhaseAssessment, 'id' | 'name'>): string {
  return phase.id === 2 ? 'GCC Platform Readiness' : phase.name;
}

export function capabilityPresentation(id: string): CapabilityPresentation {
  return capabilityMap[id] || {
    owner: 'Strategic Transformation',
    nextAction: 'Review evidence and assign the next governed closure action.',
  };
}

export function countryPackCertification(pack: StrategicCountryPack): {
  label: string;
  evidenceComplete: number;
  evidenceRequired: number;
  detail: string;
} {
  const evidence = [
    pack.officialSources.length > 0,
    Boolean(pack.statutoryRuleSetRef?.trim()),
    Boolean(pack.legalReviewRef?.trim()),
    Boolean(pack.payrollValidationRef?.trim()),
    Boolean(pack.goldenTestEvidenceRef?.trim()),
    Boolean(pack.arabicQaEvidenceRef?.trim()),
  ];
  const evidenceComplete = evidence.filter(Boolean).length;
  const evidenceRequired = evidence.length;
  const gated = pack.status === 'active' && evidenceComplete === evidenceRequired;
  return {
    label: gated ? 'EVIDENCE-GATED PACK ACTIVE' : 'NOT CERTIFIED',
    evidenceComplete,
    evidenceRequired,
    detail: gated
      ? 'The governed country pack is active with all required release evidence recorded. This remains a platform evidence state, not legal advice.'
      : `Country pack is ${pack.status}. Regulatory certification must not be inferred from platform-readiness scoring.`,
  };
}