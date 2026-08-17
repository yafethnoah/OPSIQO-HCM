import { describe, expect, it } from "vitest";
import { decideRetry } from "../../src/lib/ux-performance/retryPolicy";

describe("safe retry UX", () => {
  it("reconciles uncertain writes rather than retrying", () => {
    expect(
      decideRetry({
        attempt: 1,
        maxAttempts: 3,
        idempotentRead: false,
        writeStarted: true,
        executionState: "unknown",
      }).action
    ).toBe("reconcile");
  });

  it("retries safe reads with bounded delay", () => {
    const result = decideRetry({
      attempt: 1,
      maxAttempts: 3,
      idempotentRead: true,
      writeStarted: false,
      executionState: "not_started",
    });
    expect(result.action).toBe("retry");
    expect(result.delayMs).toBeGreaterThan(0);
    expect(result.delayMs).toBeLessThanOrEqual(30000);
  });

  it("stops after execution", () => {
    expect(
      decideRetry({
        attempt: 0,
        maxAttempts: 3,
        idempotentRead: false,
        writeStarted: true,
        executionState: "executed",
      }).action
    ).toBe("stop");
  });
});
