import { describe, expect, it } from 'vitest';
import type { GovernedActionPlan } from '../src/lib/strategic/agent-os';
import {
  buildStrategicOrchestrationPlan,
  orchestrationRiskForStrategicTier,
  StrategicGovernedOrchestratorBridge,
  strategicExecutionAuthority,
} from '../src/lib/strategic/orchestrator-bridge';
import { strategicReadinessSnapshot } from '../src/lib/strategic/readiness';
import type {
  AuthoritativeServiceBinding,
  OrchestratorDependencies,
} from '../src/lib/orchestrator/types';
import type {
  EvidenceRef,
  PermissionDecision,
  StrategicRiskTier,
} from '../src/lib/strategic/types';

const now = '2026-09-06T22:00:00Z';

const evidence: EvidenceRef[] = [
  {
    id: 'evidence-policy-1',
    sourceType: 'policy',
    sourceId: 'policy-1',
    observedAt: '2026-09-06T21:00:00Z',
  },
];

function permission(
  allowed = true,
  name = 'people.manage',
): PermissionDecision {
  return {
    allowed,
    checkedAt: now,
    permission: name,
    objectType: 'worker',
    objectId: 'worker-1',
  };
}

function plan(
  riskTier: StrategicRiskTier = 'R3',
  permissionName = 'people.manage',
): GovernedActionPlan {
  return {
    planId: `plan-${riskTier}`,
    orgId: 'org-1',
    agentId: 'strategic-agent',
    action:
      riskTier === 'R6'
        ? 'terminate employee'
        : riskTier === 'R5'
          ? 'promote employee'
          : 'update employee',
    riskTier,
    createdAt: '2026-09-06T21:00:00Z',
    expiresAt: '2026-09-06T23:00:00Z',
    targetObjectType: 'worker',
    targetObjectId: 'worker-1',
    evidenceRefs: evidence,
    permissionChecks: [permission(true, permissionName)],
    assumptions: [],
    status: 'planned',
    idempotencyKey: `idem-${riskTier}`,
  };
}

function dependencies(input?: {
  permissionAllowed?: boolean;
  tenantAllowed?: boolean;
  service?: AuthoritativeServiceBinding;
}): OrchestratorDependencies {
  const service =
    input?.service ??
    ({
      key: 'core_hr.update_employee',
      async execute() {
        return {
          outcome: 'completed',
          resultReference: 'worker:worker-1',
          auditReference: 'audit:worker-1',
        };
      },
    } satisfies AuthoritativeServiceBinding);

  return {
    permissionChecker: async () => input?.permissionAllowed ?? true,
    tenantScopeChecker: async () => input?.tenantAllowed ?? true,
    services: new Map([[service.key, service]]),
    now: () => new Date(now),
  };
}

