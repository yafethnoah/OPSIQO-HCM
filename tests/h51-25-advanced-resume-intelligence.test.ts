import { describe, expect, it } from "vitest";
import {
  chooseBestResumeEvidence,
  scoreResumeEvidence,
} from "@/lib/recruiting/resume-document-intelligence";

describe("H51.25 advanced resume evidence selection", () => {
  const structured = `
Shadi Alktaifan
shadi@example.com | +1 416 555 0100 | linkedin.com/in/shadi
PROFESSIONAL SUMMARY
Senior human resources leader with workforce and organizational development experience.

PROFESSIONAL EXPERIENCE
Director, People & Operations
Example Organization | 2021 - 2026
- Led workforce planning and HR operations.
- Built performance and learning programs.

HR Manager
Another Organization | 2017 - 2021
- Managed recruitment, employee relations and policy implementation.

EDUCATION
Master of Health Administration | Example University | 2017

CORE COMPETENCIES
Human Resources Strategy
Talent Acquisition
Employee Relations
Performance Management
Learning and Development

CERTIFICATIONS
Certified Human Resources Executive

LANGUAGES
English
Arabic
`.trim();

  it("scores structured resume evidence above weak scrambled text", () => {
    const weak =
      "Experience Education Skills 2021 2026 Manager Example " +
      "x ".repeat(12);
    expect(scoreResumeEvidence(structured)).toBeGreaterThan(
      scoreResumeEvidence(weak),
    );
  });

  it("keeps high-quality native PDF evidence authoritative when cloud evidence is equivalent", () => {
    const best = chooseBestResumeEvidence([
      { source: "native", text: structured },
      { source: "document_ai_layout", text: structured },
    ]);
    expect(best?.source).toBe("native");
  });

  it("uses cloud recovery when native evidence is materially weaker", () => {
    const weak =
      "EXPERIENCE 2021 2026 Manager Example " +
      "fragment ".repeat(10);
    const best = chooseBestResumeEvidence([
      { source: "native", text: weak },
      { source: "document_ai_layout", text: structured },
    ]);
    expect(best?.source).toBe("document_ai_layout");
  });

  it("retains clean native evidence when cloud evidence is absent", () => {
    const best = chooseBestResumeEvidence([
      { source: "native", text: structured },
    ]);
    expect(best?.source).toBe("native");
    expect(best?.score).toBeGreaterThan(50);
  });
});
