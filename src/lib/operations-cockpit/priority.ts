import type { CockpitItem, CockpitPriority } from "./types";

const RISK_POINTS = {
  informational: 0,
  low: 5,
  medium: 15,
  high: 35,
  critical: 60,
} as const;

export function calculateCockpitPriority(
  item: CockpitItem,
  now: Date
): CockpitPriority {
  let score: number = RISK_POINTS[item.risk];
  const reasons: string[] = [];

  if (item.risk === "critical") reasons.push("critical_risk");
  if (item.risk === "high") reasons.push("high_risk");

  if (item.status === "reconciliation_required") {
    score += 50;
    reasons.push("reconciliation_required");
  }

  if (item.status === "blocked") {
    score += 30;
    reasons.push("blocked");
  }

  if (item.status === "failed") {
    score += 25;
    reasons.push("failed");
  }

  if (item.complianceImpact) {
    score += 20;
    reasons.push("compliance_impact");
  }

  if ((item.downstreamBlockedCount ?? 0) > 0) {
    const points = Math.min(20, item.downstreamBlockedCount ?? 0);
    score += points;
    reasons.push("downstream_work_blocked");
  }

  if (item.dueAtUtc) {
    const due = Date.parse(item.dueAtUtc);
    if (Number.isFinite(due)) {
      const diffDays = (due - now.getTime()) / 86_400_000;

      if (diffDays < 0) {
        const overdueDays = Math.min(30, Math.ceil(Math.abs(diffDays)));
        score += 20 + overdueDays;
        reasons.push("overdue");
      } else if (diffDays <= 1) {
        score += 15;
        reasons.push("due_within_1_day");
      } else if (diffDays <= 3) {
        score += 8;
        reasons.push("due_within_3_days");
      }
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    itemId: item.id,
    score,
    band:
      score >= 80
        ? "critical"
        : score >= 55
          ? "high"
          : score >= 30
            ? "medium"
            : "normal",
    reasons,
  };
}
