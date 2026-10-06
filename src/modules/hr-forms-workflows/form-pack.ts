export interface HRFormPackDefinition {
  id: string;
  name: string;
  category: string;
  templateIds: string[];
  workflowIds: string[];
  sequence: Array<{
    step: number;
    templateId: string;
    blocking: boolean;
    startWhen?: string;
  }>;
}

export const DEFAULT_PACK_BLUEPRINTS = {
  onboarding: [
    "Employee Information Form",
    "Emergency Contact Form",
    "Policy Acknowledgement",
    "Confidentiality Acknowledgement",
    "Equipment Assignment",
    "System Access Request",
    "Orientation Checklist",
    "Training Assignment",
    "Probation Setup"
  ],
  offboarding: [
    "Resignation/Departure Notice",
    "Departure Confirmation",
    "Handover Checklist",
    "Access Removal",
    "Company Property Return",
    "Final Payroll Information Checklist",
    "Confidentiality/IP Reminder",
    "Exit Interview",
    "Offboarding Completion"
  ],
  recruitment: [
    "Hiring Requisition",
    "Candidate Screening",
    "Candidate Interview Evaluation",
    "Reference Check",
    "Offer Approval",
    "Recruitment Closure Checklist"
  ]
} as const;
