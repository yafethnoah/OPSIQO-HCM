import type {
  ActorContext,
  Permission,
} from '@/domain/security';
import type {
  AuthoritativeServiceBinding,
  OrchestrationActor,
  OrchestrationRisk,
  ServiceExecutionContext,
  ServiceExecutionResult,
} from '@/lib/orchestrator/types';
import { ServiceBindingRegistry } from '@/lib/orchestrator/serviceBindings';
import {
  createStrategicDomainServiceRegistry,
  type StrategicDomainBindingDependencies,
} from './domain-bindings';

export type EnterpriseStrategicDomain =
  | 'compensation'
  | 'performance'
  | 'succession'
  | 'separation'
  | 'employee_relations'
  | 'learning_skills'
  | 'workforce_planning'
  | 'regulatory';

export type EnterpriseStrategicServiceKey =
  | 'compensation.decide_recommendation'
  | 'performance.manager_assessment'
  | 'performance.calibrate_review'
  | 'performance.pip_action'
  | 'succession.save_nomination'
  | 'separation.case_action'
  | 'employee_relations.add_finding'
  | 'learning.assign'
  | 'workforce_planning.create_scenario'
  | 'regulatory.create_legal_review';

export interface EnterpriseDomainBindingDefinition {
  key: EnterpriseStrategicServiceKey;
  domain: EnterpriseStrategicDomain;
  permission: Permission;
  allowedRiskClasses: readonly OrchestrationRisk[];
  directExecution: 'allowed' | 'blocked';
  description: string;
}

export const enterpriseDomainBindingCatalog: readonly EnterpriseDomainBindingDefinition[] = [
  {
    key: 'compensation.decide_recommendation',
    domain: 'compensation',
    permission: 'compensation.approve',
    allowedRiskClasses: ['high_impact_admin'],
    directExecution: 'allowed',
    description: 'Compensation recommendation decisions require R4 approval evidence and confirmation.',
  },
  {
    key: 'performance.manager_assessment',
    domain: 'performance',
    permission: 'performance.review',
    allowedRiskClasses: ['consequential'],
    directExecution: 'blocked',
    description: 'Manager performance assessment is consequential employment evidence and remains human-authored.',
  },
  {
    key: 'performance.calibrate_review',
    domain: 'performance',
    permission: 'performance.calibrate',
    allowedRiskClasses: ['consequential'],
    directExecution: 'blocked',
    description: 'Performance calibration remains a human employment decision.',
  },
  {
    key: 'performance.pip_action',
    domain: 'performance',
    permission: 'performance.pip',
    allowedRiskClasses: ['consequential'],
    directExecution: 'blocked',
    description: 'Performance improvement plan actions are R5 discipline-adjacent and cannot be autonomously executed.',
  },
  {
    key: 'succession.save_nomination',
    domain: 'succession',
    permission: 'succession.manage',
    allowedRiskClasses: ['consequential'],
    directExecution: 'blocked',
    description: 'Succession nomination is an R5 talent decision and requires human authority.',
  },
  {
    key: 'separation.case_action',
    domain: 'separation',
    permission: 'separation.approve',
    allowedRiskClasses: ['consequential'],
    directExecution: 'blocked',
    description: 'Separation actions are R6 and require specialist review plus a recorded human decision.',
  },
  {
    key: 'employee_relations.add_finding',
    domain: 'employee_relations',
    permission: 'er.findings',
    allowedRiskClasses: ['consequential'],
    directExecution: 'blocked',
    description: 'Employee-relations findings are consequential case evidence and remain specialist-controlled.',
  },
  {
    key: 'learning.assign',
    domain: 'learning_skills',
    permission: 'learning.assign',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Routine learning assignment can execute as R3 with confirmation.',
  },
  {
    key: 'workforce_planning.create_scenario',
    domain: 'workforce_planning',
    permission: 'workforce.manage',
    allowedRiskClasses: ['administrative'],
    directExecution: 'allowed',
    description: 'Scenario creation writes planning state only and does not execute workforce changes.',
  },
  {
    key: 'regulatory.create_legal_review',
    domain: 'regulatory',
    permission: 'regulatory.manage',
    allowedRiskClasses: ['high_impact_admin'],
    directExecution: 'allowed',
    description: 'Legal-review case creation is R4 administration; legal conclusions remain specialist decisions.',
  },
] as const;

