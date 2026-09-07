import { describe, expect, it } from 'vitest';
import {
  assertAgentCanPlan,
  assertCanonicalObject,
  assertExecutionAllowed,
  assertOptimisticVersion,
  assertStrategicCoverage,
  assertTenantScope,
  benchmarkPassRate,
  buildComplianceImpact,
  classifyStrategicAction,
  evaluateBenchmarks,
  getStrategicPhase,
  isEffectiveAt,
  materialAiOutput,
  mayAutonomouslyExecute,
  previewWorkforceImpact,
  strategicBenchmarks,
  strategicPhases,
  toDomainEvent,
} from '../src/lib/strategic';

const actor = { actorType: 'user' as const, actorId: 'user-1' };
const evidence = [{
  id: 'e1',
  sourceType: 'policy',
  sourceId: 'p1',
  observedAt: '2026-09-06T00:00:00Z',
}];

function meta() {
  return {
    objectId: 'worker-1',
    orgId: 'org-1',
    objectType: 'worker',
    lifecycleStatus: 'active' as const,
    effectiveFrom: '2026-01-01T00:00:00Z',
    effectiveTo: null,
    version: 3,
    etag: 'etag-3',
    schemaVersion: 1,
    evidenceRefs: evidence,
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: actor,
    updatedAt: '2026-09-01T00:00:00Z',
    updatedBy: actor,
  };
}

