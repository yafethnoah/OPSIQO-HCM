import { describe, expect, it } from "vitest";
import {
  evaluateCoreWebVital,
  CORE_WEB_VITAL_TARGETS,
} from "../../src/lib/ux-performance/performanceBudget";

describe("Core Web Vitals budget", () => {
  it("uses current good thresholds", () => {
    expect(CORE_WEB_VITAL_TARGETS.LCP.goodMax).toBe(2500);
    expect(CORE_WEB_VITAL_TARGETS.INP.goodMax).toBe(200);
    expect(CORE_WEB_VITAL_TARGETS.CLS.goodMax).toBe(0.1);
  });

  it("passes values at the target", () => {
    expect(evaluateCoreWebVital("LCP", 2500).pass).toBe(true);
    expect(evaluateCoreWebVital("INP", 200).pass).toBe(true);
    expect(evaluateCoreWebVital("CLS", 0.1).pass).toBe(true);
  });

  it("fails values beyond the target", () => {
    expect(evaluateCoreWebVital("LCP", 2501).pass).toBe(false);
  });
});
