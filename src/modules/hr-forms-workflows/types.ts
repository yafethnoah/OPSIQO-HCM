export type HRFormStatus =
  | "draft" | "under_review" | "approved" | "published" | "superseded" | "retired";

export type HRFormSensitivity = "public" | "internal" | "confidential" | "restricted";
export type HRWorkerType = "employee" | "candidate" | "contractor" | "volunteer" | "manager" | "other";

export type HRFieldKind =
  | "text" | "textarea" | "rich_text" | "number" | "currency" | "percentage"
  | "date" | "datetime" | "time" | "email" | "phone" | "url" | "address"
  | "employee_selector" | "candidate_selector" | "contractor_selector"
  | "manager_selector" | "department_selector" | "position_selector"
  | "dropdown" | "multi_select" | "radio" | "checkbox" | "yes_no"
  | "rating" | "scale_1_5" | "scale_1_10" | "slider"
  | "signature" | "initials" | "attachment" | "image_upload" | "document_upload"
  | "acknowledgement" | "calculated" | "table" | "repeating_rows"
  | "section" | "heading" | "instruction" | "divider" | "hidden";

export type HRConditionOperator =
  | "equals" | "not_equals" | "contains" | "greater_than" | "less_than"
  | "selected" | "not_selected" | "empty" | "not_empty";

export type HRConditionAction =
  | "show_field" | "hide_field" | "require_field" | "skip_section"
  | "assign_reviewer" | "create_task" | "start_workflow_branch";

export interface HRCondition {
  id: string;
  sourceFieldId: string;
  operator: HRConditionOperator;
  value?: unknown;
  action: HRConditionAction;
  targetId: string;
}

export interface HRValidationRule {
  kind: "required" | "min" | "max" | "regex" | "email" | "url" | "custom";
  value?: string | number;
  message: string;
}

export interface HRFormField {
  id: string;
  kind: HRFieldKind;
  label: string;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  validation?: HRValidationRule[];
  conditions?: HRCondition[];
  permissions?: string[];
  sensitivity?: HRFormSensitivity;
  dataSource?: {
    kind: "static" | "employee" | "candidate" | "contractor" | "manager" | "department" | "position";
    options?: Array<{ value: string; label: string }>;
  };
  scoring?: {
    enabled: boolean;
    min?: number;
    max?: number;
    weight?: number;
    anchors?: Record<string, string>;
  };
  workflowMapping?: {
    outputKey?: string;
    taskType?: string;
    approvalRole?: string;
  };
  children?: HRFormField[];
}

export interface HRFormTemplate {
  id: string;
  organizationId: string;
  formCode: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  status: HRFormStatus;
  version: string;
  jurisdiction?: { country?: string; provinceState?: string; region?: string };
  workerTypes?: HRWorkerType[];
  departmentIds?: string[];
  positionIds?: string[];
  ownerUserId?: string;
  ownerDepartmentId?: string;
  sensitivity: HRFormSensitivity;
  effectiveDate?: string;
  expiryDate?: string;
  reviewDate?: string;
  aiGenerated: boolean;
  aiGenerationMetadata?: Record<string, unknown>;
  workflowId?: string;
  retentionPolicyId?: string;
  sourceDocumentIds?: string[];
  tags?: string[];
  fields: HRFormField[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  supersedesTemplateId?: string;
}

export interface HRFormInstance {
  id: string;
  organizationId: string;
  templateId: string;
  templateVersion: string;
  status: "open" | "submitted" | "cancelled" | "expired";
  subject: {
    workerType?: HRWorkerType;
    workerId?: string;
    candidateId?: string;
    contractorId?: string;
    vacancyId?: string;
    positionId?: string;
  };
  snapshot: HRFormTemplate;
  createdBy: string;
  createdAt: string;
  dueAt?: string;
}

export interface HRFormSubmission {
  id: string;
  organizationId: string;
  instanceId: string;
  templateId: string;
  templateVersion: string;
  submittedBy: string;
  submittedAt: string;
  answers: Record<string, unknown>;
  score?: {
    sections: Record<string, number>;
    weightedTotal?: number;
    missingRequiredCount: number;
  };
  status: "submitted" | "under_review" | "approved" | "rejected" | "recorded";
  workflowRunId?: string;
  recordLinks?: Array<{ module: string; recordId: string }>;
}

export interface HRWorkflowDefinition {
  id: string;
  organizationId: string;
  name: string;
  version: string;
  status: "draft" | "approved" | "published" | "retired";
  steps: HRWorkflowStep[];
}

export type HRWorkflowStep =
  | { id: string; type: "approval"; name: string; role: string; required: boolean }
  | { id: string; type: "task"; name: string; taskType: string; assigneeRole?: string }
  | { id: string; type: "record"; name: string; targetModule: string }
  | { id: string; type: "notification"; name: string; audienceRole?: string }
  | { id: string; type: "branch"; name: string; condition: HRCondition; whenTrue: string; whenFalse?: string };

export interface HRAIFormGenerationRequest {
  organizationId: string;
  actorUserId: string;
  mode:
    | "generate_new" | "improve_existing" | "convert_document"
    | "from_job_description" | "from_policy_sop" | "from_workflow" | "form_pack";
  prompt: string;
  sourceIds?: string[];
  positionId?: string;
  vacancyId?: string;
  jurisdiction?: { country?: string; provinceState?: string };
}

export interface HRAISourceEvidence {
  sourceId: string;
  sourceType: string;
  title: string;
  version?: string;
  excerpt?: string;
  confidence?: number;
}

export interface HRAIFormGenerationResult {
  draft: HRFormTemplate;
  sourcesUsed: HRAISourceEvidence[];
  missingOrganizationalSources: string[];
  warnings: string[];
  requiresHumanReview: true;
}
