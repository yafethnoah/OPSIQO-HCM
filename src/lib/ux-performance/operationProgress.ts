import type {
  OperationProgressState,
  OperationStage,
  OperationStageId,
} from "./performanceTypes";

const DEFAULT_STAGES: Array<{ id: OperationStageId; label: string }> = [
  { id: "preparing", label: "Preparing request" },
  { id: "validating", label: "Validating context" },
  { id: "interpreting", label: "Interpreting request" },
  { id: "planning", label: "Preparing governed plan" },
  { id: "awaiting_confirmation", label: "Waiting for confirmation" },
  { id: "executing", label: "Executing authorized action" },
  { id: "verifying", label: "Verifying result" },
  { id: "completed", label: "Complete" },
];

export function buildOperationProgress(input: {
  currentStageId: OperationStageId;
  measurablePercent?: number | null;
  stageLabels?: Partial<Record<OperationStageId, string>>;
  message?: string;
}): OperationProgressState {
  const currentIndex = DEFAULT_STAGES.findIndex(
    stage => stage.id === input.currentStageId
  );

  const stages: OperationStage[] = DEFAULT_STAGES.map((stage, index) => ({
    id: stage.id,
    label: input.stageLabels?.[stage.id] ?? stage.label,
    status:
      input.currentStageId === "failed"
        ? index < Math.max(currentIndex, 0) ? "complete" : "waiting"
        : index < currentIndex
          ? "complete"
          : index === currentIndex
            ? input.currentStageId === "completed" ? "complete" : "active"
            : "waiting",
  }));

  let percent: number | null = null;
  let indeterminate = true;

  if (
    typeof input.measurablePercent === "number" &&
    Number.isFinite(input.measurablePercent)
  ) {
    percent = Math.max(0, Math.min(100, Math.round(input.measurablePercent)));
    indeterminate = false;
  } else if (currentIndex >= 0 && input.currentStageId !== "awaiting_confirmation") {
    const completed = stages.filter(stage => stage.status === "complete").length;
    percent = Math.round((completed / stages.length) * 100);
    indeterminate = false;
  }

  if (
    input.currentStageId === "awaiting_confirmation" ||
    input.currentStageId === "reconciliation" ||
    input.currentStageId === "queued"
  ) {
    percent = null;
    indeterminate = true;
  }

  if (input.currentStageId === "completed") {
    percent = 100;
    indeterminate = false;
  }

  return {
    stages,
    percent,
    indeterminate,
    currentStageId: input.currentStageId,
    message:
      input.message ??
      (input.currentStageId === "awaiting_confirmation"
        ? "Review the prepared action before execution."
        : input.currentStageId === "reconciliation"
          ? "The result is being reconciled. Do not submit the action again."
          : input.currentStageId === "failed"
            ? "The operation did not complete."
            : "Processing"),
  };
}
