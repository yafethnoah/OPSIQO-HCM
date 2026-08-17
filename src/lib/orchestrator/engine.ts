import {
  dependenciesCompleted,
  nextReadySteps,
  validateDependencyGraph,
} from "./dependencyGraph";
import { buildIdempotencyKey } from "./idempotency";
import {
  isPlanAuthorizationExpired,
  planContainsProhibitedAutonomy,
  validateExecutableStep,
  validateTenantScope,
} from "./governance";
import { createStepReceipt } from "./receipts";
import { validateServiceBindings } from "./serviceBindings";
import type {
  OrchestrationActor,
  OrchestrationPlan,
  OrchestrationStep,
  OrchestratorDependencies,
  StepReceipt,
} from "./types";

export type OrchestratorRunResult = {
  plan: OrchestrationPlan;
  receipts: StepReceipt[];
  blockedReasons: string[];
};

function clonePlan(plan: OrchestrationPlan): OrchestrationPlan {
  return {
    ...plan,
    steps: plan.steps.map(step => ({
      ...step,
      dependencies: [...step.dependencies],
      evidenceRefs: [...(step.evidenceRefs ?? [])],
    })),
    evidenceRefs: [...plan.evidenceRefs],
  };
}

function updatePlanState(plan: OrchestrationPlan): void {
  if (plan.steps.every(step => step.state === "completed" || (step.optional && step.state === "cancelled"))) {
    plan.state = "completed";
    return;
  }

  if (plan.steps.some(step => step.state === "reconciliation_required")) {
    plan.state = "reconciliation_required";
    return;
  }

  if (plan.steps.some(step => step.state === "awaiting_confirmation")) {
    plan.state = "waiting_for_human";
    return;
  }

  const completed = plan.steps.some(step => step.state === "completed");
  const blocked = plan.steps.some(
    step => step.state === "blocked" || step.state === "failed"
  );

  if (completed && blocked) {
    plan.state = "partially_completed";
    return;
  }

  if (blocked) {
    plan.state = "blocked";
    return;
  }

  if (plan.steps.some(step => step.state === "executing")) {
    plan.state = "executing";
    return;
  }

  plan.state = "ready";
}

export class GovernedOrchestrator {
  constructor(private readonly deps: OrchestratorDependencies) {}

  validatePlan(plan: OrchestrationPlan): string[] {
    const errors: string[] = [];

    if (planContainsProhibitedAutonomy(plan)) {
      errors.push("PROHIBITED_AUTONOMOUS_GOAL");
    }

    const graph = validateDependencyGraph(plan);
    errors.push(...graph.errors);

    for (const step of plan.steps) {
      errors.push(...validateExecutableStep(step).map(error => `${step.id}:${error}`));
    }

    errors.push(...validateServiceBindings(plan.steps, this.deps.services));

    return [...new Set(errors)];
  }

