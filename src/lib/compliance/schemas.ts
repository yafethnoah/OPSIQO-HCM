import { z } from 'zod';

export const documentMetadataSchema = z.object({
  workerId: z.string().min(1),
  title: z.string().min(2).max(160),
  category: z.enum(['employment','identity','payroll_tax','compensation','leave','performance','learning','health_safety','employee_relations','policy','other']),
  classification: z.enum(['internal','confidential','highly_confidential']).default('confidential'),
  visibility: z.enum(['hr_only','employee_and_hr','manager_employee_hr']).default('employee_and_hr'),
  issueDate: z.string().date().optional().or(z.literal('')),
  expiryDate: z.string().date().optional().or(z.literal('')),
  retentionRuleId: z.string().optional().or(z.literal('')),
});

export const documentActionSchema = z.object({
  action: z.enum(['set_scan_clean','set_scan_blocked','place_legal_hold','release_legal_hold','dispose']),
  reason: z.string().max(500).optional(),
});

export const policyCreateSchema = z.object({
  code: z.string().min(2).max(40).transform(v=>v.trim().toUpperCase()),
  title: z.string().min(3).max(180),
  content: z.string().min(20),
  versionLabel: z.string().min(1).max(30).default('1.0'),
  effectiveDate: z.string().date(),
  acknowledgementRequired: z.boolean().default(true),
  onboardingRequired: z.boolean().default(false),
  audience: z.enum(['all_employees','managers','hr','custom']).default('all_employees'),
  audienceOrgUnitIds: z.array(z.string()).default([]),
  audienceEmploymentTypes: z.array(z.string()).default([]),
  reviewFrequencyMonths: z.number().int().min(1).max(60).optional(),
});

export const policyVersionSchema = z.object({
  content: z.string().min(20),
  versionLabel: z.string().min(1).max(30),
  effectiveDate: z.string().date(),
});

export const policyActionSchema = z.object({ action: z.enum(['submit_review','approve','publish','archive']) });

export const acknowledgementSchema = z.object({ signerName: z.string().min(2).max(120), confirm: z.literal(true) });

export const retentionRuleSchema = z.object({
  name: z.string().min(3).max(120),
  category: z.enum(['employment','identity','payroll_tax','compensation','leave','performance','learning','health_safety','employee_relations','policy','other']),
  trigger: z.enum(['document_created','document_expiry','employment_end','manual']),
  retentionDays: z.number().int().min(0).max(36500),
  action: z.enum(['review','delete','anonymize']).default('review'),
  legalBasisNote: z.string().min(5).max(1000),
  enabled: z.boolean().default(true),
});

export const complianceRequirementSchema = z.object({
  name: z.string().min(3).max(140),
  requirementType: z.enum(['document','policy_ack','training']),
  required: z.boolean().default(true),
  documentCategory: z.enum(['employment','identity','payroll_tax','compensation','leave','performance','learning','health_safety','employee_relations','policy','other']).optional(),
  policyId: z.string().optional(),
  appliesTo: z.enum(['all_employees','managers','custom']).default('all_employees'),
  orgUnitIds: z.array(z.string()).default([]),
  employmentTypes: z.array(z.string()).default([]),
  expiryWarningDays: z.number().int().min(0).max(365).default(30),
}).superRefine((v,ctx)=>{
  if(v.requirementType==='document'&&!v.documentCategory) ctx.addIssue({code:'custom',message:'Document category is required.',path:['documentCategory']});
  if(v.requirementType==='policy_ack'&&!v.policyId) ctx.addIssue({code:'custom',message:'Policy is required.',path:['policyId']});
});
