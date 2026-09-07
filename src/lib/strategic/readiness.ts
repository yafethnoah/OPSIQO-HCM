import { strategicPhases } from './phase-registry';
import type { StrategicPhaseId } from './types';

export type PhaseReadinessState =
  | 'registered'
  | 'contract-ready'
  | 'runtime-foundation'
  | 'domain-integrated'
  | 'validated'
  | 'uat-verified';

export interface PhaseReadinessEvidence {
  contractFiles?: readonly string[];
  runtimeFoundationFiles?: readonly string[];
  domainAdapterFiles?: readonly string[];
  validationEvidence?: readonly string[];
  uatEvidence?: readonly string[];
}

export interface PhaseReadiness {
  id: StrategicPhaseId;
  name: string;
  state: PhaseReadinessState;
  evidence: PhaseReadinessEvidence;
}

const stateOrder: readonly PhaseReadinessState[] = [
  'registered',
  'contract-ready',
  'runtime-foundation',
  'domain-integrated',
  'validated',
  'uat-verified',
];

const orchestratorBridgeEvidence: PhaseReadinessEvidence = {
  contractFiles: ['src/lib/strategic/agent-os.ts'],
  runtimeFoundationFiles: ['src/lib/strategic/runtime-gateway.ts'],
  domainAdapterFiles: ['src/lib/strategic/orchestrator-bridge.ts'],
  validationEvidence: [
    'tests/strategic-orchestrator-convergence.test.ts',
    'tests/orchestrator/engine.test.ts',
    'tests/orchestrator/governance.test.ts',
  ],
};

const workforceScenarioEvidence: PhaseReadinessEvidence = {
  contractFiles: ['src/lib/strategic/digital-twin.ts'],
  runtimeFoundationFiles: ['src/lib/strategic/runtime-gateway.ts'],
  domainAdapterFiles: ['src/lib/strategic/enterprise-domain-bindings.ts'],
  validationEvidence: [
    'tests/strategic-enterprise-domain-bindings.test.ts',
    'tests/workforce-planning.schemas.test.ts',
  ],
};

const complianceEvidence: PhaseReadinessEvidence = {
  contractFiles: ['src/lib/strategic/compliance-intelligence.ts'],
  runtimeFoundationFiles: ['src/lib/strategic/runtime-gateway.ts'],
  domainAdapterFiles: ['src/lib/strategic/enterprise-domain-bindings.ts'],
  validationEvidence: [
    'tests/strategic-enterprise-domain-bindings.test.ts',
    'tests/regulatory-governance.test.ts',
  ],
};

const skillsEvidence: PhaseReadinessEvidence = {
  contractFiles: ['src/lib/strategic/knowledge-graph.ts'],
  runtimeFoundationFiles: ['src/lib/strategic/runtime-gateway.ts'],
  domainAdapterFiles: ['src/lib/strategic/enterprise-domain-bindings.ts'],
  validationEvidence: [
    'tests/strategic-enterprise-domain-bindings.test.ts',
    'tests/learning.schemas.test.ts',
    'tests/career.schemas.test.ts',
  ],
};

const recruitingEvidence: PhaseReadinessEvidence = {
  contractFiles: ['src/lib/strategic/agent-os.ts'],
  runtimeFoundationFiles: ['src/lib/strategic/runtime-gateway.ts'],
  domainAdapterFiles: ['src/lib/strategic/domain-bindings.ts'],
  validationEvidence: [
    'tests/strategic-domain-bindings.test.ts',
    'tests/recruiting.test.ts',
    'tests/recruiting-intelligence-h45b.test.ts',
  ],
};

const payrollEvidence: PhaseReadinessEvidence = {
  contractFiles: ['src/lib/strategic/agent-os.ts'],
  runtimeFoundationFiles: ['src/lib/strategic/runtime-gateway.ts'],
  domainAdapterFiles: ['src/lib/strategic/domain-bindings.ts'],
  validationEvidence: [
    'tests/strategic-domain-bindings.test.ts',
    'tests/h48-7-payroll-period-integrity.test.ts',
    'tests/time-attendance-expense-h46.test.ts',
  ],
};

const platformEvidence = (
  capabilityFiles: readonly string[],
  validationEvidence: readonly string[],
): PhaseReadinessEvidence => ({
  contractFiles: ['src/lib/strategic/platform-convergence.ts'],
  runtimeFoundationFiles: ['src/lib/strategic/runtime-gateway.ts'],
  domainAdapterFiles: capabilityFiles,
  validationEvidence,
});

