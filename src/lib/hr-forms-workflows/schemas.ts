import { z } from 'zod';

const fieldKind = z.enum([
  'text','textarea','rich_text','number','currency','percentage','date','datetime','time',
  'email','phone','url','address','employee_selector','candidate_selector','contractor_selector',
  'manager_selector','department_selector','position_selector','dropdown','multi_select','radio',
  'checkbox','yes_no','rating','scale_1_5','scale_1_10','slider','signature','initials',
  'attachment','image_upload','document_upload','acknowledgement','calculated','table',
  'repeating_rows','section','heading','instruction','divider','hidden'
]);

const conditionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  sourceFieldId: z.string().trim().min(1).max(160),
  operator: z.enum(['equals','not_equals','contains','greater_than','less_than','selected','not_selected','empty','not_empty']),
  value: z.any().optional(),
  action: z.enum(['show_field','hide_field','require_field','skip_section','assign_reviewer','create_task','start_workflow_branch']),
  targetId: z.string().trim().min(1).max(160),
});

const validationRuleSchema = z.object({
  kind: z.enum(['required','min','max','regex','email','url','custom']),
  value: z.union([z.string(), z.number()]).optional(),
  message: z.string().trim().min(1).max(300),
});

export const formFieldSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string().trim().min(1).max(160),
  kind: fieldKind,
  label: z.string().trim().min(1).max(240),
  helpText: z.string().trim().max(1200).optional(),
  placeholder: z.string().trim().max(500).optional(),
  required: z.boolean().optional(),
  defaultValue: z.any().optional(),
  validation: z.array(validationRuleSchema).max(20).optional(),
  conditions: z.array(conditionSchema).max(30).optional(),
  permissions: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  sensitivity: z.enum(['public','internal','confidential','restricted']).optional(),
  dataSource: z.object({
    kind: z.enum(['static','employee','candidate','contractor','manager','department','position']),
    options: z.array(z.object({ value:z.string().max(240), label:z.string().max(240) })).max(500).optional(),
  }).optional(),
  scoring: z.object({
    enabled: z.boolean(),
    min: z.number().optional(),
    max: z.number().optional(),
    weight: z.number().min(0).max(100).optional(),
    anchors: z.record(z.string(), z.string()).optional(),
  }).optional(),
  workflowMapping: z.object({
    outputKey: z.string().max(160).optional(),
    taskType: z.string().max(160).optional(),
    approvalRole: z.string().max(160).optional(),
  }).optional(),
  children: z.array(formFieldSchema).max(200).optional(),
}).strict());

export const formTemplateCreateSchema = z.object({
  formCode: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_.-]+$/),
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(2).max(120),
  subcategory: z.string().trim().max(120).optional(),
  sensitivity: z.enum(['public','internal','confidential','restricted']).default('internal'),
  workerTypes: z.array(z.enum(['employee','candidate','contractor','volunteer','manager','other'])).max(10).optional(),
  workflowId: z.string().trim().max(160).optional(),
  retentionPolicyId: z.string().trim().max(160).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  fields: z.array(formFieldSchema).max(300).default([]),
});

export const formTemplateSaveSchema = formTemplateCreateSchema.partial().extend({
  fields: z.array(formFieldSchema).max(300).optional(),
});

export const templateActionSchema = z.object({
  action: z.enum(['save','submit_review','approve','publish','new_version','retire']),
  patch: formTemplateSaveSchema.optional(),
});

export const formInstanceCreateSchema = z.object({
  templateId: z.string().trim().min(1).max(160),
  subject: z.object({
    workerType: z.enum(['employee','candidate','contractor','volunteer','manager','other']).optional(),
    workerId: z.string().trim().max(160).optional(),
    candidateId: z.string().trim().max(160).optional(),
    contractorId: z.string().trim().max(160).optional(),
    vacancyId: z.string().trim().max(160).optional(),
    positionId: z.string().trim().max(160).optional(),
  }).default({}),
  assignedToUid: z.string().trim().max(160).optional(),
  dueAt: z.string().datetime().optional(),
});

export const formSubmissionCreateSchema = z.object({
  answers: z.record(z.string(), z.any()),
});

export const sourceRefSchema = z.object({
  type: z.enum(['requisition','policy','workflow','position','document']),
  id: z.string().trim().min(1).max(180),
});

export const aiFormGenerateSchema = z.object({
  mode: z.enum(['generate_new','improve_existing','convert_document','from_job_description','from_policy_sop','from_workflow','form_pack']).default('generate_new'),
  prompt: z.string().trim().min(5).max(6000),
  category: z.string().trim().max(120).optional(),
  sourceRefs: z.array(sourceRefSchema).max(12).default([]),
});

export const interviewTemplateSchema = z.object({
  requisitionId: z.string().trim().min(1).max(180),
  stage: z.string().trim().min(1).max(120).default('structured'),
});
