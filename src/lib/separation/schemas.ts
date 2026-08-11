import { z } from 'zod';
const isoDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const separationType=z.enum(['resignation','retirement','employer_initiated','layoff','contract_end','death','other']);
export const separationCreateSchema=z.object({
  workerId:z.string().min(1), separationType, effectiveDate:isoDate, lastWorkingDate:isoDate,
  reasonCategory:z.string().min(2).max(120), reasonDetail:z.string().max(3000).optional(), employeeInitiated:z.boolean().default(false),
  regrettable:z.boolean().default(false), rehireEligible:z.boolean().optional(), autoCloseOnEffectiveDate:z.boolean().default(false),
  payPeriodEndDate:isoDate.optional(), roeTargetDate:isoDate.optional(), finalPayTargetDate:isoDate.optional(),
}).refine(v=>v.lastWorkingDate<=v.effectiveDate,{message:'Last working date cannot be after the effective separation date.'});
export const separationActionSchema=z.object({
  action:z.enum(['submit','approve','start','refresh_readiness','close','cancel','complete_legal_review','replacement_decision','update_hr_controls','reopen']),
  note:z.string().max(3000).optional(), reason:z.string().max(1500).optional(),
  noticeMethod:z.enum(['working_notice','pay_in_lieu','combination','not_applicable','pending_review']).optional(),
  statutoryNoticeWeeks:z.number().min(0).max(104).optional(), contractualNoticeWeeks:z.number().min(0).max(260).optional(),
  severanceReview:z.enum(['not_reviewed','not_applicable','potentially_applicable','confirmed']).optional(),
  massTerminationReview:z.enum(['not_reviewed','not_applicable','potentially_applicable','confirmed']).optional(),
  replacementDecision:z.enum(['pending','replace','do_not_replace','redesign']).optional(), replacementNote:z.string().max(2000).optional(),
  payPeriodEndDate:isoDate.optional(), roeTargetDate:isoDate.optional(), finalPayTargetDate:isoDate.optional(), rehireEligible:z.boolean().optional(), regrettable:z.boolean().optional(), autoCloseOnEffectiveDate:z.boolean().optional(),
});
export const separationTaskActionSchema=z.object({ action:z.enum(['start','complete','waive','reopen']), note:z.string().max(1500).optional() });
export const separationAssetSchema=z.object({ assetTag:z.string().max(100).optional(), name:z.string().min(2).max(200), category:z.string().max(100).optional(), returnDueAt:z.string().datetime().optional(), note:z.string().max(1000).optional() });
export const separationAssetActionSchema=z.object({ action:z.enum(['returned','lost','damaged','written_off']), note:z.string().max(1000).optional() });
export const exitInterviewSchema=z.object({
  overallExperience:z.number().int().min(1).max(5).optional(), managerExperience:z.number().int().min(1).max(5).optional(),
  reasonForLeaving:z.string().max(3000).optional(), whatWorkedWell:z.string().max(5000).optional(), whatCouldImprove:z.string().max(5000).optional(),
  destination:z.string().max(500).optional(), wouldRecommend:z.boolean().optional(), wouldReturn:z.boolean().optional(), confidentialNote:z.string().max(5000).optional(),
  themes:z.array(z.string().min(1).max(80)).max(12).default([]),
});
