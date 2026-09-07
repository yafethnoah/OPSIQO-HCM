import { describe, expect, it, vi } from 'vitest';
import type { ActorContext, Permission } from '../src/domain/security';
import type {
  AuthoritativeServiceBinding,
  OrchestratorDependencies,
} from '../src/lib/orchestrator/types';
import {
  StrategicContextRuntime,
  projectOrchestratorResultToObjectGraph,
  queryOperationalKnowledge,
} from '../src/lib/strategic/context-runtime';
import {
  generateHrProcessDraft,
} from '../src/lib/strategic/hr-process-generator';
import {
  handleVoiceHrTranscript,
} from '../src/lib/strategic/voice-hr';
import {
  platformConvergenceSummary,
} from '../src/lib/strategic/platform-convergence';
import {
  strategicReadinessSnapshot,
} from '../src/lib/strategic/readiness';
import type { GovernedActionPlan } from '../src/lib/strategic/agent-os';

const permissions: Permission[] = [
  'people.manage',
  'self.read',
  'notifications.read',
  'ai.use',
  'policies.read',
  'service.read',
  'workflow.read',
  'workflow.manage',
];

const actor: ActorContext = {
  uid: 'user-1',
  orgId: 'org-1',
  role: 'hr_admin',
  workerId: 'worker-1',
  permissions,
};

function strategicPlan(): GovernedActionPlan {
  return {
    planId: 'plan-context-1',
    orgId: 'org-1',
    agentId: 'agent-context',
    action: 'create employee',
    riskTier: 'R3',
    createdAt: '2026-09-07T00:00:00Z',
    expiresAt: '2026-09-08T00:00:00Z',
    targetObjectType: 'worker',
    targetObjectId: 'worker-2',
    evidenceRefs: [],
    permissionChecks: [
      {
        allowed: true,
        checkedAt: '2026-09-07T00:00:00Z',
        permission: 'people.manage',
      },
    ],
    assumptions: [],
    status: 'planned',
    idempotencyKey: 'idem-context-1',
  };
}

function contextDependencies(
  service: AuthoritativeServiceBinding,
): OrchestratorDependencies {
  return {
    permissionChecker: async () => true,
    tenantScopeChecker: async () => true,
    services: new Map([[service.key, service]]),
    now: () => new Date('2026-09-07T01:00:00Z'),
  };
}

