export type ReliabilityExecutionState =
  | "not_started"
  | "failed_before_write"
  | "write_may_have_started"
  | "executing"
  | "executed"
  | "unknown";

export class ReconciliationRequiredError extends Error {
  readonly code = "reconciliation_required";
  constructor(message = "The write outcome is uncertain. Reconcile before retrying.") {
    super(message);
    this.name = "ReconciliationRequiredError";
  }
}

export type ReliableRequestOptions = RequestInit & {
  maxReadAttempts?: number;
  executionState?: ReliabilityExecutionState;
  retryAfterMs?: number;
};

function isSafeRead(method: string) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Bounded connectivity helper.
 *
 * Safe reads can retry.
 * Writes are NEVER automatically replayed when the write may have started.
 */
export async function fetchWithReliability(
  input: RequestInfo | URL,
  options: ReliableRequestOptions = {},
): Promise<Response> {
  const { maxReadAttempts, executionState, retryAfterMs, ...requestInit } = options;
  const method = String(requestInit.method || "GET").toUpperCase();
  const read = isSafeRead(method);
  const maxAttempts = Math.max(1, Math.min(4, maxReadAttempts ?? 3));

  if (!read) {
    const state = executionState ?? "not_started";
    if (state === "write_may_have_started" || state === "executing" || state === "unknown") {
      throw new ReconciliationRequiredError();
    }
    try {
      return await fetch(input, requestInit);
    } catch (error) {
      throw new ReconciliationRequiredError(error instanceof Error ? `Write outcome is uncertain: ${error.message}` : undefined);
    }
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(input, requestInit);
      if (response.ok || response.status < 500 || attempt === maxAttempts - 1) return response;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts - 1) throw error;
    }
    const backoff = Math.min(5000, typeof retryAfterMs === "number" ? Math.max(0,retryAfterMs) : 350 * 2 ** attempt);
    await delay(backoff);
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed.");
}
