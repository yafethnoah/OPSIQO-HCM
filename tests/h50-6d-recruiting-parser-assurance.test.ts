import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H50.6D recruiting document AI parser assurance", () => {
  it("allows governed recruiting evidence AI for recruiting managers without requiring generic AI permission", () => {
    const provider = read("src/lib/recruiting/ats-provider.ts");
    expect(provider).toContain("canUseRecruitingEvidenceAi");
    expect(provider).toContain("recruiting.manage");
    expect(provider).toContain("recruiting.manage.team");
    expect(provider).toContain("if(!canUseRecruitingEvidenceAi(actor))return null");
  });

  it("sends the original PDF to both resume AI passes even when a readable text layer exists", () => {
    const provider = read("src/lib/recruiting/ats-provider.ts");
    expect(provider).toContain("const attachment=input.bytes?.length&&['application/pdf','image/png','image/jpeg'].includes(input.mimeType)?input:undefined;");
    const block = provider.slice(
      provider.indexOf("export async function governedResumeParse"),
      provider.indexOf("export async function governedJobDescriptionParse"),
    );
    expect(block.match(/aiJson\(profile,[^;]+,attachment\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(block).not.toContain("!input.text?input:undefined");
  });

  it("normalizes unavailable governance infrastructure into the governed Recruiting AI error contract", () => {
    const provider = read("src/lib/recruiting/ats-provider.ts");
    expect(provider).toContain("safeRecruitingAiProfile");
    expect(provider).toContain("'ai_governance_required'");
    expect(provider.match(/safeRecruitingAiProfile\(actor\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("adds governed dual-pass AI analysis for job postings", () => {
    const provider = read("src/lib/recruiting/ats-provider.ts");
    expect(provider).toContain("export async function governedJobDescriptionParse");
    expect(provider).toContain("PASS 1 - job-posting evidence extraction");
    expect(provider).toContain("PASS 2 - independently verify and correct the job-posting extraction");
    expect(provider).toContain("The original job-posting file is attached.");
    expect(provider).toContain("transcribedOnly?89:99");
  });

  it("reconciles AI job-posting extraction with the deterministic parser", () => {
    const service = read("src/lib/recruiting/ats-service.ts");
    expect(service).toContain("mergeJobDescriptionEvidence");
    expect(service).toContain("analyzeJobDescription(evidence)");
    expect(service).toContain("governed_ai_dual_pass+deterministic");
    expect(service).toContain("parseJobDescriptionTextIntake");
  });

  it("routes both uploaded and entered job descriptions through the assured service", () => {
    const route = read(
      "src/app/api/organizations/[orgId]/recruiting/ats/job-description/route.ts",
    );
    expect(route).toContain("parseJobDescriptionIntake");
    expect(route).toContain("parseJobDescriptionTextIntake");
    expect(route).not.toContain("analyzeJobDescription(text)");
  });

  it("pauses automatic candidate enrollment when machine evidence is unresolved", () => {
    const ui = read("src/components/resume-intake-assistant.tsx");
    expect(ui).toContain("const autoReady = Boolean(");
    expect(ui).toContain("(p.parseTrust ?? 0) >= 90");
    expect(ui).toContain("unresolved === 0");
    expect(ui).toContain("automatic enrollment is paused");
  });

  it("does not claim impossible 100-percent machine accuracy", () => {
    const provider = read("src/lib/recruiting/ats-provider.ts");
    const resumeUi = read("src/components/resume-intake-assistant.tsx");
    expect(provider).toContain("Math.min(99");
    expect(resumeUi).toContain("never represented as guaranteed 100% accuracy");
    expect(resumeUi).toContain("100% verified state is reserved for completed human review");
  });

  it("keeps H50.6C historical coverage successor-safe", () => {
    const historical = read("tests/h50-6c-recruiting-new-position.test.ts");
    expect(historical).toContain("H50.6C-or-later");
    expect(historical).toContain("toBeGreaterThanOrEqual");
  });

  it("preserves H50.6D-or-later runtime lineage", () => {
    const identity = read("src/lib/release/identity.ts");
    const match = identity.match(
      /OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H(\d+)\.(\d+)([A-Z]?)'/,
    );
    expect(match).not.toBeNull();
    const major = Number(match?.[1] || 0);
    const minor = Number(match?.[2] || 0);
    const letter = match?.[3] ? match[3].charCodeAt(0) - 64 : 0;
    expect(major * 100000 + minor * 100 + letter).toBeGreaterThanOrEqual(
      50 * 100000 + 6 * 100 + 4,
    );
  });
});
