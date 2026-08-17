"use client";

import type { OperationProgressState } from "./performanceTypes";

export function AsyncOperationProgress({
  progress,
  title = "Processing",
}: {
  progress: OperationProgressState;
  title?: string;
}) {
  const value = progress.percent ?? undefined;

  return (
    <section
      aria-labelledby="opsiqo-operation-progress-title"
      aria-live="polite"
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3
            id="opsiqo-operation-progress-title"
            className="font-medium"
          >
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{progress.message}</p>
        </div>
        {typeof progress.percent === "number" ? (
          <strong aria-label={`${progress.percent} percent complete`}>
            {progress.percent}%
          </strong>
        ) : (
          <span className="text-sm text-muted-foreground">In progress</span>
        )}
      </div>

      <progress
        className="h-2 w-full"
        max={100}
        value={value}
        aria-label={
          typeof progress.percent === "number"
            ? `${progress.percent} percent complete`
            : "Operation in progress"
        }
      />

      <ol className="grid gap-2">
        {progress.stages.map(stage => (
          <li
            key={stage.id}
            className="flex items-center gap-2 text-sm"
            aria-current={stage.status === "active" ? "step" : undefined}
          >
            <span aria-hidden="true">
              {stage.status === "complete"
                ? "✓"
                : stage.status === "active"
                  ? "●"
                  : stage.status === "failed"
                    ? "!"
                    : "○"}
            </span>
            <span>{stage.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
