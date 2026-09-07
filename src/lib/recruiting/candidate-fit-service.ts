import {createHash,randomUUID} from 'node:crypto';
import {FieldValue} from 'firebase-admin/firestore';
import type {ActorContext} from '@/domain/security';
import type {Application,Candidate,Requisition} from '@/domain/recruiting';
import type {AtsResumeReview} from '@/domain/ats';
import type {CandidateFitSummary} from '@/domain/candidate-portal';
import {adminDb} from '@/lib/firebase/admin';
import {buildAudit} from '@/lib/audit/service';
import {buildDomainEvent} from '@/lib/events/build';
import {buildAtsReview,parseResumeTextDeterministic} from './ats-engine';
import {classifyRecruitingDocument} from './document-classifier';

const now=()=>new Date().toISOString();
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const hrRoles=new Set(['super_admin','org_admin','hr_admin','hr_partner']);
const jobHash=(r:Requisition)=>hash([r.title,r.description||'',...(r.requirements||[])].join('\n'));
const clearFit=()=>({atsLatestReviewId:FieldValue.delete(),atsLatestScore:FieldValue.delete(),atsLatestBand:FieldValue.delete(),atsLatestRequirementsCoverage:FieldValue.delete(),atsLatestEvidenceConfidence:FieldValue.delete(),atsLatestAssessmentCoverage:FieldValue.delete(),atsLatestGapCount:FieldValue.delete(),atsLatestJobTextHash:FieldValue.delete(),atsLatestResumeTextHash:FieldValue.delete(),atsReviewedAt:FieldValue.delete()});

export function summarizeAtsFit(review:AtsResumeReview):CandidateFitSummary{
 const rows=review.evidence.map(x=>Number(x.confidence)).filter(Number.isFinite);
 const evidenceConfidence=rows.length?Math.round(rows.reduce((a,b)=>a+b,0)/rows.length*100):0;
 return{reviewId:review.id,overallFit:review.score,requirementsCoverage:review.breakdown.requirements,evidenceConfidence:Math.max(0,Math.min(100,evidenceConfidence)),assessmentCoverage:review.assessmentCoverage,gapCount:review.missingRequirements.length,band:review.band,scoringVersion:review.scoringVersion,humanReviewRequired:true,reviewedAt:review.createdAt};
}

export async function recordAtsAnalysisFailure(actor:ActorContext,applicationId:string,error:unknown){
 const message=error instanceof Error?error.message.slice(0,500):'Candidate fit analysis could not be completed.';
 await adminDb().doc(`organizations/${actor.orgId}/applications/${applicationId}`).set({...clearFit(),atsAnalysisStatus:'failed',atsAnalysisMessage:message,updatedAt:now()},{merge:true});
}

