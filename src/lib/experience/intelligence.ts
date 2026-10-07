import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { AiRun } from '@/domain/ai-intelligence';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { askCopilot, createActionPlan } from '@/lib/ai-intelligence/service';
import { buildExperienceSignalSnapshot } from './evidence';

const now=()=>new Date().toISOString();
const actionSchema=z.object({runId:z.string().min(1),recommendationId:z.string().min(1)});
const allowedOwnerRoles=new Set(['hr_admin','hr_partner','org_admin','manager']);

const automaticPrompt=[
  'Analyze the organization’s current employee experience, engagement survey, HR service request demand, SLA performance, service satisfaction, knowledge self-service, recognition and employee-idea signals.',
  'Identify cross-signal patterns and likely process or communication gaps using only the aggregate OPSIQO evidence supplied.',
  'Prioritize non-consequential organization-level investigation, review, communication, planning or monitoring actions.',
  'Do not infer protected traits, individual sentiment, individual performance, misconduct, medical status or employment outcomes.',
  'Do not recommend hiring, firing, discipline, promotion, compensation, accommodation, leave eligibility or other consequential decisions.',
  'When evidence is incomplete, state the limitation rather than inventing a cause.',
  'Recommendations must remain draft until an authorized human independently approves an action plan.',
].join(' ');

function requireExperienceIntelligence(actor:ActorContext){
  if(!actor.permissions.includes('experience.manage')&&!actor.permissions.includes('experience.survey')&&!actor.permissions.includes('service.manage')){
    throw new ApiError(403,'Employee Experience intelligence requires HR experience or service management permission.','forbidden');
  }
}

async function latestStored(orgId:string){
  const snap=await adminDb().collection(`organizations/${orgId}/experienceIntelligenceSnapshots`).orderBy('generatedAt','desc').limit(1).get();
  return snap.empty?null:snap.docs[0]!.data();
}

async function runForSnapshot(actor:ActorContext,snapshot:any):Promise<AiRun|null>{
  if(!snapshot?.aiRunId)return null;
  const snap=await adminDb().doc(`organizations/${actor.orgId}/aiRuns/${snapshot.aiRunId}`).get();
  return snap.exists?snap.data() as AiRun:null;
}

export async function experienceIntelligenceDashboard(actor:ActorContext){
  requireExperienceIntelligence(actor);
  const [current,latest]=await Promise.all([buildExperienceSignalSnapshot(actor.orgId),latestStored(actor.orgId)]);
  const latestRun=latest?await runForSnapshot(actor,latest):null;
  return{
    current,
    latest,
    latestRun,
    promptWrittenBy:'OPSIQO',
    automaticPromptRequired:false,
    aiAvailable:actor.permissions.includes('ai.use'),
    governance:{
      aggregateEvidenceOnly:true,
      anonymousSurveyThresholdsPreserved:true,
      consequentialDecisionsBlocked:true,
      actionPlansRequireHumanApproval:true,
    },
  };
}

export async function generateExperienceIntelligence(actor:ActorContext){
  requireExperienceIntelligence(actor);
  const current=await buildExperienceSignalSnapshot(actor.orgId);
  let run:any=null;
  let aiStatus='not_permitted';
  let warning:string|null=null;

  if(actor.permissions.includes('ai.use')){
    try{
      run=await askCopilot(actor,{question:automaticPrompt,responseLocale:'auto'});
      aiStatus=String(run?.status||'unknown');
    }catch(error){
      aiStatus='unavailable';
      warning='AI enhancement is temporarily unavailable. OPSIQO retained the deterministic experience signals and no organizational action was taken automatically.';
      console.warn('OPSIQO_EXPERIENCE_AI_UNAVAILABLE',JSON.stringify({orgId:actor.orgId,code:String((error as any)?.code||'ai_unavailable')}));
    }
  }else{
    warning='Deterministic experience intelligence is available, but this user does not have governed AI-use permission.';
  }

  const db=adminDb(),id=randomUUID(),timestamp=now();
  const snapshot={
    id,
    generatedAt:timestamp,
    generatedBy:actor.uid,
    promptWrittenBy:'OPSIQO',
    automaticPromptHash:createHash('sha256').update(automaticPrompt).digest('hex'),
    aiStatus,
    aiRunId:run?.id||null,
    provider:run?.provider||null,
    model:run?.model||null,
    metrics:current.metrics,
    signalIds:current.signals.map(x=>x.id),
    warning,
  };
  const audit=buildAudit(actor,{
    action:'experience.intelligence.generate',
    entityType:'experienceIntelligenceSnapshot',
    entityId:id,
    after:{
      aiStatus,
      aiRunId:snapshot.aiRunId,
      signalIds:snapshot.signalIds,
      metrics:snapshot.metrics,
      promptWrittenBy:'OPSIQO',
    },
  });
  const batch=db.batch();
  batch.create(db.doc(`organizations/${actor.orgId}/experienceIntelligenceSnapshots/${id}`),snapshot);
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  await batch.commit();

  return{
    current,
    snapshot,
    run,
    promptWrittenBy:'OPSIQO',
    warning,
    requiresHumanReview:true,
  };
}

export async function createExperienceActionPlan(actor:ActorContext,raw:unknown){
  requireExperienceIntelligence(actor);
  const input=actionSchema.parse(raw);
  const snap=await adminDb().doc(`organizations/${actor.orgId}/aiRuns/${input.runId}`).get();
  if(!snap.exists)throw new ApiError(404,'Experience intelligence AI run was not found.','ai_run_not_found');
  const run=snap.data() as AiRun;
  if(!run.answer)throw new ApiError(409,'The selected intelligence run does not contain actionable recommendations.','ai_run_not_actionable');
  const recommendation=run.answer.recommendations.find(x=>x.id===input.recommendationId);
  if(!recommendation)throw new ApiError(404,'Experience recommendation was not found.','recommendation_not_found');
  const ownerRole=recommendation.suggestedOwnerRole&&allowedOwnerRoles.has(recommendation.suggestedOwnerRole)?recommendation.suggestedOwnerRole:'hr_admin';
  const dueDays=Math.max(1,Math.min(90,Number(recommendation.suggestedDueDays||30)));
  const plan=await createActionPlan(actor,input.runId,{
    recommendationId:input.recommendationId,
    title:recommendation.title,
    ownerRole,
    dueDays,
  });
  return{
    plan,
    message:'A draft governed action plan was created. Independent approval is required before it becomes an approved HR action plan.',
  };
}