  async run(input: {
    plan: OrchestrationPlan;
    actor: OrchestrationActor;
    confirmedStepIds?: string[];
    simulateOnly?: boolean;
  }): Promise<OrchestratorRunResult> {
    const plan = clonePlan(input.plan);
    const receipts: StepReceipt[] = [];
    const blockedReasons: string[] = [];
    const confirmed = new Set(input.confirmedStepIds ?? []);

    const validationErrors = this.validatePlan(plan);
    if (validationErrors.length) {
      plan.state = "blocked";
      return { plan, receipts, blockedReasons: validationErrors };
    }

    if (!validateTenantScope(plan, input.actor)) {
      plan.state = "blocked";
      return { plan, receipts, blockedReasons: ["TENANT_SCOPE_DENIED"] };
    }

    const tenantAllowed = await this.deps.tenantScopeChecker({
      actor: input.actor,
      organizationId: plan.organizationId,
    });

    if (!tenantAllowed) {
      plan.state = "blocked";
      return { plan, receipts, blockedReasons: ["TENANT_SCOPE_DENIED"] };
    }

    if (isPlanAuthorizationExpired(plan, this.deps.now())) {
      plan.state = "blocked";
      return { plan, receipts, blockedReasons: ["PLAN_AUTHORIZATION_EXPIRED"] };
    }

    let madeProgress = true;

    while (madeProgress) {
      madeProgress = false;
      const candidates = nextReadySteps(plan);

      for (const step of candidates) {
        if (!dependenciesCompleted(plan, step)) continue;

        if (step.humanCheckpoint || step.confirmationRequired) {
          if (!confirmed.has(step.id)) {
            step.state = "awaiting_confirmation";
            updatePlanState(plan);
            continue;
          }
        }

        if (isPlanAuthorizationExpired(plan, this.deps.now())) {
          step.state = "blocked";
          step.blockedReason = "PLAN_AUTHORIZATION_EXPIRED";
          blockedReasons.push(`${step.id}:PLAN_AUTHORIZATION_EXPIRED`);
          updatePlanState(plan);
          return { plan, receipts, blockedReasons };
        }

        const permissionAllowed = await this.deps.permissionChecker({
          actor: input.actor,
          permission: step.permission,
          organizationId: plan.organizationId,
          step,
        });

        if (!permissionAllowed) {
          step.state = "blocked";
          step.blockedReason = "PERMISSION_DENIED_AT_EXECUTION";
          blockedReasons.push(`${step.id}:PERMISSION_DENIED_AT_EXECUTION`);
          updatePlanState(plan);
          continue;
        }

        const service = this.deps.services.get(step.authoritativeService);
        if (!service) {
          step.state = "blocked";
          step.blockedReason = "AUTHORITATIVE_SERVICE_UNBOUND";
          blockedReasons.push(`${step.id}:AUTHORITATIVE_SERVICE_UNBOUND`);
          updatePlanState(plan);
          continue;
        }

        const idempotencyKey =
          step.riskClass === "read_only"
            ? null
            : buildIdempotencyKey({
                organizationId: plan.organizationId,
                planId: plan.planId,
                stepId: step.id,
                planVersion: plan.version,
              });

        step.state = "executing";
        plan.state = "executing";

        const result = await service.execute({
          plan,
          step,
          actor: input.actor,
          idempotencyKey,
          simulateOnly: input.simulateOnly === true,
        });

        receipts.push(
          createStepReceipt({
            plan,
            step,
            result,
            executedAtUtc: this.deps.now().toISOString(),
            idempotencyKey,
          })
        );

        if (result.outcome === "completed") {
          step.state = "completed";
          step.resultRef = result.resultReference;
          madeProgress = true;
          continue;
        }

        if (
          result.outcome === "unknown_after_write" ||
          result.outcome === "reconciliation_required"
        ) {
          step.state = "reconciliation_required";
          step.blockedReason = "RECONCILIATION_REQUIRED";
          plan.state = "reconciliation_required";
          return { plan, receipts, blockedReasons };
        }

        if (result.outcome === "blocked") {
          step.state = "blocked";
          step.blockedReason = result.messageCode ?? "SERVICE_BLOCKED";
          blockedReasons.push(`${step.id}:${step.blockedReason}`);
          continue;
        }

        step.state = "failed";
        step.blockedReason = result.messageCode ?? "FAILED_BEFORE_WRITE";
        blockedReasons.push(`${step.id}:${step.blockedReason}`);
      }
    }

    updatePlanState(plan);
    return { plan, receipts, blockedReasons };
  }

  async reconcile(input: {
    plan: OrchestrationPlan;
    stepId: string;
    actor: OrchestrationActor;
  }): Promise<OrchestratorRunResult> {
    const plan = clonePlan(input.plan);
    const receipts: StepReceipt[] = [];
    const blockedReasons: string[] = [];

    if (!validateTenantScope(plan, input.actor)) {
      plan.state = "blocked";
      return { plan, receipts, blockedReasons: ["TENANT_SCOPE_DENIED"] };
    }

    const step = plan.steps.find(item => item.id === input.stepId);
    if (!step || step.state !== "reconciliation_required") {
      return {
        plan,
        receipts,
        blockedReasons: ["STEP_NOT_RECONCILABLE"],
      };
    }

    const service = this.deps.services.get(step.authoritativeService);
    if (!service?.reconcile) {
      return {
        plan,
        receipts,
        blockedReasons: ["RECONCILIATION_HANDLER_UNAVAILABLE"],
      };
    }

    const permissionAllowed = await this.deps.permissionChecker({
      actor: input.actor,
      permission: step.permission,
      organizationId: plan.organizationId,
      step,
    });

    if (!permissionAllowed) {
      step.state = "blocked";
      step.blockedReason = "PERMISSION_DENIED_AT_RECONCILIATION";
      updatePlanState(plan);
      return {
        plan,
        receipts,
        blockedReasons: [`${step.id}:PERMISSION_DENIED_AT_RECONCILIATION`],
      };
    }

    const idempotencyKey =
      step.riskClass === "read_only"
        ? null
        : buildIdempotencyKey({
            organizationId: plan.organizationId,
            planId: plan.planId,
            stepId: step.id,
            planVersion: plan.version,
          });

    const result = await service.reconcile({
      plan,
      step,
      actor: input.actor,
      idempotencyKey,
      simulateOnly: false,
    });

    receipts.push(
      createStepReceipt({
        plan,
        step,
        result,
        executedAtUtc: this.deps.now().toISOString(),
        idempotencyKey,
      })
    );

    if (result.outcome === "completed") {
      step.state = "completed";
      step.resultRef = result.resultReference;
    } else if (
      result.outcome === "unknown_after_write" ||
      result.outcome === "reconciliation_required"
    ) {
      step.state = "reconciliation_required";
    } else if (result.outcome === "blocked") {
      step.state = "blocked";
      step.blockedReason = result.messageCode ?? "SERVICE_BLOCKED";
    } else {
      step.state = "failed";
      step.blockedReason = result.messageCode ?? "FAILED_BEFORE_WRITE";
    }

    updatePlanState(plan);
    return { plan, receipts, blockedReasons };
  }
}