describe('H49 strategic/orchestrator convergence', () => {
  it('uses the existing governed orchestrator as strategic execution authority', () => {
    expect(strategicExecutionAuthority).toBe('governed-orchestrator');
  });

  it('maps R0-R6 into the existing OPSIQO orchestration risk model', () => {
    expect(orchestrationRiskForStrategicTier('R0')).toBe('read_only');
    expect(orchestrationRiskForStrategicTier('R1')).toBe('read_only');
    expect(orchestrationRiskForStrategicTier('R2')).toBe('read_only');
    expect(orchestrationRiskForStrategicTier('R3')).toBe('administrative');
    expect(orchestrationRiskForStrategicTier('R4')).toBe('high_impact_admin');
    expect(orchestrationRiskForStrategicTier('R5')).toBe('consequential');
    expect(orchestrationRiskForStrategicTier('R6')).toBe('consequential');
  });

  it('maps R3 to an idempotent administrative step that requires confirmation', () => {
    const mapped = buildStrategicOrchestrationPlan({
      plan: plan('R3'),
      actorUid: 'user-1',
      binding: {
        authoritativeService: 'core_hr.update_employee',
        permission: 'people.manage',
        payloadRef: 'payload:worker-update',
      },
    });

    const step = mapped.steps[0]!;
    expect(step.riskClass).toBe('administrative');
    expect(step.confirmationRequired).toBe(true);
    expect(step.idempotencyRequired).toBe(true);
    expect(step.humanCheckpoint).toBe(false);
  });

  it('requires independent approval evidence for R4', () => {
    expect(() =>
      buildStrategicOrchestrationPlan({
        plan: plan('R4'),
        actorUid: 'user-1',
        binding: {
          authoritativeService: 'core_hr.update_employee',
          permission: 'people.manage',
        },
      }),
    ).toThrow(/R4 requires independent approval evidence/i);

    const mapped = buildStrategicOrchestrationPlan({
      plan: plan('R4'),
      actorUid: 'user-1',
      binding: {
        authoritativeService: 'core_hr.update_employee',
        permission: 'people.manage',
        approvalEvidenceRef: 'approval:1',
      },
    });

    expect(mapped.steps[0]?.riskClass).toBe('high_impact_admin');
    expect(mapped.steps[0]?.humanCheckpoint).toBe(true);
    expect(mapped.evidenceRefs).toContain('approval:1');
  });

  it('requires recorded human-decision evidence for R5', () => {
    expect(() =>
      buildStrategicOrchestrationPlan({
        plan: plan('R5'),
        actorUid: 'user-1',
        binding: {
          authoritativeService: 'core_hr.promote_employee',
          permission: 'people.manage',
        },
      }),
    ).toThrow(/R5-R6 require recorded human-decision evidence/i);
  });

  it('requires human decision and specialist review evidence for R6', () => {
    expect(() =>
      buildStrategicOrchestrationPlan({
        plan: plan('R6'),
        actorUid: 'user-1',
        binding: {
          authoritativeService: 'core_hr.terminate_employee',
          permission: 'people.manage',
          humanDecisionEvidenceRef: 'human-decision:1',
        },
      }),
    ).toThrow(/R6 requires specialist-review evidence/i);
  });

  it('uses the existing orchestrator confirmation and execution-time permission recheck for R3', async () => {
    let serviceCalls = 0;
    let permissionChecks = 0;

    const service: AuthoritativeServiceBinding = {
      key: 'core_hr.update_employee',
      async execute() {
        serviceCalls += 1;
        return {
          outcome: 'completed',
          resultReference: 'worker:worker-1',
          auditReference: 'audit:worker-1',
        };
      },
    };

    const deps = dependencies({ service });
    deps.permissionChecker = async () => {
      permissionChecks += 1;
      return true;
    };

    const bridge = new StrategicGovernedOrchestratorBridge(deps);

    const waiting = await bridge.run({
      plan: plan('R3'),
      actor: {
        uid: 'user-1',
        organizationId: 'org-1',
        roleClass: 'hr',
      },
      binding: {
        authoritativeService: service.key,
        permission: 'people.manage',
      },
      userConfirmed: false,
    });

    expect(waiting.plan.state).toBe('waiting_for_human');
    expect(serviceCalls).toBe(0);
    expect(permissionChecks).toBe(0);

    const completed = await bridge.run({
      plan: plan('R3'),
      actor: {
        uid: 'user-1',
        organizationId: 'org-1',
        roleClass: 'hr',
      },
      binding: {
        authoritativeService: service.key,
        permission: 'people.manage',
      },
      userConfirmed: true,
    });

    expect(permissionChecks).toBe(1);
    expect(serviceCalls).toBe(1);
    expect(completed.plan.state).toBe('completed');
    expect(completed.receipts[0]?.auditReference).toBe('audit:worker-1');
  });

  it('blocks execution when the existing orchestrator permission recheck denies access', async () => {
    let serviceCalls = 0;
    const service: AuthoritativeServiceBinding = {
      key: 'core_hr.update_employee',
      async execute() {
        serviceCalls += 1;
        return { outcome: 'completed' };
      },
    };

    const bridge = new StrategicGovernedOrchestratorBridge(
      dependencies({
        permissionAllowed: false,
        service,
      }),
    );

    const result = await bridge.run({
      plan: plan('R3'),
      actor: {
        uid: 'user-1',
        organizationId: 'org-1',
        roleClass: 'hr',
      },
      binding: {
        authoritativeService: service.key,
        permission: 'people.manage',
      },
      userConfirmed: true,
    });

    expect(serviceCalls).toBe(0);
    expect(result.blockedReasons).toContain(
      'strategic:plan-R3:PERMISSION_DENIED_AT_EXECUTION',
    );
  });

  it('blocks R5 direct execution through the existing consequential-action guard', async () => {
    let serviceCalls = 0;
    const service: AuthoritativeServiceBinding = {
      key: 'core_hr.promote_employee',
      async execute() {
        serviceCalls += 1;
        return { outcome: 'completed' };
      },
    };

    const bridge = new StrategicGovernedOrchestratorBridge(
      dependencies({ service }),
    );

    const result = await bridge.run({
      plan: plan('R5'),
      actor: {
        uid: 'user-1',
        organizationId: 'org-1',
        roleClass: 'hr',
      },
      binding: {
        authoritativeService: service.key,
        permission: 'people.manage',
        humanDecisionEvidenceRef: 'human-decision:promotion-1',
      },
      userConfirmed: true,
    });

    expect(serviceCalls).toBe(0);
    expect(result.plan.state).toBe('blocked');
    expect(
      result.blockedReasons.some((reason) =>
        reason.includes('CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED'),
      ),
    ).toBe(true);
  });

  it('preserves tenant isolation before execution', async () => {
    const bridge = new StrategicGovernedOrchestratorBridge(dependencies());

    await expect(
      bridge.run({
        plan: plan('R3'),
        actor: {
          uid: 'user-1',
          organizationId: 'org-2',
          roleClass: 'hr',
        },
        binding: {
          authoritativeService: 'core_hr.update_employee',
          permission: 'people.manage',
        },
        userConfirmed: true,
      }),
    ).rejects.toThrow(/actor organization does not match the plan/i);
  });

  it('requires an allowed planning permission before orchestration', () => {
    const denied = plan('R3');
    denied.permissionChecks = [permission(false, 'people.manage')];

    expect(() =>
      buildStrategicOrchestrationPlan({
        plan: denied,
        actorUid: 'user-1',
        binding: {
          authoritativeService: 'core_hr.update_employee',
          permission: 'people.manage',
        },
      }),
    ).toThrow(/planning permission denied/i);
  });

  it('records local convergence as validated but never as UAT verified', () => {
    const snapshot = strategicReadinessSnapshot();

    expect(snapshot.totalPhases).toBe(24);
    expect(snapshot.validatedOrBetter).toBeGreaterThanOrEqual(3);
    expect(snapshot.uatVerified).toBe(0);
    expect(snapshot.statement).toMatch(/not UAT verification/i);
  });
});