describe('strategic roadmap convergence layer', () => {
  it('registers every strategic phase exactly once', () => {
    expect(() => assertStrategicCoverage()).not.toThrow();
    expect(strategicPhases).toHaveLength(24);
    expect(new Set(strategicPhases.map((phase) => phase.id)).size).toBe(24);
  });

  it('maps each phase to existing OPSIQO capability surfaces', () => {
    for (const phase of strategicPhases) {
      expect(phase.existingCapabilities.length).toBeGreaterThan(0);
      expect(phase.requiredControls.length).toBeGreaterThan(0);
    }
  });

  it('resolves Phase 1 as the Enterprise Object Graph', () => {
    expect(getStrategicPhase(1).name).toBe('Enterprise Object Graph');
  });

  it('enforces canonical object metadata', () => {
    expect(() => assertCanonicalObject(meta())).not.toThrow();
  });

  it('rejects missing organization scope', () => {
    expect(() => assertCanonicalObject({ ...meta(), orgId: '' })).toThrow(/orgId/);
  });

  it('blocks cross-organization access', () => {
    expect(() => assertTenantScope('org-1', { orgId: 'org-2' })).toThrow(/cross-organization/);
  });

  it('enforces optimistic concurrency', () => {
    expect(() => assertOptimisticVersion(meta(), 3, 'etag-3')).not.toThrow();
    expect(() => assertOptimisticVersion(meta(), 2)).toThrow(/version conflict/);
  });

  it('honors effective dating', () => {
    expect(isEffectiveAt(meta(), '2026-09-06T00:00:00Z')).toBe(true);
    expect(isEffectiveAt(meta(), '2025-12-31T23:59:59Z')).toBe(false);
  });

  it('produces standardized domain events', () => {
    const event = toDomainEvent({
      eventId: 'evt-1',
      type: 'opsiqo.worker.updated',
      source: 'opsiqo://worker',
      object: { meta: meta(), data: { displayName: 'Example' } },
      time: '2026-09-06T00:00:00Z',
      correlationId: 'corr-1',
    });
    expect(event.specversion).toBe('1.0');
    expect(event.orgId).toBe('org-1');
    expect(event.evidenceRefs).toHaveLength(1);
  });

  it('classifies termination as R6', () => {
    expect(classifyStrategicAction('terminate employee')).toBe('R6');
  });

  it('classifies promotion as R5', () => {
    expect(classifyStrategicAction('promote employee')).toBe('R5');
  });

  it('classifies compensation changes as R4', () => {
    expect(classifyStrategicAction('salary change')).toBe('R4');
  });

  it('classifies routine leave as R3', () => {
    expect(classifyStrategicAction('request leave')).toBe('R3');
  });

  it('allows only R0-R2 autonomous execution', () => {
    expect(mayAutonomouslyExecute('R0')).toBe(true);
    expect(mayAutonomouslyExecute('R2')).toBe(true);
    expect(mayAutonomouslyExecute('R3')).toBe(false);
    expect(mayAutonomouslyExecute('R6')).toBe(false);
  });

  it('requires confirmation for routine transactions', () => {
    const plan = {
      planId: 'p1',
      orgId: 'org-1',
      agentId: 'a1',
      action: 'request leave',
      riskTier: 'R3' as const,
      createdAt: '2026-09-06T10:00:00Z',
      expiresAt: '2026-09-06T10:20:00Z',
      evidenceRefs: evidence,
      permissionChecks: [{ allowed: true, checkedAt: '2026-09-06T10:00:00Z', permission: 'leave.request' }],
      assumptions: [],
      status: 'planned' as const,
      idempotencyKey: 'idem-1',
    };

    expect(() => assertExecutionAllowed({
      plan,
      now: '2026-09-06T10:05:00Z',
      recheckedPermissions: [{ allowed: true, checkedAt: '2026-09-06T10:05:00Z', permission: 'leave.request' }],
    })).toThrow(/confirmation/);

    expect(() => assertExecutionAllowed({
      plan,
      now: '2026-09-06T10:05:00Z',
      recheckedPermissions: [{ allowed: true, checkedAt: '2026-09-06T10:05:00Z', permission: 'leave.request' }],
      userConfirmed: true,
    })).not.toThrow();
  });

  it('requires a human decision for R5 actions', () => {
    const plan = {
      planId: 'p2',
      orgId: 'org-1',
      agentId: 'a1',
      action: 'promote employee',
      riskTier: 'R5' as const,
      createdAt: '2026-09-06T10:00:00Z',
      expiresAt: '2026-09-06T10:20:00Z',
      evidenceRefs: evidence,
      permissionChecks: [{ allowed: true, checkedAt: '2026-09-06T10:00:00Z', permission: 'promotion.review' }],
      assumptions: [],
      status: 'planned' as const,
      idempotencyKey: 'idem-2',
    };

    expect(() => assertExecutionAllowed({
      plan,
      now: '2026-09-06T10:05:00Z',
      recheckedPermissions: [{ allowed: true, checkedAt: '2026-09-06T10:05:00Z', permission: 'promotion.review' }],
    })).toThrow(/human decision/);
  });

  it('requires specialist review for R6 actions', () => {
    const plan = {
      planId: 'p3',
      orgId: 'org-1',
      agentId: 'a1',
      action: 'terminate employee',
      riskTier: 'R6' as const,
      createdAt: '2026-09-06T10:00:00Z',
      expiresAt: '2026-09-06T10:20:00Z',
      evidenceRefs: evidence,
      permissionChecks: [{ allowed: true, checkedAt: '2026-09-06T10:00:00Z', permission: 'termination.review' }],
      assumptions: [],
      status: 'planned' as const,
      idempotencyKey: 'idem-3',
    };

    expect(() => assertExecutionAllowed({
      plan,
      now: '2026-09-06T10:05:00Z',
      recheckedPermissions: [{ allowed: true, checkedAt: '2026-09-06T10:05:00Z', permission: 'termination.review' }],
    })).toThrow(/specialist review/);
  });

  it('requires permissions and agent allow-lists at planning time', () => {
    const agent = {
      agentId: 'a1',
      name: 'Leave assistant',
      purpose: 'Routine leave support',
      allowedActions: ['request leave'],
      maximumRiskTier: 'R3' as const,
      enabled: true,
      version: 1,
    };
    const plan = {
      planId: 'p1',
      orgId: 'org-1',
      agentId: 'a1',
      action: 'request leave',
      riskTier: 'R3' as const,
      createdAt: '2026-09-06T10:00:00Z',
      expiresAt: '2026-09-06T10:20:00Z',
      evidenceRefs: evidence,
      permissionChecks: [{ allowed: true, checkedAt: '2026-09-06T10:00:00Z', permission: 'leave.request' }],
      assumptions: [],
      status: 'planned' as const,
      idempotencyKey: 'idem-4',
    };
    expect(() => assertAgentCanPlan(agent, plan)).not.toThrow();
  });

  it('requires evidence for material AI outputs', () => {
    expect(() => materialAiOutput({
      output: { recommendation: 'review' },
      confidence: 0.91,
      evidenceRefs: [],
      assumptions: ['current data is complete'],
      limitations: ['not legal advice'],
      generatedAt: '2026-09-06T00:00:00Z',
    })).toThrow(/evidence/);
  });

  it('accepts evidence-backed explainable AI outputs', () => {
    expect(materialAiOutput({
      output: { recommendation: 'review' },
      confidence: 0.91,
      evidenceRefs: evidence,
      assumptions: ['current data is complete'],
      limitations: ['not legal advice'],
      model: { provider: 'configured-provider', model: 'configured-model' },
      generatedAt: '2026-09-06T00:00:00Z',
    }).confidence).toBe(0.91);
  });

  it('previews workforce scenario deltas without making a decision', () => {
    const preview = previewWorkforceImpact({
      scenarioId: 's1',
      orgId: 'org-1',
      name: 'Growth plan',
      assumptions: ['demand forecast remains stable'],
      evidenceRefs: evidence,
      baseline: {
        headcount: 100,
        vacancies: 5,
        payrollCost: 1000,
        overtimeHours: 100,
        regrettableAttritionRisk: 0.10,
        criticalSkillCoverage: 0.80,
      },
      proposed: {
        headcount: 110,
        vacancies: 2,
        payrollCost: 1150,
        overtimeHours: 70,
        regrettableAttritionRisk: 0.08,
        criticalSkillCoverage: 0.90,
      },
    });
    expect(preview.deltas.headcount).toBe(10);
    expect(preview.deltas.vacancies).toBe(-3);
  });

  it('flags legal review when compliance impact includes consequential legal action', () => {
    const impact = buildComplianceImpact({
      obligation: {
        obligationId: 'o1',
        orgId: 'org-1',
        jurisdiction: 'Ontario',
        topic: 'Employment',
        effectiveFrom: '2026-09-06',
        sourceAuthority: 'authority',
        evidenceRefs: evidence,
      },
      impactedObjectTypes: ['policy'],
      requiredActions: ['legal review of termination process'],
      confidence: 0.95,
    });
    expect(impact.legalReviewRequired).toBe(true);
  });

  it('includes a permanent benchmark for zero autonomous consequential decisions', () => {
    const target = strategicBenchmarks.find((candidate) => candidate.key === 'consequential.autonomous.count');
    expect(target?.target).toBe(0);
    expect(target?.operator).toBe('=');
  });

  it('evaluates the permanent benchmark suite', () => {
    const observations = strategicBenchmarks.map((target) => ({
      key: target.key,
      value: target.operator === '<=' ? target.target : target.target,
    }));
    const results = evaluateBenchmarks(observations);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(benchmarkPassRate(results)).toBe(100);
  });
});
