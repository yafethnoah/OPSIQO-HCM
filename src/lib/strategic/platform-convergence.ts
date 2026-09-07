import type { StrategicPhaseId } from './types';

export type PlatformConvergenceStatus =
  | 'validated'
  | 'partial'
  | 'open';

export interface PlatformCapabilityEvidence {
  phaseId: StrategicPhaseId;
  name: string;
  status: PlatformConvergenceStatus;
  capabilitySurfaces: readonly string[];
  validationSurfaces: readonly string[];
  controls: readonly string[];
  remainingGap?: string;
}

export const platformCapabilityConvergence: readonly PlatformCapabilityEvidence[] = [
  {
    phaseId: 8,
    name: 'Launch migration',
    status: 'validated',
    capabilitySurfaces: [
      'src/lib/opsiqo-one/organization-launchpad.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/organization-launchpad/route.ts',
      'src/app/api/organizations/[orgId]/imports/employees/route.ts',
    ],
    validationSurfaces: [
      'tests/opsiqo85/universal-import-v2.test.ts',
      'tests/contract-import.test.ts',
    ],
    controls: [
      'migration readiness is explicit',
      'imports remain authoritative-domain governed',
      'migration evidence remains organization scoped',
    ],
  },
  {
    phaseId: 9,
    name: 'Zero-config',
    status: 'validated',
    capabilitySurfaces: [
      'src/lib/opsiqo-one/organization-launchpad.ts',
      'src/app/api/setup/route.ts',
      'src/app/api/organizations/[orgId]/platform-settings/route.ts',
    ],
    validationSurfaces: [
      'tests/organization-bootstrap.test.ts',
      'tests/opsiqo85/platform-settings.test.ts',
    ],
    controls: [
      'defaults are governed configuration',
      'tenant bootstrap remains organization scoped',
      'configuration does not bypass authorization',
    ],
  },
  {
    phaseId: 10,
    name: 'One Screen UX',
    status: 'validated',
    capabilitySurfaces: [
      'src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts',
      'src/app/api/organizations/[orgId]/superapp/dashboard/route.ts',
      'src/app/api/organizations/[orgId]/enterprise-command/dashboard/route.ts',
    ],
    validationSurfaces: [
      'tests/superapp.test.ts',
      'tests/enterprise-command.test.ts',
      'tests/opsiqo85/opsiqo-one-v7-32.test.ts',
    ],
    controls: [
      'unified surfaces do not become independent systems of record',
      'authoritative writes remain behind governed domain services',
      'click-count benchmark remains telemetry, not inferred from route existence',
    ],
  },
  {
    phaseId: 11,
    name: 'Proactive Human Ops',
    status: 'validated',
    capabilitySurfaces: [
      'src/app/api/organizations/[orgId]/opsiqo-one/daily-brief/route.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/concierge/route.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/manager-copilot/route.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/meeting-actions/[draftId]/promote/route.ts',
    ],
    validationSurfaces: [
      'tests/opsiqo85/opsiqo-one-v7-32.test.ts',
      'tests/enterprise-command.test.ts',
    ],
    controls: [
      'proactive recommendations are not autonomous consequential decisions',
      'promotion of drafted work remains governed',
      'human-control boundaries inherit the strategic orchestrator',
    ],
  },
  {
    phaseId: 15,
    name: 'Integration Fabric',
    status: 'validated',
    capabilitySurfaces: [
      'src/app/api/organizations/[orgId]/integrations/runtime/execute/route.ts',
      'src/app/api/organizations/[orgId]/integrations/runtime/profiles/route.ts',
      'src/app/api/organizations/[orgId]/integrations/reconciliations/route.ts',
    ],
    validationSurfaces: [
      'tests/integration-runtime.test.ts',
      'tests/integration-governance.test.ts',
      'tests/opsiqo85/integration-production-uat-v7-23.test.ts',
    ],
    controls: [
      'staging and contract validation precede authoritative mutation',
      'idempotency and reconciliation are mandatory',
      'integration runtime cannot directly mutate consequential HCM domains',
    ],
  },
  {
    phaseId: 16,
    name: 'Marketplace and Industry Packs',
    status: 'validated',
    capabilitySurfaces: [
      'src/app/api/organizations/[orgId]/opsiqo-one/automation-marketplace/route.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/automation-marketplace/[packId]/install/route.ts',
    ],
    validationSurfaces: [
      'tests/opsiqo85/opsiqo-one-v7-32.test.ts',
      'tests/opsiqo85/automation-v7-7.test.ts',
    ],
    controls: [
      'pack installation remains tenant scoped',
      'installed automations inherit runtime authorization',
      'marketplace installation does not grant new actor permissions',
    ],
  },
  {
    phaseId: 17,
    name: 'AI HR Process Generator',
    status: 'validated',
    capabilitySurfaces: [
      'src/lib/strategic/hr-process-generator.ts',
      'src/app/api/strategic-roadmap/process-generator/[orgId]/route.ts',
      'src/app/api/organizations/[orgId]/opsiqo-one/agent-builder/route.ts',
      'src/app/api/organizations/[orgId]/workflows/route.ts',
      'src/lib/strategic/orchestrator-bridge.ts',
    ],
    validationSurfaces: [
      'tests/strategic-final-gap-closure.test.ts',
      'tests/ai-governance.test.ts',
      'tests/workflow.test.ts',
      'tests/strategic-orchestrator-convergence.test.ts',
    ],
    controls: [
      'generated plans remain disabled drafts until governed activation',
      'generated steps bind only to registered authoritative service hints',
      'generated consequential actions cannot self-approve',
      'R5 and R6 generated processes require explicit human-control steps',
    ],
  },
  {
    phaseId: 19,
    name: 'Explainable AI',
    status: 'validated',
    capabilitySurfaces: [
      'src/lib/strategic/knowledge-graph.ts',
      'src/lib/strategic/types.ts',
    ],
    validationSurfaces: [
      'tests/strategic-roadmap.test.ts',
      'tests/ai-governance.test.ts',
      'tests/ai-evals/safetyAssertions.test.ts',
    ],
    controls: [
      'material AI output requires evidence',
      'confidence and assumptions are explicit',
      'limitations and model provenance are retained',
    ],
  },
  {
    phaseId: 20,
    name: 'Enterprise Security and Trust',
    status: 'validated',
    capabilitySurfaces: [
      'src/app/api/organizations/[orgId]/security-operations/privileged-access/route.ts',
      'src/app/api/organizations/[orgId]/security-operations/break-glass/route.ts',
      'src/app/api/organizations/[orgId]/privacy/ai-model-risks/route.ts',
    ],
    validationSurfaces: [
      'tests/security-operations.test.ts',
      'tests/identity-governance.test.ts',
      'tests/privacy-governance.test.ts',
    ],
    controls: [
      'privileged access is governed',
      'tenant and identity boundaries remain enforced',
      'AI risk and privacy evidence remain server governed',
    ],
  },
  {
    phaseId: 21,
    name: 'Reliability',
    status: 'validated',
    capabilitySurfaces: [
      'src/app/api/organizations/[orgId]/platform-reliability/capture/route.ts',
      'src/app/api/organizations/[orgId]/platform-reliability/provenance/route.ts',
      'src/app/api/organizations/[orgId]/platform-reliability/dr-exercises/route.ts',
    ],
    validationSurfaces: [
      'tests/platform-reliability.test.ts',
      'tests/production-evidence.test.ts',
      'tests/resilience-governance.test.ts',
    ],
    controls: [
      'release provenance is evidence backed',
      'DR and recovery evidence are controlled',
      'production promotion remains fail closed',
    ],
  },
  {
    phaseId: 22,
    name: 'Mobile frontline',
    status: 'validated',
    capabilitySurfaces: [
      'src/app/api/organizations/[orgId]/mobile/bootstrap/route.ts',
      'src/app/api/organizations/[orgId]/mobile/devices/route.ts',
    ],
    validationSurfaces: [
      'tests/mobile-employee-h47.test.ts',
      'tests/mobile-employee-h47-1f.test.ts',
    ],
    controls: [
      'mobile bootstrap remains authenticated and tenant scoped',
      'mobile operations inherit domain authorization',
      'frontline UX does not create a parallel authority layer',
    ],
  },
  {
    phaseId: 23,
    name: 'Voice HR',
    status: 'validated',
    capabilitySurfaces: [
      'src/lib/strategic/voice-hr.ts',
      'src/lib/strategic/voice-browser.ts',
      'src/app/api/strategic-roadmap/voice/[orgId]/route.ts',
      'src/lib/opsiqo-one/command-router.ts',
    ],
    validationSurfaces: [
      'tests/strategic-final-gap-closure.test.ts',
      'tests/enterprise-command.test.ts',
    ],
    controls: [
      'voice never performs direct authoritative execution',
      'browser speech capture and synthesis are adapters around the governed server command layer',
      'R3-R6 voice requests remain subject to confirmation, approval or human-decision controls',
      'voice runtime does not persist transcripts',
    ],
  },
  {
    phaseId: 24,
    name: 'Permanent benchmark suite',
    status: 'validated',
    capabilitySurfaces: [
      'src/lib/strategic/benchmark-suite.ts',
      'src/lib/strategic/benchmark-telemetry.ts',
    ],
    validationSurfaces: [
      'tests/strategic-roadmap.test.ts',
      'tests/strategic-runtime.test.ts',
    ],
    controls: [
      'zero autonomous consequential decisions is permanent',
      'AI evidence coverage is measured',
      'benchmark telemetry is privacy bounded',
    ],
  },
] as const;

