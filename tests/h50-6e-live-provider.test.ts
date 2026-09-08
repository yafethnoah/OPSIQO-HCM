import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H50.6E Recruiting AI live provider verification", () => {
  it("adds a live provider + PDF document probe", () => {
    const provider = read("src/lib/recruiting/ats-provider.ts");
    expect(provider).toContain("probeRecruitingAiProvider");
    expect(provider).toContain("RECRUITING_DOCUMENT_PROBE_PDF_B64");
    expect(provider).toContain("application/pdf");
    expect(provider).toContain("ai_document_probe_failed");
  });

  it("classifies provider failures without exposing credentials or response bodies", () => {
    const provider = read("src/lib/recruiting/ats-provider.ts");
    for (const code of [
      "ai_credential_invalid",
      "ai_model_unavailable",
      "ai_rate_limited",
      "ai_provider_unavailable",
      "ai_provider_error",
    ]) expect(provider).toContain(code);
    expect(provider).toContain("recruitingProviderFetch");
    expect(provider).not.toContain("console.log(key)");
    expect(provider).not.toContain("console.error(key)");
  });

  it("retries transient provider failures once", () => {
    const provider = read("src/lib/recruiting/ats-provider.ts");
    expect(provider).toContain("response.status===429||response.status>=500");
    expect(provider).toContain("setTimeout(resolve,750)");
  });

  it("uses three-way precedence: provider failure, unsafe PDF, then setup guidance", () => {
    const service = read("src/lib/recruiting/ats-service.ts");
    const block = service.slice(
      service.indexOf("} catch (e) {", service.indexOf("export async function parseResumeFile")),
      service.indexOf("if (ai?.profile?.sourceText)", service.indexOf("export async function parseResumeFile")),
    );
    const provider = block.indexOf('"ai_credential_invalid"');
    const unsafe = block.indexOf('pdfLayerState === "unsafe"');
    const setup = block.indexOf('code === "ai_governance_required"');

    expect(provider).toBeGreaterThanOrEqual(0);
    expect(unsafe).toBeGreaterThanOrEqual(0);
    expect(setup).toBeGreaterThanOrEqual(0);
    expect(provider).toBeLessThan(unsafe);
    expect(unsafe).toBeLessThan(setup);
  });

  it("makes governance UI distinguish configuration from live provider readiness", () => {
    const ui = read("src/components/recruiting-ai-governance-setup.tsx");
    expect(ui).toContain("Configured · live test required");
    expect(ui).toContain("Test live Recruiting AI document parser");
    expect(ui).toContain("Live verified");
    expect(ui).toContain("PDF document input verified");
  });

  it("protects the provider probe with recruiting management permission", () => {
    const route = read(
      "src/app/api/organizations/[orgId]/recruiting/ats/provider-probe/route.ts",
    );
    expect(route).toContain('requirePermission(actor, "recruiting.manage")');
    expect(route).toContain("probeRecruitingAiProvider(actor)");
  });

  it("shows safe live-provider errors on candidate resume intake", () => {
    const ui = read("src/components/resume-intake-assistant.tsx");
    expect(ui).toContain("liveProviderCodes");
    expect(ui).toContain("Recruiting AI live document request failed");
    expect(ui).toContain("run the live document test");
  });

  it("labels static readiness as configuration-only", () => {
    const readiness = read("src/lib/recruiting/ai-readiness.ts");
    expect(readiness).toContain("configuration readiness only");
    expect(readiness).toContain("live Recruiting AI document test");
  });

  it("keeps H50.6D historical coverage successor-safe", () => {
    const historical = read("tests/h50-6d-recruiting-parser-assurance.test.ts");
    expect(historical).toContain("H50.6D-or-later");
    expect(historical).toContain("toBeGreaterThanOrEqual");
  });

  it("publishes H50.6E or a later lettered successor runtime identity", () => {
    const identity = read("src/lib/release/identity.ts");
    const match = identity.match(
      /OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H50\.6([A-Z])'/,
    );
    expect(match).not.toBeNull();
    expect(match![1]!.charCodeAt(0)).toBeGreaterThanOrEqual(
      "E".charCodeAt(0),
    );
  });
});
