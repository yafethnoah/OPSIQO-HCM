import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("H51.29 candidate review recovery", () => {
  it("lets the public parse endpoint return a reviewable source-backed draft instead of hard-stopping on prefillReady", () => {
    const service = fs.readFileSync("src/lib/recruiting/candidate-portal-service.ts", "utf8");
    expect(service).toContain(
      "parseResumeFile(a,file,{requireStructuredPrefill:false})",
    );
    expect(service).toContain("Resume is an editable source-grounded review draft.");
    expect(service).toContain("structuredCriticalIssues.length||structuredIssues.length||unresolvedFields.length");
  });

  it("keeps final submission fail-closed after candidate editing", () => {
    const service = fs.readFileSync("src/lib/recruiting/candidate-portal-service.ts", "utf8");
    const structure = fs.readFileSync("src/lib/recruiting/resume-structure.ts", "utf8");
    expect(service).toContain(
      "parseResumeFile(a,rf,{requireStructuredPrefill:false})",
    );
    expect(service).toContain(
      "candidateVerificationGate(verifiedStructuredResume,parsed.profile.sourceText)",
    );
    expect(service).toContain("resume_structural_review_required");
    expect(structure).toContain(
      "canFinalize: assessment.criticalIssues.length === 0",
    );
  });

  it("preserves strict machine assurance and explicit candidate verification", () => {
    const ats = fs.readFileSync("src/lib/recruiting/ats-service.ts", "utf8");
    const portal = fs.readFileSync("src/components/candidate-application-portal.tsx", "utf8");
    expect(ats).toContain("!coverage.prefillReady");
    expect(portal).toContain(
      "I reviewed every parsed resume section and corrected any inaccurate or missing information.",
    );
    expect(portal).toContain("Candidate review");
    expect(portal).toContain("Structured resume verification");
    expect(portal).not.toContain("100% candidate-verified");
    expect(portal).toContain("internal Fit % remains grounded in the original uploaded resume evidence");
  });
});
