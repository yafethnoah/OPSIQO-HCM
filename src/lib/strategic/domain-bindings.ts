import type {
  ActorContext,
  Permission,
} from '@/domain/security';
import { ServiceBindingRegistry } from '@/lib/orchestrator/serviceBindings';
import type {
  AuthoritativeServiceBinding,
  OrchestrationActor,
  OrchestrationRisk,
  ServiceExecutionContext,
  ServiceExecutionResult,
} from '@/lib/orchestrator/types';

export type StrategicDomain =
  | 'core_hr'
  | 'recruiting'
  | 'onboarding'
  | 'leave'
  | 'time_attendance'
  | 'payroll'
  | 'workflow';

export type StrategicDomainServiceKey =
  | 'core_hr.create_employee'
  | 'core_hr.correct_employee'
  | 'recruiting.create_requisition'
  | 'recruiting.hire_candidate'
  | 'onboarding.create_prehire_case'
  | 'leave.request'
  | 'leave.approve_request'
  | 'leave.cancel_request'
  | 'time_attendance.clock'
  | 'payroll.export'
  | 'workflow.start';

export interface StrategicDomainBindingDefinition {
  key: StrategicDomainServiceKey;
  domain: StrategicDomain;
  permission: Permission;
  allowedRiskClasses: readonly OrchestrationRisk[];
  directExecution: 'allowed' | 'blocked';
  description: string;
}

export const strategicDomainBindingCatalog: readonly StrategicDomainBindingDefinition[] = [
  {
    key: 'core_hr.create_employee',
    domain: 'core_hr',
    permission: 'people.manage',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Create the authoritative worker/person/employment record after governed confirmation.',
  },
  {
    key: 'core_hr.correct_employee',
    domain: 'core_hr',
    permission: 'people.manage',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Correct an existing authoritative employee core record.',
  },
  {
    key: 'recruiting.create_requisition',
    domain: 'recruiting',
    permission: 'recruiting.manage',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Create a governed recruiting requisition.',
  },
  {
    key: 'recruiting.hire_candidate',
    domain: 'recruiting',
    permission: 'recruiting.hire',
    allowedRiskClasses: ['consequential'],
    directExecution: 'blocked',
    description: 'Hiring is consequential and remains a human employment decision.',
  },
  {
    key: 'onboarding.create_prehire_case',
    domain: 'onboarding',
    permission: 'onboarding.manage',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Create the authoritative prehire/onboarding case for an accepted offer.',
  },
  {
    key: 'leave.request',
    domain: 'leave',
    permission: 'leave.request',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Submit a governed leave request.',
  },
  {
    key: 'leave.approve_request',
    domain: 'leave',
    permission: 'leave.approve',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Approve or reject a leave request through the authoritative leave service.',
  },
  {
    key: 'leave.cancel_request',
    domain: 'leave',
    permission: 'leave.request',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Cancel a leave request through the authoritative leave service.',
  },
  {
    key: 'time_attendance.clock',
    domain: 'time_attendance',
    permission: 'time.clock',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Execute an employee clock event through the authoritative time service.',
  },
  {
    key: 'payroll.export',
    domain: 'payroll',
    permission: 'payroll.export',
    allowedRiskClasses: ['high_impact_admin'],
    directExecution: 'allowed',
    description: 'Generate a governed payroll export with R4 approval controls.',
  },
  {
    key: 'workflow.start',
    domain: 'workflow',
    permission: 'workflow.run',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Start a governed workflow from an authoritative definition.',
  },
] as const;

export interface StrategicDomainExecutors {
  createEmployee(actor: ActorContext, payload: unknown): Promise<unknown>;
  correctEmployee(actor: ActorContext, workerId: string, payload: unknown): Promise<unknown>;
  createRequisition(actor: ActorContext, payload: unknown): Promise<unknown>;
  hireCandidate(actor: ActorContext, payload: unknown): Promise<unknown>;
  createPrehireCase(actor: ActorContext, payload: unknown): Promise<unknown>;
  requestLeave(actor: ActorContext, payload: unknown): Promise<unknown>;
  actOnLeave(actor: ActorContext, requestId: string, payload: unknown): Promise<unknown>;
  clock(actor: ActorContext, payload: unknown): Promise<unknown>;
  exportPayrollCsv(actor: ActorContext, periodStart: string, periodEnd: string): Promise<unknown>;
  startWorkflow(actor: ActorContext, payload: unknown): Promise<unknown>;
}

export interface StrategicPayloadResolutionRequest {
  payloadRef: string;
  planId: string;
  stepId: string;
  organizationId: string;
  actorUid: string;
}

export interface StrategicDomainBindingDependencies {
  resolveActorContext(actor: OrchestrationActor): Promise<ActorContext>;
  resolvePayload(request: StrategicPayloadResolutionRequest): Promise<unknown>;
  executors?: StrategicDomainExecutors;
}

