import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ActorContext } from "@/domain/security";
import { assessHumanReadableText } from "@/lib/data-import/pdf-text";
import { parseResumeIntake } from "@/lib/recruiting/ats-service";

const actor = {
  uid: "uat-recruiter",
  orgId: "uat-org",
  role: "hr_admin",
  permissions: ["recruiting.manage"],
} as ActorContext;

describe("H41 resume PDF safety", () => {
  it("recognizes normal resume text", () => {
    const text = "Professional Summary Experienced human resources manager with ten years of recruitment and employee relations experience. Skills include workforce planning, performance management, policy development, coaching, and organizational change. Education Bachelor of Business Administration. Email jane@example.com Phone 416 555 0101.";
    expect(assessHumanReadableText(text).readable).toBe(true);
  });

  it("rejects mojibake and binary-like PDF extraction", async () => {
    const corrupt = "%PDF-1.7\nstream\n(XD Ã¢ QÎnlëö À X dñiëQ»Ör¹<UtBCFæ3ÕÌJ) Tj\nendstream";
    const form = new FormData();
    form.set("file", new File([corrupt], "corrupt-resume.pdf", { type: "application/pdf" }));
    await expect(parseResumeIntake(actor, form)).rejects.toMatchObject({
      code: "resume_parser_unavailable",
    });
  });

  it("clears parsed candidate fields before and after a failed parse", () => {
    const ui = readFileSync("src/components/resume-intake-assistant.tsx", "utf8");
    expect(ui).toMatch(/clearParsedValues\(form\);[\s\S]{0,80}setBusy\(true\)/);
    expect(ui).toMatch(/catch \(e\) \{\s*clearParsedValues\(form\)/);
  });

  it("guides users when company setup blocks requisition creation", () => {
    const ui = readFileSync("src/components/recruiting-workspace.tsx", "utf8");
    expect(ui).toContain("Complete company setup before creating a requisition.");
    expect(ui).toContain('href="/organization"');
    expect(ui).toContain('href="/people"');
  });
});
