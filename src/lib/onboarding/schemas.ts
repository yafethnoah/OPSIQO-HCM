import { z } from 'zod';
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const employmentType = z.enum(['permanent','temporary','contractor','intern','volunteer']);
const LOW_INFORMATION_NARRATIVE = /^(completed|complete|done|ok|okay|verified|verify|same|approved|approve|yes|no|n\/?a|na)$/i;
const meaningfulNarrative = (max=1500) => z.string().trim().min(20).max(max).refine(
  (value) => value.split(/\s+/).filter(Boolean).length >= 3 && !LOW_INFORMATION_NARRATIVE.test(value),
  { message:'Provide a substantive explanation, not a generic status word.' },
);
export const createPrehireSchema = z.object({
  offerId:z.string().min(1), employeeNumber:z.string().trim().min(1).max(40).optional(), workEmail:z.string().email(), employmentType,
  accessDays:z.number().int().min(3).max(60).default(30),
});
export const prehireProfileSchema = z.object({
  legalFirstName:z.string().min(1).max(100), legalLastName:z.string().min(1).max(100), preferredName:z.string().max(100).optional(),
  personalEmail:z.string().email(), phone:z.string().max(50).optional(), addressLine1:z.string().max(200).optional(), addressLine2:z.string().max(200).optional(),
  city:z.string().max(100).optional(), provinceState:z.string().max(100).optional(), postalCode:z.string().max(30).optional(), country:z.string().max(100).optional(),
  emergencyContactName:z.string().min(1).max(160), emergencyContactRelationship:z.string().min(1).max(100), emergencyContactPhone:z.string().min(1).max(50),
});
export const staffTaskActionSchema = z.object({
  action:z.enum(['start','complete','waive','reopen','reconcile_complete']),
  note:z.string().trim().max(1500).optional(),
}).superRefine((value,ctx)=>{
  if(value.action==='waive' && (!value.note || value.note.trim().length < 3)){
    ctx.addIssue({code:'custom',message:'A meaningful reason is required for waiver.'});
  }
  if(value.action==='reconcile_complete'){
    const parsed=meaningfulNarrative().safeParse(value.note);
    if(!parsed.success)ctx.addIssue({code:'custom',message:'Post-activation reconciliation requires a substantive explanation of at least 20 characters.'});
  }
});
export const candidateTaskActionSchema = z.object({ action:z.enum(['complete','acknowledge']), confirmation:z.boolean().default(false) }).refine(v=>v.confirmation,{message:'Explicit confirmation is required.'});
export const caseActionSchema = z.object({
  action:z.enum(['rotate_access','revoke_access','cancel','activate','update_details','preview_legacy_reconciliation','apply_legacy_reconciliation']),
  reason:z.string().trim().max(1000).optional(),
  workEmail:z.string().email().optional(),
  employmentType:employmentType.optional(),
  previewId:z.string().trim().min(1).max(120).optional(),
  confirm:z.boolean().optional(),
}).superRefine((value,ctx)=>{
  if(value.action==='update_details'&&!value.workEmail&&!value.employmentType){
    ctx.addIssue({code:'custom',message:'Provide at least one pre-activation detail to update.'});
  }
  if(value.action==='update_details'&&(!value.reason||value.reason.trim().length<3)){
    ctx.addIssue({code:'custom',message:'A change reason is required for pre-activation edits.'});
  }
  if(value.action==='apply_legacy_reconciliation'){
    if(!value.previewId)ctx.addIssue({code:'custom',message:'A server-generated reconciliation preview is required.'});
    if(value.confirm!==true)ctx.addIssue({code:'custom',message:'Explicit confirmation is required before applying legacy reconciliation.'});
    const parsed=meaningfulNarrative(1000).safeParse(value.reason);
    if(!parsed.success)ctx.addIssue({code:'custom',message:'Provide a substantive reconciliation reason of at least 20 characters.'});
  }
});
export const prehireDocumentActionSchema = z.object({
  action:z.enum(['set_scan_clean','set_scan_blocked','verify_requirement','reject_requirement']),
  scanEvidenceRef:z.string().trim().max(1000).optional(),
  verificationNote:z.string().trim().max(1500).optional(),
  reuseReason:z.string().trim().max(1500).optional(),
}).superRefine((value,ctx)=>{
  if(['verify_requirement','reject_requirement'].includes(value.action)){
    const parsed=meaningfulNarrative().safeParse(value.verificationNote);
    if(!parsed.success)ctx.addIssue({code:'custom',message:'Describe what HR reviewed and why the evidence satisfies or fails the requirement.'});
  }
  if(value.reuseReason){
    const parsed=meaningfulNarrative().safeParse(value.reuseReason);
    if(!parsed.success)ctx.addIssue({code:'custom',message:'Evidence reuse requires a substantive justification.'});
  }
});
export const policyCreateSchema = z.object({ title:z.string().min(2).max(180), version:z.string().min(1).max(40), content:z.string().min(20).max(50000), onboardingRequired:z.boolean().default(true), effectiveDate:isoDate });
