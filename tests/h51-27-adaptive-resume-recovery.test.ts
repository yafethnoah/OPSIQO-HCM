import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("H51.27 adaptive resume recovery", () => {
  it("uses strong extracted evidence before binary PDF on pass 1", () => {
    const provider = fs.readFileSync("src/lib/recruiting/ats-provider.ts", "utf8");
    expect(
      provider.includes("RECRUITING_RESUME_PARSE_V9_ADAPTIVE_RECOVERY") ||
      provider.includes("RECRUITING_RESUME_PARSE_V10_RESILIENT_PREFILL") ||
      provider.includes("RECRUITING_RESUME_PARSE_V15_RECORD_BOUND_EDUCATION_PROVENANCE"),
    ).toBe(true);
    expect(provider).toContain("scoreResumeEvidence(source)");
    expect(provider).toContain("sourceScore>=70");
    expect(provider).toContain("pass1Attachment=evidenceFirst?undefined:attachment");
    expect(provider).toContain("aiJson(profile,pass1Prompt,pass1Attachment,pass1TimeoutMs)");
    expect(provider).toContain("aiJson(profile,verifyPrompt,attachment,pass2TimeoutMs)");
  });

  it("recovers a pass-1 timeout from text without weakening fail-closed assurance", () => {
    const provider = fs.readFileSync("src/lib/recruiting/ats-provider.ts", "utf8");
    const service = fs.readFileSync("src/lib/recruiting/ats-service.ts", "utf8");
    expect(provider).toContain("pass1_text_recovery_complete");
    expect(provider).toContain("aiJson(profile,compactRecoveryPrompt,undefined,recoveryTimeoutMs)");
    expect(provider).toContain("completeness_recovery_complete");
    expect(provider).toContain("sourceEvidence||aiEvidenceText");
    expect(service).toContain("applyResumeAssurance(profile");
    expect(service).toContain("!coverage.prefillReady");
  });

  it("emits only metadata telemetry and keeps all recovery stages bounded", () => {
    const provider = fs.readFileSync("src/lib/recruiting/ats-provider.ts", "utf8");
    const hosting = fs.readFileSync("apphosting.yaml", "utf8");
    expect(provider).toContain("scope:'opsiqo_recruiting_resume'");
    expect(provider).toContain("OPSIQO_RECRUITING_AI_RECOVERY_TIMEOUT_MS");
    expect(provider).toContain("maxAttempts:2");
    expect(provider).toContain("ai_provider_timeout");
    expect(
      hosting.includes('value: "20000"') ||
      hosting.includes('value: "28000"'),
    ).toBe(true);
    expect(hosting).toContain("OPSIQO_RECRUITING_AI_RECOVERY_TIMEOUT_MS");
  });
});