export async function autoScoreStoredApplication(actor:ActorContext,applicationId:string,trigger:'candidate_portal_submission'|'recruiter_intake'|'resume_replacement'|'requisition_refresh'|'backlog_reconciliation'='recruiter_intake'):Promise<CandidateFitSummary|null>{
 const db=adminDb(),appRef=db.doc(`organizations/${actor.orgId}/applications/${applicationId}`),appSnap=await appRef.get();
 if(!appSnap.exists)return null;
 const application=appSnap.data() as Application;
 const [candidateSnap,reqSnap]=await Promise.all([db.doc(`organizations/${actor.orgId}/candidates/${application.candidateId}`).get(),db.doc(`organizations/${actor.orgId}/requisitions/${application.requisitionId}`).get()]);
 if(!candidateSnap.exists||!reqSnap.exists)return null;
 const candidate=candidateSnap.data() as Candidate,requisition=reqSnap.data() as Requisition;
 if(!candidate.resumeText?.trim()){await appRef.set({...clearFit(),atsAnalysisStatus:'no_resume',atsAnalysisMessage:'No resume evidence is available for automatic job-fit analysis.',updatedAt:now()},{merge:true});return null}
 const documentClassification=classifyRecruitingDocument(candidate.resumeSourceMeta?.fileName||'',candidate.resumeText);
 if(documentClassification.kind==='cover_letter'&&documentClassification.confidence>=0.65){await appRef.set({...clearFit(),atsAnalysisStatus:'invalid_resume',atsAnalysisMessage:'Stored evidence looks like a cover letter rather than a resume. Replace the resume before running Candidate Fit.',updatedAt:now()},{merge:true});return null}
 const timestamp=now(),id=randomUUID(),profile=parseResumeTextDeterministic(candidate.resumeText,candidate.resumeSourceMeta?.fileName);
 const review=buildAtsReview({id,applicationId,candidateId:candidate.id,requisition,candidate,profile,sourceMeta:candidate.resumeSourceMeta as AtsResumeReview['sourceMeta']|undefined,createdBy:actor.uid,createdAt:timestamp}),summary=summarizeAtsFit(review);
 const audit=buildAudit(actor,{action:'recruiting.ats.auto_fit_review',entityType:'atsResumeReview',entityId:id,after:{applicationId,candidateId:candidate.id,requisitionId:requisition.id,score:review.score,requirementsCoverage:summary.requirementsCoverage,evidenceConfidence:summary.evidenceConfidence,assessmentCoverage:summary.assessmentCoverage,gapCount:summary.gapCount,trigger,scoringVersion:review.scoringVersion,humanReviewRequired:true}});
 const event=buildDomainEvent(actor,'recruiting.ats_review_completed','application',applicationId,{reviewId:id,score:review.score,requirementsCoverage:summary.requirementsCoverage,evidenceConfidence:summary.evidenceConfidence,trigger});
 const batch=db.batch();
 batch.create(db.doc(`organizations/${actor.orgId}/atsResumeReviews/${id}`),review);
 batch.set(appRef,{atsLatestReviewId:id,atsLatestScore:summary.overallFit,atsLatestBand:summary.band,atsLatestRequirementsCoverage:summary.requirementsCoverage,atsLatestEvidenceConfidence:summary.evidenceConfidence,atsLatestAssessmentCoverage:summary.assessmentCoverage,atsLatestGapCount:summary.gapCount,atsLatestJobTextHash:review.jobTextHash,atsLatestResumeTextHash:review.resumeTextHash,atsReviewedAt:timestamp,atsAnalysisStatus:'ready',atsAnalysisMessage:null,atsAnalysisTrigger:trigger,updatedAt:timestamp},{merge:true});
 batch.set(candidateSnap.ref,{resumeProfile:review.resumeProfile,updatedAt:timestamp},{merge:true});
 batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`),event);
 await batch.commit();return summary;
}

export async function reconcileCandidateFit(actor:ActorContext,raw:unknown={}){
 const input=raw&&typeof raw==='object'?raw as {requisitionId?:unknown;force?:unknown}:{},requisitionId=String(input.requisitionId||'').trim()||undefined,force=input.force===true,db=adminDb();
 const snap=await db.collection(`organizations/${actor.orgId}/applications`).orderBy('updatedAt','desc').limit(500).get();
 let apps=snap.docs.map(d=>d.data() as Application);if(requisitionId)apps=apps.filter(a=>a.requisitionId===requisitionId);
 let analyzed=0,skipped=0,failed=0,noResume=0;
 for(const app of apps){
  const [cs,rs]=await Promise.all([db.doc(`organizations/${actor.orgId}/candidates/${app.candidateId}`).get(),db.doc(`organizations/${actor.orgId}/requisitions/${app.requisitionId}`).get()]);
  if(!cs.exists||!rs.exists){failed++;continue}
  const c=cs.data() as Candidate,r=rs.data() as Requisition;
  if(!hrRoles.has(actor.role)&&r.hiringManagerWorkerId!==actor.workerId){skipped++;continue}
  if(!c.resumeText?.trim()){noResume++;continue}
  const stale=Boolean(app.atsLatestJobTextHash&&app.atsLatestJobTextHash!==jobHash(r)),needs=force||stale||app.atsAnalysisStatus!=='ready'||typeof app.atsLatestScore!=='number';
  if(!needs){skipped++;continue}
  try{await autoScoreStoredApplication(actor,app.id,stale?'requisition_refresh':'backlog_reconciliation');analyzed++}catch(e){failed++;await recordAtsAnalysisFailure(actor,app.id,e).catch(()=>undefined)}
 }
 return{analyzed,skipped,failed,noResume,total:apps.length,humanReviewRequired:true};
}
