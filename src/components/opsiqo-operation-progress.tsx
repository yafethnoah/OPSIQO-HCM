"use client";

import {
  AsyncOperationProgress,
} from "@/lib/ux-performance/AsyncOperationProgress";
import {
  buildOperationProgress,
} from "@/lib/ux-performance/operationProgress";
import type {
  OperationStageId,
} from "@/lib/ux-performance/performanceTypes";

export type OpsiQoOperationProgressProps = {
  stage: OperationStageId;
  measurablePercent?: number | null;
  message?: string;
  title?: string;
};

/**
 * Truthful OPSIQO operation progress.
 *
 * - Real measurable percentages are accepted when supplied by authoritative state.
 * - Otherwise the shared 7.3 stage model is used.
 * - Awaiting confirmation and reconciliation are indeterminate.
 * - 100% is reserved for completed operations.
 */
export function OpsiQoOperationProgress({
  stage,
  measurablePercent,
  message,
  title = "AI Engine Processing",
}: OpsiQoOperationProgressProps) {
  const progress = buildOperationProgress({
    currentStageId: stage,
    measurablePercent,
    message,
  });

  return <AsyncOperationProgress progress={progress} title={title} />;
}
