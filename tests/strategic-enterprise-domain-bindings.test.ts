import { describe, expect, it, vi } from 'vitest';
import type {
  ActorContext,
  Permission,
} from '../src/domain/security';
import type {
  OrchestrationRisk,
  ServiceExecutionContext,
} from '../src/lib/orchestrator/types';
import {
  createEnterpriseStrategicServiceRegistry,
  enterpriseDomainBindingCatalog,
  type EnterpriseStrategicExecutors,
  type EnterpriseStrategicServiceKey,
} from '../src/lib/strategic/enterprise-domain-bindings';
import {
  strategicReadinessSnapshot,
} from '../src/lib/strategic/readiness';

const permissions: Permission[] = [
  'people.manage',
  'recruiting.manage',
  'recruiting.hire',
  'onboarding.manage',
  'leave.request',
  'leave.approve',
  'time.clock',
  'payroll.export',
  'workflow.run',
  'compensation.approve',
  'performance.review',
  'performance.calibrate',
  'performance.pip',
  'succession.manage',
  'separation.approve',
  'er.findings',
  'learning.assign',
  'workforce.manage',
  'regulatory.manage',
];

const actorContext: ActorContext = {
  uid: 'user-1',
  orgId: 'org-1',
  role: 'hr_admin',
  workerId: 'worker-actor',
  permissions,
};

function executionContext(input: {
  key: EnterpriseStrategicServiceKey;
  permission: Permission;
  riskClass: OrchestrationRisk;
  payloadRef?: string;
  simulateOnly?: boolean;
}): ServiceExecutionContext {
  return {
    plan: {
      planId: 'plan-enterprise',
      organizationId: 'org-1',
      actorUid: 'user-1',
      goalCode: 'enterprise_domain_test',
      state: 'executing',
      createdAtUtc: '2026-09-07T00:00:00Z',
      authorizationExpiresAtUtc: '2026-09-08T00:00:00Z',
      steps: [],
      evidenceRefs: [],
      commandHash: 'enterprise-command-hash',
      version: 1,
    },
    step: {
      id: 'step-enterprise',
      title: 'Enterprise domain action',
      dependencies: [],
      authoritativeService: input.key,
      permission: input.permission,
      riskClass: input.riskClass,
      state: 'executing',
      confirmationRequired: true,
      idempotencyRequired: true,
      payloadRef: input.payloadRef ?? 'payload:enterprise',
    },
    actor: {
      uid: 'user-1',
      organizationId: 'org-1',
      roleClass: 'hr_admin',
    },
    idempotencyKey: 'enterprise-idem',
    simulateOnly: input.simulateOnly ?? false,
  };
}

function fakeEnterpriseExecutors(): {
  executors: EnterpriseStrategicExecutors;
  calls: Record<string, ReturnType<typeof vi.fn>>;
} {
  const calls = {
    actRecommendation: vi.fn(async () => ({
      id: 'comp-rec-1',
      status: 'approved',
    })),
    submitManagerAssessment: vi.fn(async () => ({
      id: 'review-1',
    })),
    calibrateReview: vi.fn(async () => ({
      id: 'review-1',
    })),
    actOnPip: vi.fn(async () => ({
      id: 'pip-1',
    })),
    saveSuccessorNomination: vi.fn(async () => ({
      id: 'succession-1',
    })),
    actSeparation: vi.fn(async () => ({
      id: 'separation-1',
    })),
    addFinding: vi.fn(async () => ({
      id: 'finding-1',
    })),
    assignLearning: vi.fn(async () => ({
      assignment: { id: 'learning-1' },
      deduplicated: false,
    })),
    createWorkforceScenario: vi.fn(async () => ({
      id: 'scenario-1',
    })),
    createLegalReview: vi.fn(async () => ({
      id: 'legal-review-1',
    })),
  };

  return {
    executors: calls,
    calls,
  };
}

function registryWith(payloads: Record<string, unknown>) {
  const { executors, calls } = fakeEnterpriseExecutors();

  const registry = createEnterpriseStrategicServiceRegistry({
    resolveActorContext: async () => actorContext,
    resolvePayload: async ({ payloadRef }) => {
      if (!(payloadRef in payloads)) {
        throw new Error('test payload not found');
      }
      return payloads[payloadRef];
    },
    enterpriseExecutors: executors,
    executors: {
      createEmployee: vi.fn(),
      correctEmployee: vi.fn(),
      createRequisition: vi.fn(),
      hireCandidate: vi.fn(),
      createPrehireCase: vi.fn(),
      requestLeave: vi.fn(),
      actOnLeave: vi.fn(),
      clock: vi.fn(),
      exportPayrollCsv: vi.fn(),
      startWorkflow: vi.fn(),
    },
  });

  return { registry, calls };
}

