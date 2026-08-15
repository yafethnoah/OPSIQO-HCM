import type {
  OrchestrationActor,
  OrchestrationPlan,
  OrchestrationStep,
} from "./types";

export const PROHIBITED_AUTONOMOUS_GOALS = new Set([
  "terminate_employee",
  "reject_candidate",
  "hire_candidate",
  "discipline_employee",
  "promote_employee",
  "demote_employee",
  "change_individual_salary",
  "select_successor",
  "override_leave_entitlement",
  "override_compliance_requirement",
]);

export function isPlanAuthorizationExpired(
  plan: OrchestrationPlan,
  now: Date
): boolean {
  const expires = Date.parse(plan.authorizationExpiresAtUtc);
  if (!Number.isFinite(expires)) return true;
  return now.getTime() >= expires;
}

export function validateTenantScope(
  plan: OrchestrationPlan,
  actor: OrchestrationActor
): boolean {
  return (
    !!plan.organizationId &&
    plan.organizationId === actor.organizationId &&
    plan.actorUid === actor.uid
  );
}

export function validateExecutableStep(step: OrchestrationStep): string[] {
  const errors: string[] = [];

  if (!step.authoritativeService.trim()) {
    errors.push("AUTHORITATIVE_SERVICE_REQUIRED");
  }

  if (!step.permission.trim()) {
    errors.push("PERMISSION_REQUIRED");
  }

  if (step.riskClass !== "read_only" && !step.idempotencyRequired) {
    errors.push("IDEMPOTENCY_REQUIRED");
  }

  if (step.riskClass === "consequential") {
    errors.push("CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED");
  }

  if (step.humanCheckpoint && !step.confirmationRequired) {
    errors.push("HUMAN_CHECKPOINT_REQUIRES_CONFIRMATION");
  }

  return errors;
}

export function planContainsProhibitedAutonomy(plan: OrchestrationPlan): boolean {
  return PROHIBITED_AUTONOMOUS_GOALS.has(plan.goalCode);
}
