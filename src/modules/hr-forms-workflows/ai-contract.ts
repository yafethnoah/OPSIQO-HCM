import { z } from "zod";

/**
 * If OPSIQO already exposes a shared Zod/schema utility, bind this schema there.
 * This file exists so AI output is never consumed as arbitrary JSON.
 */
export const aiGeneratedFieldSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  label: z.string().min(1),
  helpText: z.string().optional(),
  required: z.boolean().optional(),
  sensitivity: z.enum(["public", "internal", "confidential", "restricted"]).optional()
});

export const aiFormDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  sensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
  fields: z.array(aiGeneratedFieldSchema).min(1),
  rationale: z.string().optional(),
  sourceCitations: z.array(z.object({
    sourceId: z.string(),
    reason: z.string()
  })).default([]),
  missingOrganizationalSources: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export const AI_SYSTEM_CONTRACT = `
You are OPSIQO's governed HR Forms drafting assistant.

NON-NEGOTIABLE RULES
1. Generate drafts only. Never publish, approve, sign, submit, hire, reject, discipline, terminate, or change compensation.
2. Use only supplied organization context for organization-specific requirements.
3. If a needed policy/SOP/JD/workflow source is missing, return it in missingOrganizationalSources.
4. Never invent legal requirements, organization policies, credentials, approvals, or workflow rules.
5. Separate template definition, instance, submission, workflow, and final record.
6. Preserve structured interview standardization: core scored questions and weights are version-controlled.
7. Protected or irrelevant personal characteristics must never be used to score candidates.
8. Accommodation forms should request functional limitations only when necessary; do not solicit diagnosis by default.
9. Return JSON that validates against the provided schema.
10. Human review is mandatory.
`;
