import {
  HRAIFormGenerationRequest,
  HRAIFormGenerationResult,
  HRFormInstance,
  HRFormSubmission,
  HRFormTemplate,
  HRWorkflowDefinition
} from "./types";

/**
 * These ports are intentionally adapters, not implementations.
 * The installer must bind them to OPSIQO's existing authoritative services.
 * This prevents a second permission/audit/document/workflow architecture.
 */
export interface HRFormsRepositoryPort {
  getTemplate(orgId: string, templateId: string): Promise<HRFormTemplate | null>;
  listTemplates(orgId: string): Promise<HRFormTemplate[]>;
  createDraftTemplate(actorId: string, template: HRFormTemplate): Promise<HRFormTemplate>;
  createVersion(actorId: string, prior: HRFormTemplate, next: HRFormTemplate): Promise<HRFormTemplate>;
  publishTemplate(actorId: string, templateId: string): Promise<HRFormTemplate>;
  createInstance(actorId: string, instance: HRFormInstance): Promise<HRFormInstance>;
  submit(actorId: string, submission: HRFormSubmission): Promise<HRFormSubmission>;
}

export interface HRFormsPermissionPort {
  assert(actorId: string, orgId: string, permission: string): Promise<void>;
  canReadSensitive(actorId: string, orgId: string, sensitivity: string): Promise<boolean>;
}

export interface HRFormsAuditPort {
  record(event: {
    organizationId: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface HRFormsWorkflowPort {
  getDefinition(orgId: string, workflowId: string): Promise<HRWorkflowDefinition | null>;
  start(input: {
    organizationId: string;
    actorId: string;
    workflowId: string;
    submissionId: string;
    context: Record<string, unknown>;
  }): Promise<{ workflowRunId: string }>;
}

export interface HRFormsTaskPort {
  createTask(input: {
    organizationId: string;
    actorId: string;
    taskType: string;
    title: string;
    assigneeRole?: string;
    sourceId: string;
  }): Promise<{ taskId: string }>;
}

export interface HRFormsNotificationPort {
  notify(input: {
    organizationId: string;
    audienceRole?: string;
    userId?: string;
    title: string;
    message: string;
    resourceUrl?: string;
  }): Promise<void>;
}

export interface HRFormsDocumentPort {
  generatePdf(input: { organizationId: string; template: HRFormTemplate; submission: HRFormSubmission }): Promise<{ documentId: string }>;
  generateDocx?(input: { organizationId: string; template: HRFormTemplate; submission: HRFormSubmission }): Promise<{ documentId: string }>;
}

export interface HRFormsAIContextPort {
  resolveSources(request: HRAIFormGenerationRequest): Promise<{
    sources: Array<{ id: string; type: string; title: string; text: string; version?: string }>;
    missingSources: string[];
  }>;
  generateGovernedFormDraft(
    request: HRAIFormGenerationRequest,
    context: { sources: Array<{ id: string; type: string; title: string; text: string; version?: string }>; missingSources: string[] }
  ): Promise<HRAIFormGenerationResult>;
}
