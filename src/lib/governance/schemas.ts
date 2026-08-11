import { z } from 'zod';
const role=z.string().min(2).max(80);
const date=z.string().date();
export const governanceControlCreateSchema=z.object({
  code:z.string().min(2).max(80).regex(/^[A-Z0-9._-]+$/),
  title:z.string().min(3).max(180),
  category:z.enum(['statutory','policy','operational','privacy','ai','security','risk']),
  jurisdiction:z.string().min(2).max(120).default('Ontario, Canada'),
  controlObjective:z.string().min(5).max(2000),
  evidenceRequirement:z.string().min(5).max(2000),
  ownerRole:role.default('hr_partner'),
  accountableRole:role.default('hr_admin'),
  sourceTitle:z.string().min(3).max(300),
  sourceUrl:z.string().url().optional(),
  sourceReviewedAt:date,
  sourceReviewCadenceMonths:z.number().int().min(1).max(60).default(12),
  legalConclusionProhibited:z.boolean().default(true),
  linkedPolicyId:z.string().max(200).optional(),
  linkedDiagnosticControlId:z.string().max(200).optional(),
});
export const governanceControlActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('submit_review'),reviewNote:z.string().min(5).max(2000)}),
  z.object({action:z.literal('approve')}),
  z.object({action:z.literal('retire')}),
  z.object({action:z.literal('reopen')}),
  z.object({action:z.literal('source_review'),sourceTitle:z.string().min(3).max(300),sourceUrl:z.string().url().optional(),sourceReviewedAt:date,reviewNote:z.string().min(5).max(2000)}),
]);
export const governanceAttestationCreateSchema=z.object({controlId:z.string().min(1),periodLabel:z.string().min(2).max(100),assignedRole:role.default('hr_partner'),dueDate:date,statement:z.string().min(10).max(2000)});
export const governanceAttestationActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('submit'),response:z.enum(['confirmed','exception_reported','not_confirmed']),responseNote:z.string().min(5).max(3000),evidenceRefs:z.array(z.string().min(1).max(300)).max(20).default([])}),
  z.object({action:z.literal('approve')}),
  z.object({action:z.literal('reopen')}),
  z.object({action:z.literal('cancel')}),
]);
export const governanceExceptionCreateSchema=z.object({controlId:z.string().min(1),title:z.string().min(3).max(180),rationale:z.string().min(10).max(3000),riskLevel:z.enum(['low','medium','high','critical']),mitigation:z.string().min(10).max(3000),ownerRole:role.default('hr_partner'),startDate:date,expiryDate:date}).superRefine((v:any,ctx:any)=>{if(v.expiryDate<v.startDate)ctx.addIssue({code:'custom',message:'Expiry date cannot precede start date.',path:['expiryDate']});});
export const governanceExceptionActionSchema=z.object({action:z.enum(['submit_review','approve','close','cancel','reopen'])});
export const governanceRiskCreateSchema=z.object({code:z.string().min(2).max(80).regex(/^[A-Z0-9._-]+$/),title:z.string().min(3).max(180),description:z.string().min(10).max(3000),sourceType:z.enum(['governance_control','diagnostic_finding','exception','manual']),sourceId:z.string().max(200).optional(),ownerRole:role.default('hr_admin'),likelihood:z.number().int().min(1).max(5),impact:z.number().int().min(1).max(5),treatmentPlan:z.string().min(10).max(3000),dueDate:date.optional()});
export const governanceRiskActionSchema=z.object({action:z.enum(['mitigate','accept','close','reopen']),reason:z.string().max(3000).optional()}).superRefine((v:any,ctx:any)=>{if(v.action==='accept'&&(!v.reason||v.reason.trim().length<10))ctx.addIssue({code:'custom',message:'Risk acceptance requires a documented reason.',path:['reason']});});
