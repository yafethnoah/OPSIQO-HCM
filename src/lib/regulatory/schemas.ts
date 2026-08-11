import { z } from 'zod';
const date=z.string().date();
const role=z.string().min(2).max(80);
const ids=z.array(z.string().min(1).max(200)).max(100).default([]);
export const regulatorySourceCreateSchema=z.object({
  code:z.string().min(2).max(80).regex(/^[A-Z0-9._-]+$/),jurisdiction:z.string().min(2).max(140),authority:z.string().min(2).max(180),title:z.string().min(3).max(300),sourceUrl:z.string().url(),sourceType:z.enum(['legislation','regulation','regulator_guidance','government_guidance','standard','other']),ownerRole:role.default('hr_admin'),reviewCadenceDays:z.number().int().min(1).max(730).default(90),monitorCadenceDays:z.number().int().min(1).max(30).default(1),lastReviewedAt:date.optional(),linkedGovernanceControlIds:ids,
});
export const regulatorySourceActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('pause')}),z.object({action:z.literal('resume')}),z.object({action:z.literal('retire')}),
  z.object({action:z.literal('record_review'),reviewDate:date,reviewNote:z.string().min(10).max(3000)}),
  z.object({action:z.literal('accept_observed'),reviewDate:date,reviewNote:z.string().min(10).max(3000)}),
]);
export const regulatoryChangeCreateSchema=z.object({sourceId:z.string().min(1),title:z.string().min(3).max(260),changeType:z.enum(['source_content_changed','enacted','amended','guidance_changed','consultation','correction','other']),materiality:z.enum(['low','medium','high','critical']).default('medium'),summary:z.string().min(10).max(5000),effectiveDate:date.optional(),legalReviewRequired:z.boolean().default(true),affectedPolicyIds:ids,affectedControlIds:ids});
export const regulatoryChangeActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('triage'),materiality:z.enum(['low','medium','high','critical']),triageNote:z.string().min(10).max(4000),legalReviewRequired:z.boolean(),affectedPolicyIds:ids,affectedControlIds:ids}),
  z.object({action:z.literal('start_impact_assessment')}),z.object({action:z.literal('send_legal_review'),reason:z.string().min(10).max(3000),dueDate:date}),z.object({action:z.literal('plan_implementation')}),z.object({action:z.literal('mark_implemented')}),z.object({action:z.literal('no_action'),triageNote:z.string().min(10).max(4000)}),z.object({action:z.literal('close')}),z.object({action:z.literal('reopen')}),
]);
export const regulatoryObligationCreateSchema=z.object({code:z.string().min(2).max(100).regex(/^[A-Z0-9._-]+$/),sourceId:z.string().min(1),changeId:z.string().max(200).optional(),statement:z.string().min(15).max(5000),applicabilityNote:z.string().min(10).max(4000),effectiveDate:date.optional(),ownerRole:role.default('hr_partner'),legalReviewRequired:z.boolean().default(true),linkedPolicyIds:ids,linkedControlIds:ids});
export const regulatoryObligationActionSchema=z.object({action:z.enum(['submit_review','approve','retire','reopen'])});
export const policyImpactCreateSchema=z.object({changeId:z.string().min(1),policyId:z.string().min(1),impactLevel:z.enum(['none','minor','material','urgent']),rationale:z.string().min(10).max(5000),recommendedAction:z.enum(['revise_policy','update_control','training_or_communication','seek_legal_review','no_action']),ownerRole:role.default('hr_partner'),dueDate:date,legalReviewRequired:z.boolean().default(false)});
export const policyImpactActionSchema=z.object({action:z.enum(['submit_review','approve','mark_implemented','close','reopen'])});
export const reattestationCampaignCreateSchema=z.object({policyId:z.string().min(1),title:z.string().min(3).max(240),audience:z.enum(['all_employees','managers','hr','custom']).default('all_employees'),targetWorkerIds:ids,dueDate:date});
export const reattestationCampaignActionSchema=z.object({action:z.enum(['submit_review','approve','activate','refresh','close','cancel','reopen'])});
export const legalReviewCreateSchema=z.object({entityType:z.enum(['regulatory_change','regulatory_obligation','policy_impact','policy_version','other']),entityId:z.string().min(1).max(200),title:z.string().min(3).max(260),reason:z.string().min(10).max(4000),sourceUrl:z.string().url().optional(),priority:z.enum(['low','medium','high','critical']).default('high'),dueDate:date});
export const legalReviewActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('claim')}),z.object({action:z.literal('clear'),outcomeNote:z.string().min(10).max(5000)}),z.object({action:z.literal('return'),outcomeNote:z.string().min(10).max(5000)}),z.object({action:z.literal('cancel')}),z.object({action:z.literal('reopen')}),
]);

export const policyImpactRevisionSchema=z.object({content:z.string().min(20),versionLabel:z.string().min(1).max(30),effectiveDate:date});