export const currentStrategicFoundationEvidence: Readonly<
  Partial<Record<StrategicPhaseId, PhaseReadinessEvidence>>
> = {
  1: {
    contractFiles: ['src/lib/strategic/enterprise-object-graph.ts'],
    runtimeFoundationFiles: ['src/lib/strategic/context-runtime.ts'],
    domainAdapterFiles: [
      'src/lib/strategic/orchestrator-bridge.ts',
      'src/lib/strategic/domain-bindings.ts',
      'src/lib/strategic/enterprise-domain-bindings.ts',
    ],
    validationEvidence: [
      'tests/strategic-final-gap-closure.test.ts',
      'tests/strategic-domain-bindings.test.ts',
      'tests/strategic-enterprise-domain-bindings.test.ts',
    ],
  },
  2: {
    contractFiles: ['src/lib/strategic/knowledge-graph.ts'],
    runtimeFoundationFiles: ['src/lib/strategic/context-runtime.ts'],
    domainAdapterFiles: [
      'src/lib/opsiqo-one/organizational-memory.ts',
      'src/app/api/strategic-roadmap/context/[orgId]/route.ts',
    ],
    validationEvidence: [
      'tests/strategic-final-gap-closure.test.ts',
      'tests/ai-governance.test.ts',
    ],
  },
  3: orchestratorBridgeEvidence,
  4: orchestratorBridgeEvidence,
  5: orchestratorBridgeEvidence,
  6: workforceScenarioEvidence,
  7: complianceEvidence,
  8: platformEvidence(
    [
      'src/lib/opsiqo-one/organization-launchpad.ts',
      'src/app/api/organizations/[orgId]/imports/employees/route.ts',
    ],
    [
      'tests/opsiqo85/universal-import-v2.test.ts',
      'tests/contract-import.test.ts',
    ],
  ),
  9: platformEvidence(
    [
      'src/lib/opsiqo-one/organization-launchpad.ts',
      'src/app/api/setup/route.ts',
    ],
    [
      'tests/organization-bootstrap.test.ts',
      'tests/opsiqo85/platform-settings.test.ts',
    ],
  ),
  10: platformEvidence(
    [
      'src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts',
      'src/app/api/organizations/[orgId]/superapp/dashboard/route.ts',
    ],
    [
      'tests/superapp.test.ts',
      'tests/enterprise-command.test.ts',
    ],
  ),
  11: platformEvidence(
    [
      'src/app/api/organizations/[orgId]/opsiqo-one/daily-brief/route.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/concierge/route.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/manager-copilot/route.ts',
    ],
    [
      'tests/opsiqo85/opsiqo-one-v7-32.test.ts',
      'tests/enterprise-command.test.ts',
    ],
  ),
  12: skillsEvidence,
  13: recruitingEvidence,
  14: payrollEvidence,
  15: platformEvidence(
    [
      'src/app/api/organizations/[orgId]/integrations/runtime/execute/route.ts',
      'src/app/api/organizations/[orgId]/integrations/reconciliations/route.ts',
    ],
    [
      'tests/integration-runtime.test.ts',
      'tests/integration-governance.test.ts',
    ],
  ),
  16: platformEvidence(
    [
      'src/app/api/organizations/[orgId]/opsiqo-one/automation-marketplace/[packId]/install/route.ts',
    ],
    [
      'tests/opsiqo85/opsiqo-one-v7-32.test.ts',
      'tests/opsiqo85/automation-v7-7.test.ts',
    ],
  ),
  17: {
    contractFiles: ['src/lib/strategic/platform-convergence.ts'],
    runtimeFoundationFiles: [
      'src/lib/strategic/orchestrator-bridge.ts',
      'src/lib/strategic/hr-process-generator.ts',
    ],
    domainAdapterFiles: [
      'src/app/api/strategic-roadmap/process-generator/[orgId]/route.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/agent-builder/route.ts',
      'src/app/api/organizations/[orgId]/workflows/route.ts',
    ],
    validationEvidence: [
      'tests/strategic-final-gap-closure.test.ts',
      'tests/workflow.test.ts',
      'tests/ai-governance.test.ts',
    ],
  },
  18: workforceScenarioEvidence,
  19: platformEvidence(
    [
      'src/lib/strategic/knowledge-graph.ts',
      'src/lib/strategic/types.ts',
    ],
    [
      'tests/strategic-roadmap.test.ts',
      'tests/ai-governance.test.ts',
      'tests/ai-evals/safetyAssertions.test.ts',
    ],
  ),
  20: platformEvidence(
    [
      'src/app/api/organizations/[orgId]/security-operations/privileged-access/route.ts',
      'src/app/api/organizations/[orgId]/privacy/ai-model-risks/route.ts',
    ],
    [
      'tests/security-operations.test.ts',
      'tests/identity-governance.test.ts',
      'tests/privacy-governance.test.ts',
    ],
  ),
  21: platformEvidence(
    [
      'src/app/api/organizations/[orgId]/platform-reliability/capture/route.ts',
      'src/app/api/organizations/[orgId]/platform-reliability/provenance/route.ts',
    ],
    [
      'tests/platform-reliability.test.ts',
      'tests/production-evidence.test.ts',
    ],
  ),
  22: platformEvidence(
    [
      'src/app/api/organizations/[orgId]/mobile/bootstrap/route.ts',
      'src/app/api/organizations/[orgId]/mobile/devices/route.ts',
    ],
    [
      'tests/mobile-employee-h47.test.ts',
      'tests/mobile-employee-h47-1f.test.ts',
    ],
  ),
  23: {
    contractFiles: ['src/lib/strategic/platform-convergence.ts'],
    runtimeFoundationFiles: [
      'src/lib/strategic/voice-hr.ts',
      'src/lib/strategic/voice-browser.ts',
    ],
    domainAdapterFiles: [
      'src/app/api/strategic-roadmap/voice/[orgId]/route.ts',
      'src/lib/opsiqo-one/command-router.ts',
    ],
    validationEvidence: [
      'tests/strategic-final-gap-closure.test.ts',
      'tests/enterprise-command.test.ts',
    ],
  },
  24: platformEvidence(
    [
      'src/lib/strategic/benchmark-suite.ts',
      'src/lib/strategic/benchmark-telemetry.ts',
    ],
    [
      'tests/strategic-roadmap.test.ts',
      'tests/strategic-runtime.test.ts',
    ],
  ),
};