export interface EnterpriseStrategicExecutors {
  actRecommendation(actor: ActorContext, recommendationId: string, payload: unknown): Promise<unknown>;
  submitManagerAssessment(actor: ActorContext, reviewId: string, payload: unknown): Promise<unknown>;
  calibrateReview(actor: ActorContext, reviewId: string, payload: unknown): Promise<unknown>;
  actOnPip(actor: ActorContext, pipId: string, payload: unknown): Promise<unknown>;
  saveSuccessorNomination(actor: ActorContext, payload: unknown): Promise<unknown>;
  actSeparation(actor: ActorContext, caseId: string, payload: unknown): Promise<unknown>;
  addFinding(actor: ActorContext, caseId: string, payload: unknown): Promise<unknown>;
  assignLearning(actor: ActorContext, payload: unknown): Promise<unknown>;
  createWorkforceScenario(actor: ActorContext, payload: unknown): Promise<unknown>;
  createLegalReview(actor: ActorContext, payload: unknown): Promise<unknown>;
}

export interface EnterpriseDomainBindingDependencies
  extends StrategicDomainBindingDependencies {
  enterpriseExecutors?: EnterpriseStrategicExecutors;
}

export const productionEnterpriseStrategicExecutors: EnterpriseStrategicExecutors = {
  async actRecommendation(actor, recommendationId, payload) {
    const service = await import('@/lib/compensation/service');
    return service.actRecommendation(actor, recommendationId, payload);
  },

  async submitManagerAssessment(actor, reviewId, payload) {
    const service = await import('@/lib/performance/service');
    return service.submitManagerAssessment(actor, reviewId, payload);
  },

  async calibrateReview(actor, reviewId, payload) {
    const service = await import('@/lib/performance/service');
    return service.calibrateReview(actor, reviewId, payload);
  },

  async actOnPip(actor, pipId, payload) {
    const service = await import('@/lib/performance/service');
    return service.actOnPip(actor, pipId, payload);
  },

  async saveSuccessorNomination(actor, payload) {
    const service = await import('@/lib/career/service');
    return service.saveSuccessorNomination(actor, payload);
  },

  async actSeparation(actor, caseId, payload) {
    const service = await import('@/lib/separation/service');
    return service.actSeparation(actor, caseId, payload);
  },

  async addFinding(actor, caseId, payload) {
    const service = await import('@/lib/employee-relations/service');
    return service.addFinding(actor, caseId, payload);
  },

  async assignLearning(actor, payload) {
    const service = await import('@/lib/learning/service');
    return service.assignLearning(actor, payload);
  },

  async createWorkforceScenario(actor, payload) {
    const service = await import('@/lib/workforce-planning/service');
    return service.createWorkforceScenario(actor, payload);
  },

  async createLegalReview(actor, payload) {
    const service = await import('@/lib/regulatory/service');
    return service.createLegalReview(actor, payload);
  },
};

export function createEnterpriseStrategicServiceRegistry(
  dependencies: EnterpriseDomainBindingDependencies,
): ServiceBindingRegistry {
  const registry = createStrategicDomainServiceRegistry(dependencies);
  const executors =
    dependencies.enterpriseExecutors ?? productionEnterpriseStrategicExecutors;

  registerEnterprise(
    registry,
    definition('compensation.decide_recommendation'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'compensation decision payload');
      const recommendationId = requireString(
        record.recommendationId,
        'recommendationId',
      );
      const result = await executors.actRecommendation(
        actor,
        recommendationId,
        bodyOrSelf(record),
      );
      return completed('compensation.decide_recommendation', result);
    },
  );

  registerEnterprise(
    registry,
    definition('performance.manager_assessment'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'performance assessment payload');
      const reviewId = requireString(record.reviewId, 'reviewId');
      const result = await executors.submitManagerAssessment(
        actor,
        reviewId,
        bodyOrSelf(record),
      );
      return completed('performance.manager_assessment', result);
    },
  );

  registerEnterprise(
    registry,
    definition('performance.calibrate_review'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'performance calibration payload');
      const reviewId = requireString(record.reviewId, 'reviewId');
      const result = await executors.calibrateReview(
        actor,
        reviewId,
        bodyOrSelf(record),
      );
      return completed('performance.calibrate_review', result);
    },
  );

  registerEnterprise(
    registry,
    definition('performance.pip_action'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'PIP action payload');
      const pipId = requireString(record.pipId, 'pipId');
      const result = await executors.actOnPip(
        actor,
        pipId,
        bodyOrSelf(record),
      );
      return completed('performance.pip_action', result);
    },
  );

  registerEnterprise(
    registry,
    definition('succession.save_nomination'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.saveSuccessorNomination(
        actor,
        bodyOrSelf(payload),
      );
      return completed('succession.save_nomination', result);
    },
  );

  registerEnterprise(
    registry,
    definition('separation.case_action'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'separation action payload');
      const caseId = requireString(record.caseId, 'caseId');
      const result = await executors.actSeparation(
        actor,
        caseId,
        bodyOrSelf(record),
      );
      return completed('separation.case_action', result);
    },
  );

  registerEnterprise(
    registry,
    definition('employee_relations.add_finding'),
    dependencies,
    async ({ actor, payload }) => {
      const record = requireRecord(payload, 'employee-relations finding payload');
      const caseId = requireString(record.caseId, 'caseId');
      const result = await executors.addFinding(
        actor,
        caseId,
        bodyOrSelf(record),
      );
      return completed('employee_relations.add_finding', result);
    },
  );

  registerEnterprise(
    registry,
    definition('learning.assign'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.assignLearning(actor, bodyOrSelf(payload));
      return completed('learning.assign', result);
    },
  );

  registerEnterprise(
    registry,
    definition('workforce_planning.create_scenario'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.createWorkforceScenario(
        actor,
        bodyOrSelf(payload),
      );
      return completed('workforce_planning.create_scenario', result);
    },
  );

  registerEnterprise(
    registry,
    definition('regulatory.create_legal_review'),
    dependencies,
    async ({ actor, payload }) => {
      const result = await executors.createLegalReview(
        actor,
        bodyOrSelf(payload),
      );
      return completed('regulatory.create_legal_review', result);
    },
  );

  return registry;
}