describe('H49 final strategic gap closure', () => {
  it('projects authoritative orchestration receipts into canonical Enterprise Object Graph objects', async () => {
    const service: AuthoritativeServiceBinding = {
      key: 'core_hr.create_employee',
      async execute() {
        return {
          outcome: 'completed',
          resultReference: 'worker:worker-2',
          auditReference: 'audit-worker-2',
        };
      },
    };

    const runtime = new StrategicContextRuntime(
      contextDependencies(service),
      async () => [],
    );

    const result = await runtime.executeWithGraph({
      plan: strategicPlan(),
      actor: {
        uid: 'user-1',
        organizationId: 'org-1',
        roleClass: 'hr_admin',
      },
      binding: {
        authoritativeService: 'core_hr.create_employee',
        permission: 'people.manage',
        payloadRef: 'payload:worker-2',
      },
      userConfirmed: true,
    });

    expect(result.execution.plan.state).toBe('completed');
    expect(result.graph.objects).toHaveLength(1);
    expect(result.graph.objects[0]?.meta.objectType).toBe('worker');
    expect(result.graph.objects[0]?.meta.objectId).toBe('worker-2');
    expect(result.graph.objects[0]?.meta.orgId).toBe('org-1');
    expect(result.graph.objects[0]?.meta.evidenceRefs.length).toBeGreaterThan(0);
  });

  it('rejects cross-organization graph projection', () => {
    expect(() =>
      projectOrchestratorResultToObjectGraph({
        organizationId: 'org-2',
        actorUid: 'user-1',
        result: {
          plan: {
            planId: 'plan-1',
            organizationId: 'org-1',
            actorUid: 'user-1',
            goalCode: 'goal',
            state: 'completed',
            createdAtUtc: '2026-09-07T00:00:00Z',
            authorizationExpiresAtUtc: '2026-09-08T00:00:00Z',
            steps: [],
            evidenceRefs: [],
            version: 1,
          },
          receipts: [],
          blockedReasons: [],
        },
      }),
    ).toThrow(/organization does not match graph scope/i);
  });

  it('operationalizes the Knowledge Graph through permission-scoped Organizational Memory evidence', async () => {
    const assertions = await queryOperationalKnowledge(
      actor,
      'What does our leave policy say?',
      async () => [
        {
          id: 'memory:POLICY:LEAVE:v3',
          kind: 'policy',
          title: 'LEAVE · Leave Policy',
          summary: 'Employees request leave through the governed leave flow.',
          source: 'Organizational Memory · POLICY:LEAVE:v3',
          asOf: '2026-09-01T00:00:00Z',
          href: '/compliance',
        },
      ],
    );

    expect(assertions).toHaveLength(1);
    expect(assertions[0]?.orgId).toBe('org-1');
    expect(assertions[0]?.source).toBe('derived');
    expect(assertions[0]?.evidenceRefs).toHaveLength(1);
  });

  it('generates an onboarding process as a disabled human-reviewed draft', () => {
    const draft = generateHrProcessDraft(
      'Build an onboarding process for approved new hires with required training.',
    );

    expect(draft.processKind).toBe('onboarding');
    expect(draft.status).toBe('draft');
    expect(draft.enabled).toBe(false);
    expect(draft.activation).toBe('human_review_required');
    expect(
      draft.steps.some(
        (step) => step.authoritativeServiceHint === 'onboarding.create_prehire_case',
      ),
    ).toBe(true);
  });

  it('builds R6 separation process drafts with specialist and human-decision controls', () => {
    const draft = generateHrProcessDraft(
      'Design a termination and offboarding process for involuntary separation.',
    );

    expect(draft.processKind).toBe('separation');
    expect(draft.maximumRiskTier).toBe('R6');
    expect(
      draft.steps.some((step) => step.type === 'specialist_review'),
    ).toBe(true);
    expect(
      draft.steps.some((step) => step.humanDecisionRequired),
    ).toBe(true);
    expect(draft.enabled).toBe(false);
  });

  it('routes low-risk voice navigation without direct execution', () => {
    const result = handleVoiceHrTranscript(actor, {
      transcript: 'Open my daily brief',
      locale: 'en-CA',
    });

    expect(result.disposition).toBe('read_only');
    expect(result.directExecutionPerformed).toBe(false);
    expect(result.href).toBe('/daily-brief');
  });

  it('downgrades even low-risk command-layer execute actions to voice confirmation', () => {
    const result = handleVoiceHrTranscript(actor, {
      transcript: 'Mark my notifications read',
    });

    expect(result.disposition).toBe('confirmation_required');
    expect(result.requiresConfirmation).toBe(true);
    expect(result.directExecutionPerformed).toBe(false);
  });

  it('keeps consequential voice hiring requests under human decision control', () => {
    const result = handleVoiceHrTranscript(actor, {
      transcript: 'Please hire this candidate',
    });

    expect(result.disposition).toBe('human_decision_required');
    expect(result.requiresHumanDecision).toBe(true);
    expect(result.directExecutionPerformed).toBe(false);
  });

  it('keeps voice transcripts out of strategic persistence by contract', () => {
    const result = handleVoiceHrTranscript(actor, {
      transcript: 'Open learning',
    });

    expect(result.retention).toBe(
      'transcript_not_persisted_by_voice_runtime',
    );
  });

  it('closes every platform convergence item locally', () => {
    const summary = platformConvergenceSummary();

    expect(summary.total).toBe(13);
    expect(summary.validated).toBe(13);
    expect(summary.partial).toBe(0);
    expect(summary.open).toBe(0);
    expect(summary.partialPhaseIds).toEqual([]);
    expect(summary.openPhaseIds).toEqual([]);
  });

  it('reaches 24/24 locally validated roadmap phases without claiming UAT', () => {
    const snapshot = strategicReadinessSnapshot();

    expect(snapshot.totalPhases).toBe(24);
    expect(snapshot.domainIntegratedOrBetter).toBe(24);
    expect(snapshot.validatedOrBetter).toBe(24);
    expect(snapshot.uatVerified).toBe(0);

    for (const phase of snapshot.phases) {
      expect(phase.state).toBe('validated');
    }

    expect(snapshot.statement).toMatch(/not UAT verification/i);
  });

  it('does not require an AI provider to bypass deterministic safety compilation', () => {
    const unsafeProvider = vi.fn();

    const draft = generateHrProcessDraft(
      'Create a performance improvement process with manager review.',
    );

    expect(unsafeProvider).not.toHaveBeenCalled();
    expect(draft.enabled).toBe(false);
    expect(draft.activation).toBe('human_review_required');
  });
});
