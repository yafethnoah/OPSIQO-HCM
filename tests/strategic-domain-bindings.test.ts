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
  createStrategicDomainServiceRegistry,
  strategicDomainBindingCatalog,
  type StrategicDomainExecutors,
  type StrategicDomainServiceKey,
} from '../src/lib/strategic/domain-bindings';

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
];

const actorContext: ActorContext = {
  uid: 'user-1',
  orgId: 'org-1',
  role: 'hr_admin',
  workerId: 'worker-actor',
  permissions,
};

function executionContext(input: {
  key: StrategicDomainServiceKey;
  permission: Permission;
  riskClass?: OrchestrationRisk;
  payloadRef?: string;
  simulateOnly?: boolean;
}): ServiceExecutionContext {
  return {
    plan: {
      planId: 'plan-1',
      organizationId: 'org-1',
      actorUid: 'user-1',
      goalCode: 'strategic_domain_test',
      state: 'executing',
      createdAtUtc: '2026-09-06T20:00:00Z',
      authorizationExpiresAtUtc: '2026-09-07T20:00:00Z',
      steps: [],
      evidenceRefs: [],
      commandHash: 'command-hash',
      version: 1,
    },
    step: {
      id: 'step-1',
      title: 'Domain action',
      dependencies: [],
      authoritativeService: input.key,
      permission: input.permission,
      riskClass: input.riskClass ?? 'administrative',
      state: 'executing',
      confirmationRequired: true,
      idempotencyRequired: true,
      payloadRef: input.payloadRef ?? 'payload:1',
    },
    actor: {
      uid: 'user-1',
      organizationId: 'org-1',
      roleClass: 'hr_admin',
    },
    idempotencyKey: 'idem-1',
    simulateOnly: input.simulateOnly ?? false,
  };
}

function fakeExecutors(): {
  executors: StrategicDomainExecutors;
  calls: Record<string, ReturnType<typeof vi.fn>>;
} {
  const calls = {
    createEmployee: vi.fn(async () => ({
      worker: { id: 'worker-1' },
    })),
    correctEmployee: vi.fn(async () => ({
      workerId: 'worker-1',
    })),
    createRequisition: vi.fn(async () => ({
      id: 'req-1',
    })),
    hireCandidate: vi.fn(async () => ({
      workerId: 'worker-hired',
      deduplicated: false,
    })),
    createPrehireCase: vi.fn(async () => ({
      case: { id: 'case-1' },
      accessUrl: 'https://example.invalid/prehire#token=must-not-leak',
    })),
    requestLeave: vi.fn(async () => ({
      id: 'leave-1',
      status: 'pending',
    })),
    actOnLeave: vi.fn(async () => ({
      id: 'leave-1',
      status: 'approved',
    })),
    clock: vi.fn(async () => ({
      id: 'time-1',
      status: 'open',
    })),
    exportPayrollCsv: vi.fn(async () => ({
      csv: 'private,payroll,data',
      run: { id: 'payroll-1' },
    })),
    startWorkflow: vi.fn(async () => ({
      run: { id: 'workflow-1' },
      steps: 4,
      deduplicated: false,
    })),
  };

  return {
    calls,
    executors: calls,
  };
}

function registryWith(
  payloads: Record<string, unknown>,
  actor: ActorContext = actorContext,
) {
  const { executors, calls } = fakeExecutors();

  const registry = createStrategicDomainServiceRegistry({
    resolveActorContext: async () => actor,
    resolvePayload: async ({ payloadRef }) => {
      if (!(payloadRef in payloads)) {
        throw new Error('test payload not found');
      }
      return payloads[payloadRef];
    },
    executors,
  });

  return { registry, calls };
}