export function derivePhaseReadiness(
  evidence: PhaseReadinessEvidence = {},
): PhaseReadinessState {
  if (!hasValues(evidence.contractFiles)) return 'registered';
  if (!hasValues(evidence.runtimeFoundationFiles)) return 'contract-ready';
  if (!hasValues(evidence.domainAdapterFiles)) return 'runtime-foundation';
  if (!hasValues(evidence.validationEvidence)) return 'domain-integrated';
  if (!hasValues(evidence.uatEvidence)) return 'validated';
  return 'uat-verified';
}

export function strategicReadinessSnapshot(
  evidenceByPhase: Readonly<
    Partial<Record<StrategicPhaseId, PhaseReadinessEvidence>>
  > = currentStrategicFoundationEvidence,
): {
  totalPhases: number;
  counts: Record<PhaseReadinessState, number>;
  phases: PhaseReadiness[];
  domainIntegratedOrBetter: number;
  validatedOrBetter: number;
  uatVerified: number;
  statement: string;
} {
  const phases: PhaseReadiness[] = strategicPhases.map((phase) => {
    const evidence = evidenceByPhase[phase.id] ?? {};
    return {
      id: phase.id,
      name: phase.name,
      state: derivePhaseReadiness(evidence),
      evidence,
    };
  });

  const counts = Object.fromEntries(
    stateOrder.map((state) => [
      state,
      phases.filter((phase) => phase.state === state).length,
    ]),
  ) as Record<PhaseReadinessState, number>;

  const atLeast = (state: PhaseReadinessState): number => {
    const minimum = stateOrder.indexOf(state);
    return phases.filter(
      (phase) => stateOrder.indexOf(phase.state) >= minimum,
    ).length;
  };

  return {
    totalPhases: phases.length,
    counts,
    phases,
    domainIntegratedOrBetter: atLeast('domain-integrated'),
    validatedOrBetter: atLeast('validated'),
    uatVerified: counts['uat-verified'],
    statement:
      'Local domain, orchestrator and platform validation is not UAT verification. Exact-SHA UAT remains zero until the final H49 release candidate is frozen, pushed and validated on the governed UAT URL.',
  };
}

function hasValues(values?: readonly string[]): boolean {
  return Array.isArray(values) && values.length > 0;
}
