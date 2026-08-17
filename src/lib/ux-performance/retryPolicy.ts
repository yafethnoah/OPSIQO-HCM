export type RetryDecision =
  | { action: "retry"; delayMs: number; reason: string }
  | { action: "reconcile"; delayMs: 0; reason: string }
  | { action: "stop"; delayMs: 0; reason: string };

export function decideRetry(input: {
  attempt: number;
  maxAttempts: number;
  idempotentRead: boolean;
  writeStarted: boolean;
  executionState:
    | "not_started"
    | "preparing"
    | "executing"
    | "executed"
    | "unknown"
    | "failed_before_write";
  retryAfterMs?: number;
}): RetryDecision {
  if (input.executionState === "executed") {
    return {
      action: "stop",
      delayMs: 0,
      reason: "Operation already executed.",
    };
  }

  if (input.writeStarted || input.executionState === "executing" || input.executionState === "unknown") {
    return {
      action: "reconcile",
      delayMs: 0,
      reason: "Write state may be uncertain; reconcile before any retry.",
    };
  }

  if (input.attempt >= input.maxAttempts) {
    return {
      action: "stop",
      delayMs: 0,
      reason: "Maximum retry attempts reached.",
    };
  }

  if (!input.idempotentRead && input.executionState !== "failed_before_write") {
    return {
      action: "stop",
      delayMs: 0,
      reason: "Automatic retry is not allowed for a non-idempotent operation.",
    };
  }

  const exponential = Math.min(8000, 500 * Math.pow(2, Math.max(0, input.attempt)));
  const delayMs =
    typeof input.retryAfterMs === "number" && input.retryAfterMs >= 0
      ? Math.min(30000, input.retryAfterMs)
      : exponential;

  return {
    action: "retry",
    delayMs,
    reason: "Safe bounded retry.",
  };
}