describe('H49 authoritative domain bindings', () => {
  it('binds all required strategic domains without duplicate service keys', () => {
    expect(
      new Set(strategicDomainBindingCatalog.map((binding) => binding.key)).size,
    ).toBe(strategicDomainBindingCatalog.length);

    expect(
      new Set(strategicDomainBindingCatalog.map((binding) => binding.domain)),
    ).toEqual(
      new Set([
        'core_hr',
        'recruiting',
        'onboarding',
        'leave',
        'time_attendance',
        'payroll',
        'workflow',
      ]),
    );
  });

  it('executes Core HR employee creation through the bound domain executor', async () => {
    const { registry, calls } = registryWith({
      'payload:1': {
        legalFirstName: 'A',
        legalLastName: 'Worker',
      },
    });

    const result = await registry
      .get('core_hr.create_employee')!
      .execute(
        executionContext({
          key: 'core_hr.create_employee',
          permission: 'people.manage',
        }),
      );

    expect(result.outcome).toBe('completed');
    expect(result.resultReference).toBe('worker:worker-1');
    expect(calls.createEmployee).toHaveBeenCalledTimes(1);
  });

  it('requires an explicit worker id for employee correction', async () => {
    const { registry } = registryWith({
      'payload:1': {
        body: { preferredName: 'Updated' },
      },
    });

    await expect(
      registry
        .get('core_hr.correct_employee')!
        .execute(
          executionContext({
            key: 'core_hr.correct_employee',
            permission: 'people.manage',
          }),
        ),
    ).rejects.toThrow(/workerId is required/i);
  });

  it('binds recruiting requisition creation but blocks direct R5 hiring execution', async () => {
    const { registry, calls } = registryWith({
      'payload:1': {
        applicationId: 'app-1',
        offerId: 'offer-1',
      },
    });

    const requisition = await registry
      .get('recruiting.create_requisition')!
      .execute(
        executionContext({
          key: 'recruiting.create_requisition',
          permission: 'recruiting.manage',
        }),
      );

    expect(requisition.outcome).toBe('completed');
    expect(requisition.resultReference).toBe('requisition:req-1');

    const hire = await registry
      .get('recruiting.hire_candidate')!
      .execute(
        executionContext({
          key: 'recruiting.hire_candidate',
          permission: 'recruiting.hire',
          riskClass: 'consequential',
        }),
      );

    expect(hire.outcome).toBe('blocked');
    expect(hire.messageCode).toBe(
      'CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED',
    );
    expect(calls.hireCandidate).not.toHaveBeenCalled();
  });

  it('does not expose the prehire access URL in an orchestration receipt', async () => {
    const { registry } = registryWith({
      'payload:1': {
        offerId: 'offer-1',
      },
    });

    const result = await registry
      .get('onboarding.create_prehire_case')!
      .execute(
        executionContext({
          key: 'onboarding.create_prehire_case',
          permission: 'onboarding.manage',
        }),
      );

    expect(result.outcome).toBe('completed');
    expect(result.resultReference).toBe('onboardingCase:case-1');
    expect(JSON.stringify(result)).not.toContain('token=');
    expect(JSON.stringify(result)).not.toContain('accessUrl');
  });

  it('splits leave approval and cancellation into permission-safe bindings', async () => {
    const approval = registryWith({
      'payload:1': {
        requestId: 'leave-1',
        body: { action: 'approve' },
      },
    });

    const approved = await approval.registry
      .get('leave.approve_request')!
      .execute(
        executionContext({
          key: 'leave.approve_request',
          permission: 'leave.approve',
        }),
      );

    expect(approved.resultReference).toBe('leaveRequest:leave-1');
    expect(approval.calls.actOnLeave).toHaveBeenCalledTimes(1);

    const invalid = registryWith({
      'payload:1': {
        requestId: 'leave-1',
        body: { action: 'approve' },
      },
    });

    await expect(
      invalid.registry
        .get('leave.cancel_request')!
        .execute(
          executionContext({
            key: 'leave.cancel_request',
            permission: 'leave.request',
          }),
        ),
    ).rejects.toThrow(/accepts only cancel/i);
  });

  it('binds time clock through the authoritative time executor', async () => {
    const { registry, calls } = registryWith({
      'payload:1': {
        action: 'clock_in',
      },
    });

    const result = await registry
      .get('time_attendance.clock')!
      .execute(
        executionContext({
          key: 'time_attendance.clock',
          permission: 'time.clock',
        }),
      );

    expect(result.resultReference).toBe('timeEntry:time-1');
    expect(calls.clock).toHaveBeenCalledTimes(1);
  });

  it('treats payroll export as R4 and never returns CSV content in the receipt', async () => {
    const { registry, calls } = registryWith({
      'payload:1': {
        periodStart: '2026-08-31',
        periodEnd: '2026-09-06',
      },
    });

    const result = await registry
      .get('payroll.export')!
      .execute(
        executionContext({
          key: 'payroll.export',
          permission: 'payroll.export',
          riskClass: 'high_impact_admin',
        }),
      );

    expect(result.outcome).toBe('completed');
    expect(result.resultReference).toBe('payrollExport:payroll-1');
    expect(JSON.stringify(result)).not.toContain('private,payroll,data');
    expect(calls.exportPayrollCsv).toHaveBeenCalledTimes(1);
  });

  it('binds workflow start to the authoritative workflow executor', async () => {
    const { registry, calls } = registryWith({
      'payload:1': {
        workflowId: 'workflow-definition-1',
      },
    });

    const result = await registry
      .get('workflow.start')!
      .execute(
        executionContext({
          key: 'workflow.start',
          permission: 'workflow.run',
        }),
      );

    expect(result.resultReference).toBe('workflowRun:workflow-1');
    expect(calls.startWorkflow).toHaveBeenCalledTimes(1);
  });

  it('blocks simulation before any authoritative domain write', async () => {
    const { registry, calls } = registryWith({
      'payload:1': { anything: true },
    });

    const result = await registry
      .get('core_hr.create_employee')!
      .execute(
        executionContext({
          key: 'core_hr.create_employee',
          permission: 'people.manage',
          simulateOnly: true,
        }),
      );

    expect(result.outcome).toBe('blocked');
    expect(result.messageCode).toBe(
      'DOMAIN_SIMULATION_REQUIRES_IMPACT_PREVIEW',
    );
    expect(calls.createEmployee).not.toHaveBeenCalled();
  });

  it('rechecks the resolved domain actor identity, tenant and permission', async () => {
    const wrongOrg: ActorContext = {
      ...actorContext,
      orgId: 'org-2',
    };

    const { registry, calls } = registryWith(
      {
        'payload:1': { anything: true },
      },
      wrongOrg,
    );

    await expect(
      registry
        .get('core_hr.create_employee')!
        .execute(
          executionContext({
            key: 'core_hr.create_employee',
            permission: 'people.manage',
          }),
        ),
    ).rejects.toThrow(/organization does not match/i);

    expect(calls.createEmployee).not.toHaveBeenCalled();
  });

  it('blocks a mismatched permission before payload resolution or domain execution', async () => {
    const { registry, calls } = registryWith({
      'payload:1': { anything: true },
    });

    const result = await registry
      .get('workflow.start')!
      .execute(
        executionContext({
          key: 'workflow.start',
          permission: 'people.manage',
        }),
      );

    expect(result.outcome).toBe('blocked');
    expect(result.messageCode).toBe('SERVICE_PERMISSION_MISMATCH');
    expect(calls.startWorkflow).not.toHaveBeenCalled();
  });
});