export const productionStrategicDomainExecutors: StrategicDomainExecutors = {
  async createEmployee(actor, payload) {
    const service = await import('@/lib/hr/service');
    return service.createEmployee(actor, payload);
  },

  async correctEmployee(actor, workerId, payload) {
    const service = await import('@/lib/hr/service');
    return service.correctEmployeeCore(actor, workerId, payload);
  },

  async createRequisition(actor, payload) {
    const service = await import('@/lib/recruiting/service');
    return service.createRequisition(actor, payload);
  },

  async hireCandidate(actor, payload) {
    const service = await import('@/lib/recruiting/service');
    return service.hireCandidate(actor, payload);
  },

  async createPrehireCase(actor, payload) {
    const service = await import('@/lib/onboarding/service');
    return service.createPrehireCase(actor, payload);
  },

  async requestLeave(actor, payload) {
    const service = await import('@/lib/time/service');
    return service.requestLeave(actor, payload);
  },

  async actOnLeave(actor, requestId, payload) {
    const service = await import('@/lib/time/service');
    return service.actOnLeave(actor, requestId, payload);
  },

  async clock(actor, payload) {
    const service = await import('@/lib/time/service');
    return service.clock(actor, payload);
  },

  async exportPayrollCsv(actor, periodStart, periodEnd) {
    const service = await import('@/lib/time/service');
    return service.exportPayrollCsv(actor, periodStart, periodEnd);
  },

  async startWorkflow(actor, payload) {
    const service = await import('@/lib/workflow/service');
    return service.startWorkflow(actor, payload);
  },
};

export function createStrategicDomainServiceRegistry(
  dependencies: StrategicDomainBindingDependencies,
): ServiceBindingRegistry {
  const executors = dependencies.executors ?? productionStrategicDomainExecutors;
  const registry = new ServiceBindingRegistry();

  register(
    registry,
    definition('core_hr.create_employee'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.createEmployee(actor, bodyOrSelf(payload));
      return completed('core_hr.create_employee', result);
    },
  );

  register(
    registry,
    definition('core_hr.correct_employee'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'core employee correction payload');
      const workerId = requireString(record.workerId, 'workerId');
      const result = await executors.correctEmployee(
        actor,
        workerId,
        bodyOrSelf(record),
      );
      return completed('core_hr.correct_employee', result);
    },
  );

  register(
    registry,
    definition('recruiting.create_requisition'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.createRequisition(actor, bodyOrSelf(payload));
      return completed('recruiting.create_requisition', result);
    },
  );

  register(
    registry,
    definition('recruiting.hire_candidate'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.hireCandidate(actor, bodyOrSelf(payload));
      return completed('recruiting.hire_candidate', result);
    },
  );

  register(
    registry,
    definition('onboarding.create_prehire_case'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.createPrehireCase(actor, bodyOrSelf(payload));
      return completed('onboarding.create_prehire_case', result);
    },
  );

  register(
    registry,
    definition('leave.request'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.requestLeave(actor, bodyOrSelf(payload));
      return completed('leave.request', result);
    },
  );

  register(
    registry,
    definition('leave.approve_request'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'leave approval payload');
      const requestId = requireString(record.requestId, 'requestId');
      const body = requireRecord(bodyOrSelf(record), 'leave approval body');
      const action = requireString(body.action, 'action');

      if (!['approve', 'reject'].includes(action)) {
        throw new Error('leave approval binding accepts only approve or reject');
      }

      const result = await executors.actOnLeave(actor, requestId, body);
      return completed('leave.approve_request', result);
    },
  );

  register(
    registry,
    definition('leave.cancel_request'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'leave cancellation payload');
      const requestId = requireString(record.requestId, 'requestId');
      const body = requireRecord(bodyOrSelf(record), 'leave cancellation body');
      const action = requireString(body.action, 'action');

      if (action !== 'cancel') {
        throw new Error('leave cancellation binding accepts only cancel');
      }

      const result = await executors.actOnLeave(actor, requestId, body);
      return completed('leave.cancel_request', result);
    },
  );

  register(
    registry,
    definition('time_attendance.clock'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.clock(actor, bodyOrSelf(payload));
      return completed('time_attendance.clock', result);
    },
  );

  register(
    registry,
    definition('payroll.export'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'payroll export payload');
      const periodStart = requireString(record.periodStart, 'periodStart');
      const periodEnd = requireString(record.periodEnd, 'periodEnd');
      const result = await executors.exportPayrollCsv(
        actor,
        periodStart,
        periodEnd,
      );

      return completed('payroll.export', result);
    },
  );

  register(
    registry,
    definition('workflow.start'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.startWorkflow(actor, bodyOrSelf(payload));
      return completed('workflow.start', result);
    },
  );

  return registry;
}

