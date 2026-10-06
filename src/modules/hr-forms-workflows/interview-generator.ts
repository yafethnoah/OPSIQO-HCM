import { HRFormField, HRFormTemplate } from "./types";

export interface InterviewCriterion {
  id: string;
  competency: string;
  question: string;
  whyAsked: string;
  expectedEvidence: string;
  weight?: number;
  anchors: { "1": string; "3": string; "5": string };
}

export function buildInterviewTemplate(input: {
  organizationId: string;
  actorUserId: string;
  vacancyId: string;
  positionTitle: string;
  stage: string;
  criteria: InterviewCriterion[];
}): HRFormTemplate {
  const now = new Date().toISOString();
  const fields: HRFormField[] = [
    { id: "candidateId", kind: "candidate_selector", label: "Candidate", required: true },
    { id: "vacancyId", kind: "hidden", label: "Vacancy ID", defaultValue: input.vacancyId },
    { id: "interviewDate", kind: "date", label: "Interview date", required: true },
    { id: "interviewerId", kind: "employee_selector", label: "Interviewer", required: true },
    { id: "stage", kind: "hidden", label: "Interview stage", defaultValue: input.stage },
    {
      id: "structuredQuestions",
      kind: "section",
      label: "Structured Interview Questions",
      children: input.criteria.flatMap((c) => [
        {
          id: `${c.id}.question`,
          kind: "instruction",
          label: c.question,
          helpText: `${c.competency} — ${c.whyAsked}\nExpected evidence: ${c.expectedEvidence}`
        },
        {
          id: `${c.id}.score`,
          kind: "scale_1_5",
          label: `${c.competency} score`,
          required: true,
          scoring: {
            enabled: true,
            min: 1,
            max: 5,
            weight: c.weight,
            anchors: c.anchors
          }
        },
        {
          id: `${c.id}.evidence`,
          kind: "textarea",
          label: "Supporting evidence",
          required: true,
          helpText: "Document job-related evidence supporting the score."
        }
      ])
    }
  ];

  return {
    id: "",
    organizationId: input.organizationId,
    formCode: `INT-${input.vacancyId}-${input.stage}`.toUpperCase(),
    title: `${input.positionTitle} — ${input.stage} Interview Evaluation`,
    description: "Version-controlled structured interview evaluation.",
    category: "Recruitment",
    subcategory: "Candidate Interview Evaluation",
    status: "draft",
    version: "1.0",
    workerTypes: ["candidate", "manager"],
    sensitivity: "confidential",
    aiGenerated: true,
    tags: ["structured-interview", "candidate-evaluation", input.vacancyId],
    fields,
    createdBy: input.actorUserId,
    createdAt: now,
    updatedBy: input.actorUserId,
    updatedAt: now
  };
}
