"use client";

import { trackProductEvent } from "./productAnalytics";

export type OpsiQoModule =
  | "home"
  | "superapp"
  | "core_hr"
  | "leave"
  | "recruiting"
  | "onboarding"
  | "documents"
  | "imports"
  | "studio"
  | "ai"
  | "analytics"
  | "admin"
  | "other";

export type RoleClass =
  | "employee"
  | "manager"
  | "hr"
  | "organization_admin"
  | "system_admin"
  | "guest"
  | "unknown";

function durationBucket(ms: number): string {
  if (ms < 250) return "lt_250ms";
  if (ms < 1000) return "250_1000ms";
  if (ms < 3000) return "1_3s";
  if (ms < 10000) return "3_10s";
  if (ms < 30000) return "10_30s";
  return "gt_30s";
}

export function startWorkflowTelemetry(input: {
  module: OpsiQoModule;
  workflow: string;
  roleClass: RoleClass;
}) {
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  void trackProductEvent("opsiqo_workflow_started", {
    module: input.module,
    workflow: input.workflow,
    role_class: input.roleClass,
  });

  return {
    completed(result: "success" | "failure" | "blocked" | "partial" = "success") {
      const endedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      return trackProductEvent("opsiqo_workflow_completed", {
        module: input.module,
        workflow: input.workflow,
        role_class: input.roleClass,
        result,
        duration_bucket: durationBucket(Math.max(0, endedAt - startedAt)),
      });
    },

    abandoned() {
      const endedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      return trackProductEvent("opsiqo_workflow_abandoned", {
        module: input.module,
        workflow: input.workflow,
        role_class: input.roleClass,
        result: "cancelled",
        duration_bucket: durationBucket(Math.max(0, endedAt - startedAt)),
      });
    },

    validationFailed(failureCategory: string) {
      return trackProductEvent("opsiqo_workflow_validation_failed", {
        module: input.module,
        workflow: input.workflow,
        role_class: input.roleClass,
        result: "failure",
        failure_category: failureCategory,
        validation_result: "failed",
      });
    },
  };
}