describe('H49 enterprise domain convergence', () => {
  it('registers all high-impact enterprise domain keys exactly once', () => {
    expect(
      new Set(enterpriseDomainBindingCatalog.map((binding) => binding.key)).size,
    ).toBe(enterpriseDomainBindingCatalog.length);

    expect(enterpriseDomainBindingCatalog).toHaveLength(10);
  });

  it('allows R4 compensation recommendation decision through the authoritative executor', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        recommendationId: 'comp-rec-1',
        body: { action: 'approve' },
      },
    });

    const result = await registry
      .get('compensation.decide_recommendation')!
      .execute(
        executionContext({
          key: 'compensation.decide_recommendation',
          permission: 'compensation.approve',
          riskClass: 'high_impact_admin',
        }),
      );

    expect(result.outcome).toBe('completed');
    expect(result.resultReference).toBe(
      'compensationRecommendation:comp-rec-1',
    );
    expect(calls.actRecommendation).toHaveBeenCalledTimes(1);
  });

  it('blocks manager performance assessment as a direct R5 execution', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        reviewId: 'review-1',
        body: { action: 'manager' },
      },
    });

    const result = await registry
      .get('performance.manager_assessment')!
      .execute(
        executionContext({
          key: 'performance.manager_assessment',
          permission: 'performance.review',
          riskClass: 'consequential',
        }),
      );

    expect(result.outcome).toBe('blocked');
    expect(result.messageCode).toBe(
      'CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED',
    );
    expect(calls.submitManagerAssessment).not.toHaveBeenCalled();
  });

  it('blocks performance calibration and PIP actions from direct AI execution', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        reviewId: 'review-1',
        pipId: 'pip-1',
        body: { action: 'complete' },
      },
    });

    const calibration = await registry
      .get('performance.calibrate_review')!
      .execute(
        executionContext({
          key: 'performance.calibrate_review',
          permission: 'performance.calibrate',
          riskClass: 'consequential',
        }),
      );

    const pip = await registry
      .get('performance.pip_action')!
      .execute(
        executionContext({
          key: 'performance.pip_action',
          permission: 'performance.pip',
          riskClass: 'consequential',
        }),
      );

    expect(calibration.outcome).toBe('blocked');
    expect(pip.outcome).toBe('blocked');
    expect(calls.calibrateReview).not.toHaveBeenCalled();
    expect(calls.actOnPip).not.toHaveBeenCalled();
  });

  it('blocks succession nomination as a direct R5 talent decision', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        positionId: 'position-1',
        workerId: 'worker-2',
      },
    });

    const result = await registry
      .get('succession.save_nomination')!
      .execute(
        executionContext({
          key: 'succession.save_nomination',
          permission: 'succession.manage',
          riskClass: 'consequential',
        }),
      );

    expect(result.outcome).toBe('blocked');
    expect(calls.saveSuccessorNomination).not.toHaveBeenCalled();
  });

  it('blocks separation and employee-relations findings from direct R6 execution', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        caseId: 'case-1',
        body: { action: 'approve' },
      },
    });

    const separation = await registry
      .get('separation.case_action')!
      .execute(
        executionContext({
          key: 'separation.case_action',
          permission: 'separation.approve',
          riskClass: 'consequential',
        }),
      );

    const finding = await registry
      .get('employee_relations.add_finding')!
      .execute(
        executionContext({
          key: 'employee_relations.add_finding',
          permission: 'er.findings',
          riskClass: 'consequential',
        }),
      );

    expect(separation.outcome).toBe('blocked');
    expect(finding.outcome).toBe('blocked');
    expect(calls.actSeparation).not.toHaveBeenCalled();
    expect(calls.addFinding).not.toHaveBeenCalled();
  });

  it('allows governed R3 learning assignment', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        workerId: 'worker-2',
        courseId: 'course-1',
      },
    });

    const result = await registry
      .get('learning.assign')!
      .execute(
        executionContext({
          key: 'learning.assign',
          permission: 'learning.assign',
          riskClass: 'administrative',
        }),
      );

    expect(result.outcome).toBe('completed');
    expect(result.resultReference).toBe(
      'learningAssignment:learning-1',
    );
    expect(calls.assignLearning).toHaveBeenCalledTimes(1);
  });

  it('allows governed workforce scenario creation without executing workforce changes', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        name: 'Scenario A',
      },
    });

    const result = await registry
      .get('workforce_planning.create_scenario')!
      .execute(
        executionContext({
          key: 'workforce_planning.create_scenario',
          permission: 'workforce.manage',
          riskClass: 'administrative',
        }),
      );

    expect(result.outcome).toBe('completed');
    expect(result.resultReference).toBe(
      'workforceScenario:scenario-1',
    );
    expect(calls.createWorkforceScenario).toHaveBeenCalledTimes(1);
  });

  it('allows R4 creation of a legal-review case while preserving specialist authority', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        changeId: 'reg-change-1',
      },
    });

    const result = await registry
      .get('regulatory.create_legal_review')!
      .execute(
        executionContext({
          key: 'regulatory.create_legal_review',
          permission: 'regulatory.manage',
          riskClass: 'high_impact_admin',
        }),
      );

    expect(result.outcome).toBe('completed');
    expect(result.resultReference).toBe(
      'regulatoryLegalReview:legal-review-1',
    );
    expect(calls.createLegalReview).toHaveBeenCalledTimes(1);
  });

  it('blocks simulation before any enterprise authoritative write', async () => {
    const { registry, calls } = registryWith({
      'payload:enterprise': {
        workerId: 'worker-2',
        courseId: 'course-1',
      },
    });

    const result = await registry
      .get('learning.assign')!
      .execute(
        executionContext({
          key: 'learning.assign',
          permission: 'learning.assign',
          riskClass: 'administrative',
          simulateOnly: true,
        }),
      );

    expect(result.outcome).toBe('blocked');
    expect(result.messageCode).toBe(
      'DOMAIN_SIMULATION_REQUIRES_IMPACT_PREVIEW',
    );
    expect(calls.assignLearning).not.toHaveBeenCalled();
  });

  it('shows locally validated evidence for phases 6, 7, 12, 13, 14 and 18 without claiming UAT', () => {
    const snapshot = strategicReadinessSnapshot();

    for (const phaseId of [6, 7, 12, 13, 14, 18] as const) {
      const phase = snapshot.phases.find((item) => item.id === phaseId);
      expect(phase?.state).toBe('validated');
    }

    expect(snapshot.validatedOrBetter).toBeGreaterThanOrEqual(9);
    expect(snapshot.uatVerified).toBe(0);
  });
});
