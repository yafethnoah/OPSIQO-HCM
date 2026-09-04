import { hashIdempotencyKey } from "./idempotency";
import type {
  OrchestrationPlan,
  OrchestrationStep,
  ServiceExecutionResult,
  StepReceipt,
} from "./types";

export function createStepReceipt(input: {
  plan: OrchestrationPlan;
  step: OrchestrationStep;
  result: ServiceExecutionResult;
  executedAtUtc: string;
  idempotencyKey: string | null;
}): StepReceipt {
  return {
    planId: input.plan.planId,
    stepId: input.step.id,
    serviceKey: input.step.authoritativeService,
    status:
      input.result.outcome === "completed"
        ? "completed"
        : input.result.outcome === "reconciliation_required" ||
            input.result.outcome === "unknown_after_write"
          ? "reconciliation_required"
          : input.result.outcome === "blocked"
            ? "blocked"
            : "failed",
    executedAtUtc: input.executedAtUtc,
    idempotencyKeyHash: input.idempotencyKey
      ? hashIdempotencyKey(input.idempotencyKey)
      : undefined,
    resultReference: input.result.resultReference,
    auditReference: input.result.auditReference,
    messageCode: input.result.messageCode,
  };
}