function registerEnterprise(
  registry: ServiceBindingRegistry,
  bindingDefinition: EnterpriseDomainBindingDefinition,
  dependencies: EnterpriseDomainBindingDependencies,
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
  key: EnterpriseStrategicServiceKey,
): EnterpriseDomainBindingDefinition {
  const found = enterpriseDomainBindingCatalog.find(
    (candidate) => candidate.key === key,
  );

  if (!found) {
    throw new Error(`enterprise domain binding definition is missing: ${key}`);
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
  key: EnterpriseStrategicServiceKey,
  result: unknown,
): ServiceExecutionResult {
  return {
    outcome: 'completed',
    resultReference: resultReference(key, result),
    messageCode: 'DOMAIN_SERVICE_COMPLETED',
  };
}

function resultReference(
  key: EnterpriseStrategicServiceKey,
  result: unknown,
): string | undefined {
  if (!isRecord(result)) return undefined;

  switch (key) {
    case 'compensation.decide_recommendation': {
      const id =
        stringValue(result.id) ??
        stringValue(result.recommendationId);
      return id ? `compensationRecommendation:${id}` : undefined;
    }

    case 'performance.manager_assessment':
    case 'performance.calibrate_review': {
      const id =
        stringValue(result.id) ??
        stringValue(result.reviewId);
      return id ? `performanceReview:${id}` : undefined;
    }

    case 'performance.pip_action': {
      const id =
        stringValue(result.id) ??
        stringValue(result.pipId);
      return id ? `performancePip:${id}` : undefined;
    }

    case 'succession.save_nomination': {
      const id =
        stringValue(result.id) ??
        stringValue(result.nominationId);
      return id ? `successionNomination:${id}` : undefined;
    }

    case 'separation.case_action': {
      const id =
        stringValue(result.id) ??
        stringValue(result.caseId);
      return id ? `separationCase:${id}` : undefined;
    }

    case 'employee_relations.add_finding': {
      const id =
        stringValue(result.id) ??
        stringValue(result.findingId);
      return id ? `employeeRelationsFinding:${id}` : undefined;
    }

    case 'learning.assign': {
      const assignment = isRecord(result.assignment)
        ? result.assignment
        : undefined;
      const id =
        stringValue(result.id) ??
        (assignment ? stringValue(assignment.id) : undefined);
      return id ? `learningAssignment:${id}` : undefined;
    }

    case 'workforce_planning.create_scenario': {
      const id =
        stringValue(result.id) ??
        stringValue(result.scenarioId);
      return id ? `workforceScenario:${id}` : undefined;
    }

    case 'regulatory.create_legal_review': {
      const id =
        stringValue(result.id) ??
        stringValue(result.reviewId);
      return id ? `regulatoryLegalReview:${id}` : undefined;
    }
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : undefined;
}
