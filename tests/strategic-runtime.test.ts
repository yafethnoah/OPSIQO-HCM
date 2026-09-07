import { describe, expect, it } from 'vitest';
import type { GovernedActionPlan } from '../src/lib/strategic/agent-os';
import {
  StrategicRuntimeGateway,
  type AuthoritativeDomainService,
  type GovernedExecutionReceipt,
  type GovernedRuntimeRequest,
  type IdempotencyReceiptStore,
  type PermissionRechecker,
  type ObjectVersionAuthority,
} from '../src/lib/strategic/runtime-gateway';
import {
  derivePhaseReadiness,
  strategicReadinessSnapshot,
} from '../src/lib/strategic/readiness';
import {
  buildBenchmarkObservation,
  evaluateStrategicObservations,
} from '../src/lib/strategic/benchmark-telemetry';
import type {
  EvidenceRef,
  PermissionDecision,
  StrategicRiskTier,
} from '../src/lib/strategic/types';

const now = '2026-09-06T12:00:00Z';

const evidence: EvidenceRef[] = [
  {
    id: 'evidence-1',
    sourceType: 'policy',
    sourceId: 'policy-1',
    observedAt: '2026-09-06T11:00:00Z',
  },
];

function permission(
  allowed = true,
  name = 'worker.update',
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
): GovernedActionPlan {
  return {
    planId: `plan-${riskTier}`,
    orgId: 'org-1',
    agentId: 'transaction-agent',
    action: riskTier === 'R6' ? 'terminate worker' : 'update worker',
    riskTier,
    createdAt: '2026-09-06T11:00:00Z',
    expiresAt: '2026-09-06T13:00:00Z',
    targetObjectType: 'worker',
    targetObjectId: 'worker-1',
    evidenceRefs: evidence,
    permissionChecks: [permission()],
    assumptions: [],
    status: 'planned',
    idempotencyKey: `idem-${riskTier}`,
  };
}

class TestReceiptStore implements IdempotencyReceiptStore {
  readonly values = new Map<string, GovernedExecutionReceipt>();

  async get(
    orgId: string,
    idempotencyKey: string,
  ): Promise<GovernedExecutionReceipt | null> {
    return this.values.get(`${orgId}:${idempotencyKey}`) ?? null;
  }

  async put(
    orgId: string,
    idempotencyKey: string,
    receipt: GovernedExecutionReceipt,
  ): Promise<void> {
    this.values.set(`${orgId}:${idempotencyKey}`, receipt);
  }
}

function dependencies(order: string[] = [], allowed = true): {
  idempotency: TestReceiptStore;
  permissions: PermissionRechecker;
  versions: ObjectVersionAuthority;
  clock: { now(): string };
} {
  return {
    idempotency: new TestReceiptStore(),
    permissions: {
      async recheck() {
        order.push('permission');
        return [permission(allowed)];
      },
    },
    versions: {
      async resolve() {
        order.push('version');
        return { version: 3, etag: 'etag-3' };
      },
    },
    clock: {
      now: () => now,
    },
  };
}

function request(
  riskTier: StrategicRiskTier = 'R3',
): GovernedRuntimeRequest<{ workerId: string }> {
  return {
    plan: plan(riskTier),
    subjectOrgId: 'org-1',
    actor: { actorType: 'user', actorId: 'user-1' },
    target: {
      objectType: 'worker',
      objectId: 'worker-1',
      mutationKind: 'update',
      expectedVersion: 3,
      expectedEtag: 'etag-3',
    },
    requiredPermission: 'worker.update',
    reason: 'Governed workforce update',
    payload: { workerId: 'worker-1' },
    userConfirmed: riskTier === 'R3',
    independentApproval: riskTier === 'R4',
    humanDecisionRecorded: riskTier === 'R5' || riskTier === 'R6',
    specialistReviewRecorded: riskTier === 'R6',
  };
}

function service(
  order: string[] = [],
): AuthoritativeDomainService<{ workerId: string }, { ok: boolean }> {
  return {
    serviceName: 'worker-authoritative-service',
    capabilities: {
      tenantScoped: true,
      idempotent: true,
      audit: true,
      domainEvents: true,
    },
    async execute() {
      order.push('execute');
      return {
        result: { ok: true },
        resultingVersion: 4,
        resultingEtag: 'etag-4',
        auditId: 'audit-1',
        domainEventId: 'event-1',
      };
    },
  };
}

