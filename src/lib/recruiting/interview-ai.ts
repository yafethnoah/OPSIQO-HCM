import type { ActorContext } from '@/domain/security';
import type { Candidate, Requisition } from '@/domain/recruiting';
import type { AtsResumeReview } from '@/domain/ats';
import type { InterviewQuestionDraft } from './interview-kit';
import { governedInterviewKitDraft } from './ats-provider';

export async function governedInterviewQuestionEnhancement(actor:ActorContext,input:{requisition:Requisition;candidate:Candidate;review?:AtsResumeReview|null;questions:InterviewQuestionDraft[]}):Promise<InterviewQuestionDraft[]|null>{
  try { const result=await governedInterviewKitDraft(actor,{requisition:input.requisition,candidate:input.candidate,review:input.review,baseline:input.questions}); return result?.questions as InterviewQuestionDraft[]|null; }
  catch { return null; }
}
