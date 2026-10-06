import { randomUUID } from "crypto";
import {
  HRAIFormGenerationRequest,
  HRAIFormGenerationResult,
  HRFormInstance,
  HRFormSubmission,
  HRFormTemplate
} from "./types";
import {
  HRFormsAIContextPort,
  HRFormsAuditPort,
  HRFormsDocumentPort,
  HRFormsPermissionPort,
  HRFormsRepositoryPort,
  HRFormsTaskPort,
  HRFormsWorkflowPort
} from "./adapters";
import { assertTemplatePublishable, validateSubmission } from "./validation";
import { collectWorkflowActions } from "./conditional-engine";
import { scoreSubmission } from "./scoring";

export class HRFormsWorkflowService {
  constructor(
    private repo: HRFormsRepositoryPort,
    private permissions: HRFormsPermissionPort,
    private audit: HRFormsAuditPort,
    private workflows: HRFormsWorkflowPort,
    private tasks: HRFormsTaskPort,
    private documents: HRFormsDocumentPort,
    private ai: HRFormsAIContextPort
  ) {}

  async createDraft(actorId: string, draft: HRFormTemplate): Promise<HRFormTemplate> {
    await this.permissions.assert(actorId, draft.organizationId, "hr_forms.template.create");
    const now = new Date().toISOString();
    const normalized: HRFormTemplate = {
      ...draft,
      id: draft.id || randomUUID(),
      status: "draft",
      createdBy: actorId,
      createdAt: draft.createdAt || now,
      updatedBy: actorId,
      updatedAt: now
    };
    const created = await this.repo.createDraftTemplate(actorId, normalized);
    await this.audit.record({
      organizationId: created.organizationId,
      actorId,
      action: "hr_forms.template.created",
      resourceType: "hr_form_template",
      resourceId: created.id
    });
    return created;
  }

  async publish(actorId: string, orgId: string, templateId: string): Promise<HRFormTemplate> {
    await this.permissions.assert(actorId, orgId, "hr_forms.template.publish");
    const template = await this.repo.getTemplate(orgId, templateId);
    if (!template) throw new Error("Form template not found.");
    const problems = assertTemplatePublishable(template);
    if (problems.length) throw new Error(`Form cannot be published: ${problems.join(" ")}`);
    const published = await this.repo.publishTemplate(actorId, templateId);
    await this.audit.record({
      organizationId: orgId,
      actorId,
      action: "hr_forms.template.published",
      resourceType: "hr_form_template",
      resourceId: templateId,
      metadata: { version: published.version }
    });
    return published;
  }

  async instantiate(
    actorId: string,
    orgId: string,
    templateId: string,
    subject: HRFormInstance["subject"]
  ): Promise<HRFormInstance> {
    await this.permissions.assert(actorId, orgId, "hr_forms.instance.create");
    const template = await this.repo.getTemplate(orgId, templateId);
    if (!template || template.status !== "published") throw new Error("Only published forms can be used.");
    const now = new Date().toISOString();
    const instance: HRFormInstance = {
      id: randomUUID(),
      organizationId: orgId,
      templateId: template.id,
      templateVersion: template.version,
      status: "open",
      subject,
      snapshot: structuredClone(template),
      createdBy: actorId,
      createdAt: now
    };
    const created = await this.repo.createInstance(actorId, instance);
    await this.audit.record({
      organizationId: orgId,
      actorId,
      action: "hr_forms.instance.created",
      resourceType: "hr_form_instance",
      resourceId: created.id,
      metadata: { templateId, templateVersion: template.version }
    });
    return created;
  }

  async submit(
    actorId: string,
    instance: HRFormInstance,
    answers: Record<string, unknown>
  ): Promise<HRFormSubmission> {
    await this.permissions.assert(actorId, instance.organizationId, "hr_forms.submit");
    if (instance.status !== "open") throw new Error("This form instance is no longer open.");

    const issues = validateSubmission(instance.snapshot, answers);
    if (issues.length) {
      const error = new Error("Submission validation failed.");
      (error as Error & { details?: unknown }).details = issues;
      throw error;
    }

    const score = scoreSubmission(instance.snapshot, answers);
    const submission: HRFormSubmission = {
      id: randomUUID(),
      organizationId: instance.organizationId,
      instanceId: instance.id,
      templateId: instance.templateId,
      templateVersion: instance.templateVersion,
      submittedBy: actorId,
      submittedAt: new Date().toISOString(),
      answers,
      score: {
        sections: score.sectionScores,
        weightedTotal: score.weightedTotal,
        missingRequiredCount: score.missingScoredResponses.length
      },
      status: "submitted"
    };

    const saved = await this.repo.submit(actorId, submission);

    for (const action of collectWorkflowActions(instance.snapshot.fields, answers)) {
      if (action.action === "create_task") {
        await this.tasks.createTask({
          organizationId: instance.organizationId,
          actorId,
          taskType: action.targetId,
          title: `Action from ${instance.snapshot.title}`,
          sourceId: saved.id
        });
      }
    }

    if (instance.snapshot.workflowId) {
      const def = await this.workflows.getDefinition(instance.organizationId, instance.snapshot.workflowId);
      if (!def || def.status !== "published") throw new Error("Linked workflow is unavailable.");
      const run = await this.workflows.start({
        organizationId: instance.organizationId,
        actorId,
        workflowId: def.id,
        submissionId: saved.id,
        context: { answers, subject: instance.subject, score: saved.score }
      });
      saved.workflowRunId = run.workflowRunId;
    }

    await this.audit.record({
      organizationId: instance.organizationId,
      actorId,
      action: "hr_forms.submission.created",
      resourceType: "hr_form_submission",
      resourceId: saved.id,
      metadata: { templateId: saved.templateId, templateVersion: saved.templateVersion }
    });

    return saved;
  }

  async generateWithAI(
    actorId: string,
    request: HRAIFormGenerationRequest
  ): Promise<HRAIFormGenerationResult> {
    await this.permissions.assert(actorId, request.organizationId, "hr_forms.ai.generate");
    const context = await this.ai.resolveSources(request);

    if (context.sources.length === 0 && context.missingSources.length > 0) {
      return {
        draft: {
          id: "",
          organizationId: request.organizationId,
          formCode: "",
          title: "Draft requires organizational source review",
          category: "Custom",
          status: "draft",
          version: "0.1",
          sensitivity: "internal",
          aiGenerated: true,
          fields: [],
          createdBy: actorId,
          createdAt: new Date().toISOString(),
          updatedBy: actorId,
          updatedAt: new Date().toISOString()
        },
        sourcesUsed: [],
        missingOrganizationalSources: context.missingSources,
        warnings: ["MISSING ORGANIZATIONAL SOURCE"],
        requiresHumanReview: true
      };
    }

    const result = await this.ai.generateGovernedFormDraft(request, context);
    result.draft.status = "draft";
    result.draft.aiGenerated = true;
    result.draft.organizationId = request.organizationId;
    result.draft.createdBy = actorId;
    result.draft.updatedBy = actorId;

    await this.audit.record({
      organizationId: request.organizationId,
      actorId,
      action: "hr_forms.ai.draft_generated",
      resourceType: "hr_form_template",
      resourceId: result.draft.id || "unpersisted",
      metadata: {
        mode: request.mode,
        sourceCount: result.sourcesUsed.length,
        missingSourceCount: result.missingOrganizationalSources.length
      }
    });

    return result;
  }
}
