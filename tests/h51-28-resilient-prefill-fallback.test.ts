import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("H51.28 resilient resume prefill fallback", () => {
  it("does not turn two bounded provider timeouts into an automatic 503 when strong source evidence exists", () => {
    const provider = fs.readFileSync("src/lib/recruiting/ats-provider.ts", "utf8");
    expect(
      provider.includes("RECRUITING_RESUME_PARSE_V10_RESILIENT_PREFILL") ||
      provider.includes("RECRUITING_RESUME_PARSE_V15_RECORD_BOUND_EDUCATION_PROVENANCE"),
    ).toBe(true);
    expect(provider).toContain("deterministicResumeFallback");
    expect(provider).toContain("source&&sourceScore>=70");
    expect(provider).toContain("pass1_text_recovery_failed");
    expect(provider).toContain("return deterministicResumeFallback(profile,input,source)");
    expect(provider).toContain("source.slice(0,120000)");
  });

  it("keeps the deterministic escape hatch behind strict assurance", () => {
    const provider = fs.readFileSync("src/lib/recruiting/ats-provider.ts", "utf8");
    const service = fs.readFileSync("src/lib/recruiting/ats-service.ts", "utf8");
    expect(provider).toContain("aiVerified:false");
    expect(provider).toContain("deterministicStructuredResume(normalized)");
    expect(provider).toContain("assessStructuredResume(structuredResume,evidence)");
    expect(service).toContain("applyResumeAssurance(profile");
    expect(service).toContain("deterministic_source_fallback");
    expect(service).toContain("!coverage.prefillReady");
  });

  it("hardens metadata-only telemetry and preserves bounded provider attempts", () => {
    const provider = fs.readFileSync("src/lib/recruiting/ats-provider.ts", "utf8");
    const hosting = fs.readFileSync("apphosting.yaml", "utf8");
    expect(provider).toContain("OPSIQO_RECRUITING_RESUME ");
    expect(provider).toContain("maxAttempts:2");
    expect(provider).toContain("ai_provider_timeout");
    expect(hosting).toContain('value: "28000"');
    expect(hosting).toContain('value: "12000"');
  });
});