export function platformConvergenceSummary(): {
  total: number;
  validated: number;
  partial: number;
  open: number;
  validatedPhaseIds: StrategicPhaseId[];
  partialPhaseIds: StrategicPhaseId[];
  openPhaseIds: StrategicPhaseId[];
  statement: string;
} {
  const validatedPhaseIds = platformCapabilityConvergence
    .filter((phase) => phase.status === 'validated')
    .map((phase) => phase.phaseId);

  const partialPhaseIds = platformCapabilityConvergence
    .filter((phase) => phase.status === 'partial')
    .map((phase) => phase.phaseId);

  const openPhaseIds = platformCapabilityConvergence
    .filter((phase) => phase.status === 'open')
    .map((phase) => phase.phaseId);

  return {
    total: platformCapabilityConvergence.length,
    validated: validatedPhaseIds.length,
    partial: partialPhaseIds.length,
    open: openPhaseIds.length,
    validatedPhaseIds,
    partialPhaseIds,
    openPhaseIds,
    statement:
      'Platform convergence evidence is local source/test evidence only. It does not constitute exact-SHA UAT verification.',
  };
}

export function phaseCapability(
  phaseId: StrategicPhaseId,
): PlatformCapabilityEvidence | undefined {
  return platformCapabilityConvergence.find(
    (phase) => phase.phaseId === phaseId,
  );
}
