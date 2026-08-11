import { z } from 'zod';
const code=z.string().min(2).max(100).regex(/^[A-Z0-9._-]+$/).transform(v=>v.toUpperCase());
const date=z.string().date(); const role=z.string().min(2).max(80);
const domain=z.enum(['lifecycle','hr_diagnostic','governance','regulatory','assurance','privacy_ai','resilience','strategy','org_design','integration','identity','security_ops','platform_reliability']);
const gate=z.enum(['pending','passed','failed','not_run']);
export const actionCreateSchema=z.object({code,title:z.string().min(3).max(260),sourceDomain:domain,sourceEntityType:z.string().min(1).max(120).optional(),sourceEntityId:z.string().min(1).max(240).optional(),sourceHref:z.string().min(1).max(500),priority:z.enum(['low','medium','high','critical']),ownerRole:role.default('hr_admin'),dueDate:date,objective:z.string().min(10).max(5000),successMeasure:z.string().min(5).max(2500),tasks:z.array(z.object({title:z.string().min(3).max(500),dueDate:date})).min(1).max(100)});
export const actionActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('submit_review')}),z.object({action:z.literal('approve')}),z.object({action:z.literal('start')}),z.object({action:z.literal('complete_task'),taskId:z.string().uuid()}),z.object({action:z.literal('complete')}),z.object({action:z.literal('close')}),z.object({action:z.literal('cancel'),reason:z.string().min(10).max(2000)})
]);
export const sloCreateSchema=z.object({code,name:z.string().min(3).max(260),category:z.enum(['availability','latency','automation','data_quality','security','other']),unit:z.enum(['percent','milliseconds','minutes','count']),direction:z.enum(['higher_better','lower_better']),target:z.number(),current:z.number(),tolerance:z.number().min(0),measurementWindow:z.string().min(2).max(120),measurementSource:z.string().min(3).max(500),ownerRole:role.default('org_admin'),nextReviewDate:date});
export const sloActionSchema=z.discriminatedUnion('action',[z.object({action:z.enum(['submit_review','approve','retire','reopen'])}),z.object({action:z.literal('measure'),current:z.number(),nextReviewDate:date.optional()})]);
export const releaseAssessmentCreateSchema=z.object({releaseVersion:z.string().min(1).max(80),environment:z.enum(['staging','production']),dependencyInstall:gate,typecheck:gate,tests:gate,rulesTests:gate,build:gate,aiGovernance:gate,lifecycleUat:gate,ciEvidenceUrl:z.string().url().max(1000).optional(),notes:z.string().min(5).max(10000)});
export const releaseAssessmentActionSchema=z.object({action:z.enum(['submit_review','approve','supersede'])});
export const reportCreateSchema=z.object({title:z.string().min(3).max(300),reportingDate:date,audience:z.enum(['executive','board','hr_leadership','audit_risk_committee']),commentary:z.string().min(10).max(10000)});
export const reportActionSchema=z.object({action:z.enum(['submit_review','approve','supersede'])});
