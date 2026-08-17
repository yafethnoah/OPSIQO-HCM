import type { OrchestrationPlan } from "./types";

export type OrchestrationProgress = {
  applicableSteps: number;
  completedSteps: number;
  blockedSteps: number;
  activeSteps: number;
  percent: number;
  indeterminate: boolean;
  planState: OrchestrationPlan["state"];
};

export function calculatePlanProgress(
  plan: OrchestrationPlan
): OrchestrationProgress {
  const applicable = plan.steps.filter(step => !step.optional || step.state !== "cancelled");
  const completed = applicable.filter(step => step.state === "completed").length;
  const blocked = applicable.filter(
    step => step.state === "blocked" || step.state === "failed"
  ).length;
  const active = applicable.filter(
    step =>
      step.state === "executing" ||
      step.state === "awaiting_confirmation" ||
      step.state === "reconciliation_required"
  ).length;

  const percent =
    applicable.length === 0
      ? 0
      : Math.round((completed / applicable.length) * 100);

  return {
    applicableSteps: applicable.length,
    completedSteps: completed,
    blockedSteps: blocked,
    activeSteps: active,
    percent,
    indeterminate:
      plan.state === "reconciliation_required" ||
      plan.state === "waiting_for_human",
    planState: plan.state,
  };
}
