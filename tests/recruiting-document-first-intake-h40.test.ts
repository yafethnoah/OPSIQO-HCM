import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ActorContext } from "@/domain/security";
import {
  parseJobDescriptionIntake,
  parseResumeIntake,
} from "@/lib/recruiting/ats-service";

const actor = {
  uid: "uat-recruiter",
  orgId: "uat-org",
  role: "hr_admin",
  permissions: ["recruiting.manage"],
} as ActorContext;
const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("H40 document-first recruiting intake", () => {
  it("parses a resume without requiring a requisition first", async () => {
    const form = new FormData();
    form.set(
      "file",
      new File(
        [
          "Jane Candidate\njane@example.com\n+1 416 555 0101\nToronto, Ontario\nhttps://www.linkedin.com/in/jane-candidate\nProfessional Experience\nHR Manager with ten years of recruiting and employee relations experience.",
        ],
        "candidate.txt",
        { type: "text/plain" },
      ),
    );
    const parsed = await parseResumeIntake(actor, form);
    expect(parsed.profile.email).toBe("jane@example.com");
    expect(parsed.resumeText).toContain("HR Manager");
  });

  it("parses a JD file into supported requisition fields", async () => {
    const form = new FormData();
    form.set(
      "file",
      new File(
        [
          "Job Title: Digital Marketing Manager\nLocation: Brampton, Ontario\nEmployment type: Full-time\n\nResponsibilities\n- Develop and execute digital marketing campaigns.\n\nRequired Qualifications\n- Minimum 5 years of digital marketing experience required.\n- Google Analytics certification is required.\n- Ability to manage paid search and social campaigns.",
        ],
        "digital-marketing-jd.txt",
        { type: "text/plain" },
      ),
    );
    const parsed = await parseJobDescriptionIntake(actor, form);
    expect(parsed.title).toBe("Digital Marketing Manager");
    expect(parsed.location).toBe("Brampton, Ontario");
    expect(parsed.employmentType).toBe("permanent");
    expect(parsed.description).toContain("Required Qualifications");
    expect(parsed.requirements.length).toBeGreaterThan(0);
  });

  it("places resume and JD upload assistants before manual fields", () => {
    const workspace = read("src/components/recruiting-workspace.tsx");
    expect(workspace.indexOf("<JobDescriptionAssistant")).toBeLessThan(
      workspace.indexOf('<Field name="title"'),
    );
    expect(workspace.indexOf("<ResumeIntakeAssistant")).toBeLessThan(
      workspace.indexOf('<Field name="firstName"'),
    );
  });

  it("automatically parses selected documents and prefills location", () => {
    const resume = read("src/components/resume-intake-assistant.tsx");
    const jd = read("src/components/job-description-assistant.tsx");
    expect(resume).toMatch(/if \(selected\) void parse\(selected\)/);
    expect(resume).toMatch(/setNamedValue\(form, "location", p\.location\)/);
    expect(jd).toMatch(/if \(selected\) void parse\(selected\)/);
    expect(jd).toMatch(/setValue\(form, "description"/);
  });
});
