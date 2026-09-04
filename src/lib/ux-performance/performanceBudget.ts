export const CORE_WEB_VITAL_TARGETS = {
  LCP: { goodMax: 2500, unit: "ms" },
  INP: { goodMax: 200, unit: "ms" },
  CLS: { goodMax: 0.1, unit: "score" },
} as const;

export type BudgetResult = {
  metric: keyof typeof CORE_WEB_VITAL_TARGETS;
  value: number;
  target: number;
  pass: boolean;
};

export function evaluateCoreWebVital(
  metric: keyof typeof CORE_WEB_VITAL_TARGETS,
  value: number
): BudgetResult {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Metric value must be a finite non-negative number.");
  }

  const target = CORE_WEB_VITAL_TARGETS[metric].goodMax;
  return {
    metric,
    value,
    target,
    pass: value <= target,
  };
}
