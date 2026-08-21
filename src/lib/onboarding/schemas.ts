import { z } from 'zod';
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const employmentType = z.enum(['permanent','temporary','contractor','intern','volunteer']);
export const createPrehireSchema = z.object({
  offerId:z.string().min(1), employeeNumber:z.string().min(1).max(40), workEmail:z.string().email(), employmentType,
  accessDays:z.number().int().min(3).max(60).default(30),
});
export const prehireProfileSchema = z.object({
  legalFirstName:z.string().min(1).max(100), legalLastName:z.string().min(1).max(100), preferredName:z.string().max(100).optional(),
  personalEmail:z.string().email(), phone:z.string().max(50).optional(), addressLine1:z.string().max(200).optional(), addressLine2:z.string().max(200).optional(),
  city:z.string().max(100).optional(), provinceState:z.string().max(100).optional(), postalCode:z.string().max(30).optional(), country:z.string().max(100).optional(),
  emergencyContactName:z.string().min(1).max(160), emergencyContactRelationship:z.string().min(1).max(100), emergencyContactPhone:z.string().min(1).max(50),
});
export const staffTaskActionSchema = z.object({ action:z.enum(['start','complete','waive','reopen']), note:z.string().max(1500).optional() });
export const candidateTaskActionSchema = z.object({ action:z.enum(['complete','acknowledge']), confirmation:z.boolean().default(false) }).refine(v=>v.confirmation,{message:'Explicit confirmation is required.'});
export const caseActionSchema = z.object({ action:z.enum(['rotate_access','revoke_access','cancel','activate']), reason:z.string().max(1000).optional() });
export const prehireDocumentActionSchema = z.object({ action:z.enum(['set_scan_clean','set_scan_blocked']), scanEvidenceRef:z.string().trim().max(1000).optional() });
export const policyCreateSchema = z.object({ title:z.string().min(2).max(180), version:z.string().min(1).max(40), content:z.string().min(20).max(50000), onboardingRequired:z.boolean().default(true), effectiveDate:isoDate });
