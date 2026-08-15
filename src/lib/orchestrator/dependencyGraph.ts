import type { OrchestrationPlan, OrchestrationStep } from "./types";

export type DependencyValidation = {
  valid: boolean;
  errors: string[];
};

export function validateDependencyGraph(
  plan: OrchestrationPlan
): DependencyValidation {
  const errors: string[] = [];
  const byId = new Map(plan.steps.map(step => [step.id, step]));

  for (const step of plan.steps) {
    if (step.dependencies.includes(step.id)) {
      errors.push(`${step.id}:SELF_DEPENDENCY`);
    }

    for (const dependencyId of step.dependencies) {
      if (!byId.has(dependencyId)) {
        errors.push(`${step.id}:UNKNOWN_DEPENDENCY:${dependencyId}`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(step: OrchestrationStep): void {
    if (visited.has(step.id)) return;
    if (visiting.has(step.id)) {
      errors.push(`${step.id}:DEPENDENCY_CYCLE`);
      return;
    }

    visiting.add(step.id);

    for (const dependencyId of step.dependencies) {
      const dependency = byId.get(dependencyId);
      if (dependency) visit(dependency);
    }

    visiting.delete(step.id);
    visited.add(step.id);
  }

  for (const step of plan.steps) visit(step);

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
  };
}

export function dependenciesCompleted(
  plan: OrchestrationPlan,
  step: OrchestrationStep
): boolean {
  const byId = new Map(plan.steps.map(item => [item.id, item]));
  return step.dependencies.every(
    dependencyId => byId.get(dependencyId)?.state === "completed"
  );
}

export function nextReadySteps(plan: OrchestrationPlan): OrchestrationStep[] {
  return plan.steps.filter(
    step =>
      (step.state === "waiting" || step.state === "ready") &&
      dependenciesCompleted(plan, step)
  );
}