describe('H49 runtime governance foundation', () => {
  it('rechecks version and permission immediately before authoritative execution', async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    const gateway = new StrategicRuntimeGateway(deps);

    const outcome = await gateway.execute(request(), service(order));

    expect(outcome.duplicate).toBe(false);
    expect(outcome.receipt.auditId).toBe('audit-1');
    expect(outcome.receipt.domainEventId).toBe('event-1');
    expect(order).toEqual(['version', 'permission', 'execute']);
  });

  it('blocks a denied permission before the authoritative service', async () => {
    const order: string[] = [];
    const deps = dependencies(order, false);
    const gateway = new StrategicRuntimeGateway(deps);

    await expect(
      gateway.execute(request(), service(order)),
    ).rejects.toThrow(/permission recheck denied execution/i);

    expect(order).toEqual(['version', 'permission']);
  });

  it('requires user confirmation for R3', async () => {
    const deps = dependencies();
    const gateway = new StrategicRuntimeGateway(deps);
    const input = request('R3');
    input.userConfirmed = false;

    await expect(
      gateway.execute(input, service()),
    ).rejects.toThrow(/user confirmation is required/i);
  });

  it('requires independent approval for R4', async () => {
    const deps = dependencies();
    const gateway = new StrategicRuntimeGateway(deps);
    const input = request('R4');
    input.independentApproval = false;

    await expect(
      gateway.execute(input, service()),
    ).rejects.toThrow(/independent approval is required/i);
  });

  it('requires a recorded human decision for R5', async () => {
    const deps = dependencies();
    const gateway = new StrategicRuntimeGateway(deps);
    const input = request('R5');
    input.humanDecisionRecorded = false;

    await expect(
      gateway.execute(input, service()),
    ).rejects.toThrow(/human decision is required/i);
  });

  it('requires both specialist review and a human decision for R6', async () => {
    const deps = dependencies();
    const gateway = new StrategicRuntimeGateway(deps);

    const noHuman = request('R6');
    noHuman.humanDecisionRecorded = false;
    await expect(
      gateway.execute(noHuman, service()),
    ).rejects.toThrow(/R6 requires a recorded human decision/i);

    const noSpecialist = request('R6');
    noSpecialist.specialistReviewRecorded = false;
    await expect(
      gateway.execute(noSpecialist, service()),
    ).rejects.toThrow(/specialist review is required/i);
  });

  it('forbids autonomous execution for R3-R6', async () => {
    const deps = dependencies();
    const gateway = new StrategicRuntimeGateway(deps);
    const input = request('R5');
    input.autonomous = true;

    await expect(
      gateway.execute(input, service()),
    ).rejects.toThrow(/cannot execute autonomously/i);
  });

  it('forbids R0-R2 authoritative mutations', async () => {
    const deps = dependencies();
    const gateway = new StrategicRuntimeGateway(deps);
    const input = request('R2');

    await expect(
      gateway.execute(input, service()),
    ).rejects.toThrow(/R0-R2 actions cannot perform authoritative mutations/i);
  });

  it('blocks cross-organization execution', async () => {
    const deps = dependencies();
    const gateway = new StrategicRuntimeGateway(deps);
    const input = request();
    input.subjectOrgId = 'org-2';

    await expect(
      gateway.execute(input, service()),
    ).rejects.toThrow(/cross-organization execution is forbidden/i);
  });

  it('blocks optimistic concurrency mismatch before permission recheck', async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    deps.versions = {
      async resolve() {
        order.push('version');
        return { version: 9, etag: 'etag-9' };
      },
    };

    const gateway = new StrategicRuntimeGateway(deps);

    await expect(
      gateway.execute(request(), service(order)),
    ).rejects.toThrow(/authoritative version conflict/i);

    expect(order).toEqual(['version']);
  });

  it('returns the stored receipt for a duplicate idempotency key', async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    const gateway = new StrategicRuntimeGateway(deps);
    const first = await gateway.execute(request(), service(order));

    order.length = 0;
    const second = await gateway.execute(request(), service(order));

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.receipt).toEqual(first.receipt);
    expect(order).toEqual([]);
  });

  it('does not overstate roadmap readiness', () => {
    const snapshot = strategicReadinessSnapshot();

    expect(snapshot.totalPhases).toBe(24);
    expect(snapshot.domainIntegratedOrBetter).toBeGreaterThanOrEqual(3);
    expect(snapshot.validatedOrBetter).toBeGreaterThanOrEqual(3);
    expect(snapshot.uatVerified).toBe(0);
    expect(snapshot.counts['runtime-foundation']).toBe(0);
  });

  it('requires readiness evidence in sequence', () => {
    expect(derivePhaseReadiness({})).toBe('registered');
    expect(
      derivePhaseReadiness({ contractFiles: ['contract.ts'] }),
    ).toBe('contract-ready');
    expect(
      derivePhaseReadiness({
        contractFiles: ['contract.ts'],
        runtimeFoundationFiles: ['runtime.ts'],
      }),
    ).toBe('runtime-foundation');
    expect(
      derivePhaseReadiness({
        contractFiles: ['contract.ts'],
        runtimeFoundationFiles: ['runtime.ts'],
        domainAdapterFiles: ['adapter.ts'],
      }),
    ).toBe('domain-integrated');
  });

  it('builds privacy-bounded benchmark observations', () => {
    const observation = buildBenchmarkObservation({
      key: 'leave.request.seconds',
      value: 18,
      recordedAt: now,
      dimensions: {
        surface: 'self-service',
        locale: 'en-CA',
        release: 'h49',
      },
    });

    expect(observation.key).toBe('leave.request.seconds');

    const results = evaluateStrategicObservations([observation]);
    const leave = results.find(
      (result) => result.key === 'leave.request.seconds',
    );

    expect(leave?.passed).toBe(true);
  });

  it('rejects benchmark dimension values that look like personal or URL data', () => {
    expect(() =>
      buildBenchmarkObservation({
        key: 'leave.request.seconds',
        value: 18,
        recordedAt: now,
        dimensions: {
          workflow: 'person@example.com',
        },
      }),
    ).toThrow(/contains disallowed data/i);
  });
});
