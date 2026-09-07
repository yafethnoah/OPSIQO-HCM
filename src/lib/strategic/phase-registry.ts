import type { StrategicPhaseDefinition } from './types';

export const strategicPhases: readonly StrategicPhaseDefinition[] = [
  {
    id: 1,
    name: 'Enterprise Object Graph',
    objective: 'Canonical organization-scoped, effective-dated object model with lifecycle, versioning, evidence and events.',
    existingCapabilities: ['/organization', '/people', '/workforce-registry'],
    requiredControls: ['canonical-id', 'org-scope', 'effective-dating', 'optimistic-locking', 'domain-events'],
  },
  {
    id: 2,
    name: 'Knowledge Graph',
    objective: 'Evidence-backed organizational knowledge and provenance.',
    existingCapabilities: ['/organizational-memory', '/evidence-center', '/policy-intelligence'],
    requiredControls: ['evidence', 'confidence', 'provenance', 'assumptions'],
  },
  {
    id: 3,
    name: 'Agent Operating System',
    objective: 'Governed agent registry, scopes, permissions and lifecycle.',
    existingCapabilities: ['/agent-builder', '/ai-governance'],
    requiredControls: ['agent-registry', 'allow-list', 'permission-check', 'versioning'],
  },
  {
    id: 4,
    name: 'OPSIQO Do',
    objective: 'Plan, preview, confirm and execute authorized work through authoritative services.',
    existingCapabilities: ['/operations-orchestrator', '/my-work', '/automation'],
    requiredControls: ['preview', 'confirmation', 'idempotency', 'authoritative-service'],
  },
  {
    id: 5,
    name: 'AI Action Risk Engine',
    objective: 'Risk-tier every action and preserve human authority for consequential decisions.',
    existingCapabilities: ['/ai-governance', '/security'],
    requiredControls: ['R0-R6', 'human-decision', 'specialist-review', 'permission-recheck'],
  },
  {
    id: 6,
    name: 'Workforce Digital Twin',
    objective: 'Scenario modeling with assumptions, evidence and impact deltas.',
    existingCapabilities: ['/scenario-lab', '/workforce-planning', '/people-analytics'],
    requiredControls: ['baseline', 'scenario', 'impact-preview', 'assumptions'],
  },
  {
    id: 7,
    name: 'Compliance Intelligence',
    objective: 'Turn authoritative regulatory changes into evidence-backed impacts and governed actions.',
    existingCapabilities: ['/compliance-radar', '/regulatory', '/policy-intelligence'],
    requiredControls: ['authority-evidence', 'impact-map', 'legal-review'],
  },
  {
    id: 8,
    name: 'Launch Migration',
    objective: 'Governed data migration and evidence-first organization launch.',
    existingCapabilities: ['/organization-launchpad', '/import-center', '/contract-import'],
    requiredControls: ['validation', 'mapping', 'dedupe', 'human-review'],
  },
  {
    id: 9,
    name: 'Zero-Config HCM',
    objective: 'Progressive defaults with governed configuration rather than opaque code.',
    existingCapabilities: ['/setup', '/platform-settings'],
    requiredControls: ['safe-defaults', 'configuration-policy', 'tenant-scope'],
  },
  {
    id: 10,
    name: 'One Screen UX',
    objective: 'Role-aware command surface with common actions in three clicks or fewer.',
    existingCapabilities: ['/home', '/dashboard', '/my-work', '/operations-cockpit'],
    requiredControls: ['role-context', 'action-priority', 'progressive-disclosure'],
  },
  {
    id: 11,
    name: 'Proactive Human Operations',
    objective: 'Surface evidence-backed work before the user must search for it.',
    existingCapabilities: ['/daily-brief', '/concierge', '/notifications'],
    requiredControls: ['priority', 'explainability', 'no-consequential-auto-action'],
  },
  {
    id: 12,
    name: 'Skills Graph',
    objective: 'Connect workers, roles, skills, learning and career mobility.',
    existingCapabilities: ['/skills-passport', '/learning', '/career-gps', '/talent-marketplace'],
    requiredControls: ['skill-evidence', 'effective-dating', 'confidence'],
  },
  {
    id: 13,
    name: 'Next-Generation ATS',
    objective: 'Evidence-based recruiting intelligence without automatic employment decisions.',
    existingCapabilities: ['/recruiting', '/prehire'],
    requiredControls: ['job-evidence', 'protected-trait-exclusion', 'human-hiring-decision'],
  },
  {
    id: 14,
    name: 'Payroll Control Tower',
    objective: 'Governed payroll readiness, time integrity, exceptions and export evidence.',
    existingCapabilities: ['/time', '/compensation'],
    requiredControls: ['approved-only', 'period-integrity', 'audit-evidence'],
  },
  {
    id: 15,
    name: 'Integration Fabric',
    objective: 'Versioned contracts, governed connectors, staging and reconciliation.',
    existingCapabilities: ['/integrations'],
    requiredControls: ['contract-versioning', 'staging', 'idempotency', 'reconciliation'],
  },
  {
    id: 16,
    name: 'Marketplace and Industry Packs',
    objective: 'Governed reusable automation and configuration packs.',
    existingCapabilities: ['/automation-marketplace'],
    requiredControls: ['pack-versioning', 'review', 'permissions'],
  },
  {
    id: 17,
    name: 'AI HR Process Generator',
    objective: 'Generate draft HR processes that remain governed configurations.',
    existingCapabilities: ['/agent-builder', '/automation', '/workflows'],
    requiredControls: ['draft-only', 'review', 'versioning', 'policy-binding'],
  },
  {
    id: 18,
    name: 'Decision Intelligence and Impact Preview',
    objective: 'Preview operational and workforce consequences before consequential action.',
    existingCapabilities: ['/scenario-lab', '/strategy', '/org-design'],
    requiredControls: ['impact-preview', 'assumptions', 'human-decision'],
  },
  {
    id: 19,
    name: 'Explainable AI',
    objective: 'Material AI outputs carry evidence, confidence, assumptions, limitations and provenance.',
    existingCapabilities: ['/ai-governance', '/evidence-center'],
    requiredControls: ['evidence', 'confidence', 'assumptions', 'limitations', 'model-provenance'],
  },
  {
    id: 20,
    name: 'Enterprise Security and Trust',
    objective: 'Zero-trust identity, privileged access governance and cyber-resilience evidence.',
    existingCapabilities: ['/identity', '/security-operations', '/privacy'],
    requiredControls: ['least-privilege', 'break-glass', 'recertification', 'privacy'],
  },
  {
    id: 21,
    name: 'Reliability Engineering',
    objective: 'Release, DR, supply-chain, SLO and incident evidence.',
    existingCapabilities: ['/platform-reliability'],
    requiredControls: ['exact-sha', 'source-manifest', 'dr', 'slo', 'provenance'],
  },
  {
    id: 22,
    name: 'Mobile Frontline',
    objective: 'Mobile employee workflows consume stable governed APIs.',
    existingCapabilities: ['/download-app', '/self-service', '/employee'],
    requiredControls: ['api-contract', 'device-governance', 'offline-safe-boundary'],
  },
  {
    id: 23,
    name: 'Voice HR',
    objective: 'Voice becomes an input channel to the same governed action model.',
    existingCapabilities: ['/concierge', '/ai-copilot'],
    requiredControls: ['intent-preview', 'confirmation', 'risk-tier', 'no-direct-write'],
  },
  {
    id: 24,
    name: 'Permanent Benchmark Suite',
    objective: 'Continuously enforce usability, evidence, automation and safety targets.',
    existingCapabilities: ['/platform-reliability', '/operations-cockpit'],
    requiredControls: ['benchmarks', 'regression', 'release-gate', 'zero-consequential-autonomy'],
  },
] as const;

export function getStrategicPhase(id: number): StrategicPhaseDefinition {
  const phase = strategicPhases.find((candidate) => candidate.id === id);
  if (!phase) throw new Error(`unknown strategic phase: ${id}`);
  return phase;
}

export function assertStrategicCoverage(): void {
  if (strategicPhases.length !== 24) {
    throw new Error('all 24 strategic phases must be registered');
  }
  const ids = new Set(strategicPhases.map((phase) => phase.id));
  if (ids.size !== 24) throw new Error('strategic phase IDs must be unique');

  for (const phase of strategicPhases) {
    if (phase.existingCapabilities.length === 0) {
      throw new Error(`phase ${phase.id} has no mapped OPSIQO capability`);
    }
    if (phase.requiredControls.length === 0) {
      throw new Error(`phase ${phase.id} has no governed control`);
    }
  }
}