function register(
  registry: ServiceBindingRegistry,
  bindingDefinition: StrategicDomainBindingDefinition,
  dependencies: StrategicDomainBindingDependencies,
  executeDomain: (input: {
    actor: ActorContext;
    payload: unknown;
    context: ServiceExecutionContext;
  }) => Promise<ServiceExecutionResult>,
): void {
  const binding: AuthoritativeServiceBinding = {
    key: bindingDefinition.key,

    async execute(context) {
      if (context.step.authoritativeService !== bindingDefinition.key) {
        return blocked('SERVICE_BINDING_MISMATCH');
      }

      if (context.step.permission !== bindingDefinition.permission) {
        return blocked('SERVICE_PERMISSION_MISMATCH');
      }

      if (
        !bindingDefinition.allowedRiskClasses.some(
          (risk) => risk === context.step.riskClass,
        )
      ) {
        return blocked('SERVICE_RISK_MISMATCH');
      }

      if (bindingDefinition.directExecution === 'blocked') {
        return blocked('CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED');
      }

      if (context.simulateOnly) {
        return blocked('DOMAIN_SIMULATION_REQUIRES_IMPACT_PREVIEW');
      }

      if (context.step.idempotencyRequired && !context.idempotencyKey) {
        return blocked('IDEMPOTENCY_KEY_REQUIRED');
      }

      const payloadRef = context.step.payloadRef?.trim();
      if (!payloadRef) {
        return {
          outcome: 'failed_before_write',
          messageCode: 'PAYLOAD_REFERENCE_REQUIRED',
        };
      }

      const actor = await dependencies.resolveActorContext(context.actor);
      assertActorContext(actor, context, bindingDefinition.permission);

      const payload = await dependencies.resolvePayload({
        payloadRef,
        planId: context.plan.planId,
        stepId: context.step.id,
        organizationId: context.plan.organizationId,
        actorUid: context.actor.uid,
      });

      return executeDomain({ actor, payload, context });
    },
  };

  registry.register(binding);
}

function definition(
  key: StrategicDomainServiceKey,
): StrategicDomainBindingDefinition {
  const found = strategicDomainBindingCatalog.find(
    (candidate) => candidate.key === key,
  );

  if (!found) {
    throw new Error(`strategic domain binding definition is missing: ${key}`);
  }

  return found;
}

function assertActorContext(
  actor: ActorContext,
  context: ServiceExecutionContext,
  permission: Permission,
): void {
  if (actor.uid !== context.actor.uid) {
    throw new Error('resolved domain actor does not match orchestration actor');
  }

  if (
    actor.orgId !== context.plan.organizationId ||
    actor.orgId !== context.actor.organizationId
  ) {
    throw new Error('resolved domain actor organization does not match the plan');
  }

  if (!actor.permissions.includes(permission)) {
    throw new Error('resolved domain actor is missing the required permission');
  }
}

function bodyOrSelf(payload: unknown): unknown {
  if (isRecord(payload) && Object.prototype.hasOwnProperty.call(payload, 'body')) {
    return payload.body;
  }

  return payload;
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`);
  }

  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function blocked(messageCode: string): ServiceExecutionResult {
  return {
    outcome: 'blocked',
    messageCode,
  };
}

function completed(
  key: StrategicDomainServiceKey,
  result: unknown,
): ServiceExecutionResult {
  return {
    outcome: 'completed',
    resultReference: resultReference(key, result),
    messageCode: 'DOMAIN_SERVICE_COMPLETED',
  };
}

function resultReference(
  key: StrategicDomainServiceKey,
  result: unknown,
): string | undefined {
  if (!isRecord(result)) return undefined;

  switch (key) {
    case 'core_hr.create_employee': {
      const worker = isRecord(result.worker) ? result.worker : undefined;
      const id = worker ? stringValue(worker.id) : undefined;
      return id ? `worker:${id}` : undefined;
    }

    case 'core_hr.correct_employee': {
      const id =
        stringValue(result.workerId) ??
        (isRecord(result.worker) ? stringValue(result.worker.id) : undefined) ??
        stringValue(result.id);
      return id ? `worker:${id}` : undefined;
    }

    case 'recruiting.create_requisition': {
      const id = stringValue(result.id);
      return id ? `requisition:${id}` : undefined;
    }

    case 'recruiting.hire_candidate': {
      const id = stringValue(result.workerId);
      return id ? `worker:${id}` : undefined;
    }

    case 'onboarding.create_prehire_case': {
      const onboardingCase = isRecord(result.case) ? result.case : undefined;
      const id = onboardingCase ? stringValue(onboardingCase.id) : undefined;
      return id ? `onboardingCase:${id}` : undefined;
    }

    case 'leave.request':
    case 'leave.approve_request':
    case 'leave.cancel_request': {
      const id = stringValue(result.id);
      return id ? `leaveRequest:${id}` : undefined;
    }

    case 'time_attendance.clock': {
      const entry = isRecord(result.entry) ? result.entry : undefined;
      const id =
        stringValue(result.id) ??
        (entry ? stringValue(entry.id) : undefined);
      return id ? `timeEntry:${id}` : undefined;
    }

    case 'payroll.export': {
      const run = isRecord(result.run) ? result.run : undefined;
      const id = run ? stringValue(run.id) : undefined;
      return id ? `payrollExport:${id}` : undefined;
    }

    case 'workflow.start': {
      const run = isRecord(result.run) ? result.run : undefined;
      const id = run ? stringValue(run.id) : undefined;
      return id ? `workflowRun:${id}` : undefined;
    }
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : undefined;
}
