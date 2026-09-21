import { createHash, randomBytes, randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { OnboardingCase, OnboardingLegacyReconciliation, OnboardingLegacyRepairAction, OnboardingPolicy, OnboardingTask, PrehireDocument } from '@/domain/onboarding';
import type { Application, Candidate, Offer, Requisition } from '@/domain/recruiting';
import { adminBucket, adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { buildDomainEvent } from '@/lib/events/build';
import { hireCandidate } from '@/lib/recruiting/service';
import { promotePrehireEvidence } from '@/lib/compliance/service';
import type { Policy, PolicyVersion } from '@/domain/compliance';
import { candidateTaskActionSchema, caseActionSchema, createPrehireSchema, policyCreateSchema, prehireDocumentActionSchema, prehireProfileSchema, staffTaskActionSchema } from './schemas';
import { evaluateRequiredPrehireDocumentScans, latestPrehireDocumentForTask } from './scan-policy';

const now=()=>new Date().toISOString(); const today=()=>new Date().toISOString().slice(0,10); const hrRoles=new Set(['super_admin','org_admin','hr_admin','hr_partner']); const adminRoles=new Set(['super_admin','org_admin','hr_admin']);
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const addDays=(date:string,days:number)=>{const d=new Date(`${date.slice(0,10)}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString();};
const dueRelative=(startDate:string,days:number)=>addDays(startDate,days);
const phaseEarliestDate=(startDate:string,phase:OnboardingTask['phase'])=>{
  const offsets:Record<OnboardingTask['phase'],number>={pre_start:-9999,day_1:0,day_7:7,day_30:30,day_60:60,day_90:90};
  return addDays(startDate,offsets[phase]).slice(0,10);
};
const validUploadMagic=(bytes:Buffer,type:string)=>{if(type==='application/pdf')return bytes.subarray(0,5).toString()==='%PDF-';if(type==='image/png')return bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));if(type==='image/jpeg')return bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;if(type==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){const text=bytes.toString('latin1');return bytes.subarray(0,2).toString()==='PK'&&text.includes('[Content_Types].xml')&&text.includes('word/');}return false;};
const requireCleanPrehireScan=()=>process.env.OPSIQO_REQUIRE_CLEAN_DOCUMENT_SCAN==='true'&&!process.env.FIRESTORE_EMULATOR_HOST&&process.env.OPSIQO_DEMO_MODE!=='true';
const isLegacyScanNote=(value?:string|null)=>{
  const text=String(value||'').trim().toLowerCase();
  return Boolean(text)&&/(not signed|to be signed|unsigned|signature pending|pending signature)/.test(text);
};
const repairFingerprint=(actions:OnboardingLegacyRepairAction[])=>createHash('sha256').update(JSON.stringify(actions)).digest('hex');

function defaultTasks(caseId:string,startDate:string,timestamp:string, policies:OnboardingPolicy[]):OnboardingTask[]{
  const rows:Array<Omit<OnboardingTask,'id'|'caseId'|'createdAt'|'updatedAt'>>=[
    {title:'Complete personal information',description:'Confirm legal/contact details and emergency contact.',taskType:'form',phase:'pre_start',ownerType:'candidate',required:true,blockingActivation:true,status:'pending',dueAt:dueRelative(startDate,-3)},
    {title:'Upload signed employment agreement',description:'Upload the signed employment agreement supplied by HR.',taskType:'document',phase:'pre_start',ownerType:'candidate',required:true,blockingActivation:true,status:'pending',dueAt:dueRelative(startDate,-3)},
    {title:'Upload payroll / tax documents',description:'Provide the payroll or tax documents requested by the organization.',taskType:'document',phase:'pre_start',ownerType:'candidate',required:true,blockingActivation:true,status:'pending',dueAt:dueRelative(startDate,-2)},
    {title:'Verify prehire documentation',taskType:'approval',phase:'pre_start',ownerType:'hr',ownerRole:'hr_admin',required:true,blockingActivation:true,status:'pending',dueAt:dueRelative(startDate,-1)},
    {title:'Prepare workstation and access',taskType:'task',phase:'pre_start',ownerType:'it',ownerRole:'hr_admin',required:true,blockingActivation:true,status:'pending',dueAt:dueRelative(startDate,-1)},
    {title:'Manager first-day plan',taskType:'task',phase:'pre_start',ownerType:'manager',ownerRole:'manager',required:true,blockingActivation:true,status:'pending',dueAt:dueRelative(startDate,-1)},
    {title:'Day-one orientation',taskType:'orientation',phase:'day_1',ownerType:'hr',ownerRole:'hr_admin',required:true,blockingActivation:false,status:'pending',dueAt:dueRelative(startDate,0)},
    {title:'Mandatory learning launch',taskType:'training',phase:'day_7',ownerType:'employee',required:true,blockingActivation:false,status:'pending',dueAt:dueRelative(startDate,7)},
    {title:'30-day check-in',taskType:'check_in',phase:'day_30',ownerType:'manager',ownerRole:'manager',required:true,blockingActivation:false,status:'pending',dueAt:dueRelative(startDate,30)},
    {title:'60-day check-in',taskType:'check_in',phase:'day_60',ownerType:'manager',ownerRole:'manager',required:true,blockingActivation:false,status:'pending',dueAt:dueRelative(startDate,60)},
    {title:'90-day onboarding review',taskType:'check_in',phase:'day_90',ownerType:'manager',ownerRole:'manager',required:true,blockingActivation:false,status:'pending',dueAt:dueRelative(startDate,90)},
  ];
  for(const policy of policies) rows.splice(3,0,{title:`Acknowledge: ${policy.title}`,description:`Version ${policy.version} · effective ${policy.effectiveDate}`,taskType:'policy_ack',phase:'pre_start',ownerType:'candidate',required:true,blockingActivation:true,status:'pending',dueAt:dueRelative(startDate,-2),policyId:policy.id,policyVersion:policy.version,policyVersionId:policy.governedVersionId,policyContentSha256:policy.contentSha256});
  return rows.map(row=>({id:randomUUID(),caseId,...row,createdAt:timestamp,updatedAt:timestamp}));
}

async function bundle(orgId:string,offerId:string){const db=adminDb();const offerSnap=await db.doc(`organizations/${orgId}/offers/${offerId}`).get();if(!offerSnap.exists)throw new ApiError(404,'Offer not found.','offer_not_found');const offer=offerSnap.data() as Offer;if(offer.status!=='accepted')throw new ApiError(409,'Accepted offer required before preboarding.','accepted_offer_required');const appSnap=await db.doc(`organizations/${orgId}/applications/${offer.applicationId}`).get();if(!appSnap.exists)throw new ApiError(404,'Application not found.','application_not_found');const application=appSnap.data() as Application;const [candidateSnap,reqSnap]=await Promise.all([db.doc(`organizations/${orgId}/candidates/${application.candidateId}`).get(),db.doc(`organizations/${orgId}/requisitions/${application.requisitionId}`).get()]);if(!candidateSnap.exists||!reqSnap.exists)throw new ApiError(409,'Recruiting bundle is incomplete.','recruiting_bundle_incomplete');return{offer,application,candidate:candidateSnap.data() as Candidate,requisition:reqSnap.data() as Requisition};}
async function publishedPolicies(orgId:string){const db=adminDb();const governed=await db.collection(`organizations/${orgId}/policies`).where('onboardingRequired','==',true).get();if(!governed.empty){const rows:OnboardingPolicy[]=[];for(const d of governed.docs){const p=d.data() as Policy;if(!p.currentPublishedVersionId||p.status==='archived')continue;const vs=await db.doc(`organizations/${orgId}/policyVersions/${p.currentPublishedVersionId}`).get();if(!vs.exists)continue;const v=vs.data() as PolicyVersion;rows.push({id:p.id,title:p.title,version:v.versionLabel,content:v.content,status:'published',onboardingRequired:true,governedVersionId:v.id,contentSha256:v.contentSha256,effectiveDate:v.effectiveDate,createdAt:p.createdAt,updatedAt:p.updatedAt});}return rows;}const legacy=await db.collection(`organizations/${orgId}/onboardingPolicies`).where('status','==','published').where('onboardingRequired','==',true).get();return legacy.docs.map((d:any)=>d.data() as OnboardingPolicy);}

export async function createOnboardingPolicy(actor:ActorContext,raw:unknown){if(!['super_admin','org_admin','hr_admin'].includes(actor.role))throw new ApiError(403,'HR administrator permission required.','forbidden');const input=policyCreateSchema.parse(raw);const timestamp=now();const policy:OnboardingPolicy={id:randomUUID(),...input,status:'published',createdAt:timestamp,updatedAt:timestamp};const audit=buildAudit(actor,{action:'onboarding.policy.publish',entityType:'onboardingPolicy',entityId:policy.id,after:policy});const batch=adminDb().batch();batch.create(adminDb().doc(`organizations/${actor.orgId}/onboardingPolicies/${policy.id}`),policy);batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();return policy;}
export async function listOnboardingPolicies(actor:ActorContext){const snap=await adminDb().collection(`organizations/${actor.orgId}/onboardingPolicies`).orderBy('updatedAt','desc').limit(100).get();return snap.docs.map((d:any)=>d.data() as OnboardingPolicy);}

export async function createPrehireCase(actor:ActorContext,raw:unknown){const input=createPrehireSchema.parse(raw);if(!hrRoles.has(actor.role))throw new ApiError(403,'HR permission required.','forbidden');const {offer,application,candidate,requisition}=await bundle(actor.orgId,input.offerId);const db=adminDb();const timestamp=now();const token=randomBytes(32).toString('base64url');const tokenHash=hash(token);const caseId=randomUUID();const accessExpiresAt=new Date(Date.now()+input.accessDays*86400000).toISOString();const policies=await publishedPolicies(actor.orgId);const tasks=defaultTasks(caseId,offer.startDate,timestamp,policies);const required=tasks.filter(t=>t.blockingActivation&&t.required).length;const onboardingCase:OnboardingCase={id:caseId,offerId:offer.id,applicationId:application.id,candidateId:candidate.id,requisitionId:requisition.id,positionId:requisition.positionId,orgUnitId:requisition.orgUnitId,managerWorkerId:requisition.hiringManagerWorkerId,candidateDisplayName:candidate.displayName,candidateEmail:candidate.email,...(input.employeeNumber?{employeeNumber:input.employeeNumber}:{}),workEmail:input.workEmail.toLowerCase(),employmentType:input.employmentType,startDate:offer.startDate,status:'in_progress',progress:0,requiredPreStartTasks:required,completedRequiredPreStartTasks:0,accessExpiresAt,accessStatus:'active',accessSendCount:1,createdBy:actor.uid,createdAt:timestamp,updatedAt:timestamp,profile:{legalFirstName:candidate.firstName,legalLastName:candidate.lastName,personalEmail:candidate.email,phone:candidate.phone}};const offerIndex=db.doc(`organizations/${actor.orgId}/prehireOfferIndex/${encodeURIComponent(offer.id)}`);const accessIndex=db.doc(`prehireAccessIndex/${tokenHash}`);const audit=buildAudit(actor,{action:'onboarding.prehire.create',entityType:'onboardingCase',entityId:caseId,after:{...onboardingCase,accessToken:'[redacted]'}});await db.runTransaction(async tx=>{const existing=await tx.get(offerIndex);if(existing.exists)throw new ApiError(409,'This offer already has a preboarding case.','prehire_exists');tx.create(db.doc(`organizations/${actor.orgId}/onboardingCases/${caseId}`),onboardingCase);tx.create(offerIndex,{offerId:offer.id,caseId,createdAt:timestamp});tx.create(accessIndex,{caseId,orgId:actor.orgId,status:'active',expiresAt:accessExpiresAt,createdAt:timestamp});for(const task of tasks)tx.create(db.doc(`organizations/${actor.orgId}/onboardingTasks/${task.id}`),task);tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);const event=buildDomainEvent(actor,'onboarding.started','onboardingCase',caseId,{offerId:offer.id,applicationId:application.id,startDate:offer.startDate});tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`),event);});const accessUrl=`${process.env.APP_BASE_URL||'http://localhost:3000'}/prehire#token=${encodeURIComponent(token)}`;await sendPrehireAccess(candidate.email,candidate.displayName,accessUrl).catch(()=>undefined);return{case:onboardingCase,accessUrl};}

async function sendPrehireAccess(email:string,name:string,url:string){const apiKey=process.env.RESEND_API_KEY;const from=process.env.ONBOARDING_FROM_EMAIL||process.env.INVITATION_FROM_EMAIL;if(!apiKey||!from)return;const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Complete your preboarding',html:`<p>Hello ${escapeHtml(name)},</p><p>Please complete your secure preboarding requirements.</p><p><a href="${url}">Open preboarding</a></p>`})});if(!r.ok)throw new Error(`Email provider returned ${r.status}.`);}
const escapeHtml=(v:string)=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export async function listOnboardingCases(actor:ActorContext){let q:any=adminDb().collection(`organizations/${actor.orgId}/onboardingCases`);if(actor.role==='manager'){if(!actor.workerId)return[];q=q.where('managerWorkerId','==',actor.workerId);}else if(!hrRoles.has(actor.role))throw new ApiError(403,'Onboarding access denied.','forbidden');const snap=await q.orderBy('updatedAt','desc').limit(200).get();return snap.docs.map((d:any)=>d.data() as OnboardingCase);}
export async function getOnboardingCase(actor:ActorContext,caseId:string){
  const db=adminDb();
  const snap=await db.doc(`organizations/${actor.orgId}/onboardingCases/${caseId}`).get();
  if(!snap.exists)throw new ApiError(404,'Onboarding case not found.','onboarding_not_found');
  const c=snap.data() as OnboardingCase;
  if(actor.role==='manager'&&c.managerWorkerId!==actor.workerId)throw new ApiError(403,'Case is outside your manager scope.','forbidden');
  if(actor.role!=='manager'&&!hrRoles.has(actor.role))throw new ApiError(403,'Onboarding access denied.','forbidden');
  const tasks=await listTasks(actor.orgId,caseId);
  let documents:PrehireDocument[]=[];
  if(hrRoles.has(actor.role)){
    const ds=await db.collection(`organizations/${actor.orgId}/prehireDocuments`).where('caseId','==',caseId).get();
    documents=ds.docs.map((d:any)=>d.data() as PrehireDocument);
  }
  const shaGroups=new Map<string,PrehireDocument[]>();
  for(const doc of documents){
    const key=String(doc.sha256||'').trim().toLowerCase();
    if(!key)continue;
    const group=shaGroups.get(key)||[];
    group.push(doc);shaGroups.set(key,group);
  }
  const duplicateEvidence=[...shaGroups.entries()]
    .filter(([,rows])=>rows.length>1)
    .map(([sha256,rows])=>({sha256,count:rows.length,documentIds:rows.map(row=>row.id),taskIds:[...new Set(rows.map(row=>row.taskId))]}));
  const blocking=tasks.filter(t=>t.required&&t.blockingActivation);
  const blockingDone=blocking.filter(t=>['completed','waived'].includes(t.status)).length;
  const filenameHints=[...new Set(documents.map(doc=>{
    const name=doc.fileName.toLowerCase();
    if(name.includes('contractor'))return 'contractor';
    if(name.includes('volunteer'))return 'volunteer';
    if(name.includes('intern'))return 'intern';
    if(name.includes('temporary')||name.includes('temp_')||name.includes('temp-'))return 'temporary';
    if(name.includes('permanent'))return 'permanent';
    return '';
  }).filter(Boolean))];
  const classificationHint=filenameHints.length===1?filenameHints[0]:filenameHints.length>1?'mixed':null;
  const latestRequiredDocs=blocking
    .filter(t=>t.taskType==='document')
    .map(t=>({task:t,doc:latestPrehireDocumentForTask(documents,t.id)}));
  const unverifiedRequiredDocuments=latestRequiredDocs
    .filter(row=>!row.doc||row.doc.verificationStatus!=='verified')
    .map(row=>({taskId:row.task.id,taskTitle:row.task.title,documentId:row.doc?.id||null,verificationStatus:row.doc?.verificationStatus||'unverified'}));
  const taskById=new Map(tasks.map(task=>[task.id,task]));
  const evidenceGroups=[...shaGroups.entries()].map(([sha256,rows])=>({
    sha256,
    fileName:rows[0]?.fileName||'Evidence file',
    size:rows[0]?.size||0,
    documentIds:rows.map(row=>row.id),
    requirements:rows.map(row=>({
      documentId:row.id,
      taskId:row.taskId,
      taskTitle:taskById.get(row.taskId)?.title||row.taskId,
      scanStatus:row.scanStatus,
      verificationStatus:row.verificationStatus||'unverified',
      legacyScanNote:isLegacyScanNote(row.scanEvidenceRef)?String(row.scanEvidenceRef):row.legacyNote||null,
    })),
  })).sort((a,b)=>a.fileName.localeCompare(b.fileName));
  const legacyScanNotes=documents.filter(doc=>isLegacyScanNote(doc.scanEvidenceRef)).map(doc=>({documentId:doc.id,note:String(doc.scanEvidenceRef)}));
  const prematureCompletedTasks=tasks.filter(task=>{
    if(task.phase==='pre_start'||task.status!=='completed')return false;
    const earliest=phaseEarliestDate(c.startDate,task.phase);
    const completedDate=task.completedAt?.slice(0,10);
    return Boolean((completedDate&&completedDate<earliest)||(!completedDate&&today()<earliest));
  }).map(task=>({taskId:task.id,title:task.title,phase:task.phase,completedAt:task.completedAt||null,earliestCompletion:phaseEarliestDate(c.startDate,task.phase)}));
  const inconsistentDocumentTasks=latestRequiredDocs
    .filter(row=>row.task.status==='completed'&&(!row.doc||row.doc.verificationStatus!=='verified'))
    .map(row=>({taskId:row.task.id,title:row.task.title,documentId:row.doc?.id||null,verificationStatus:row.doc?.verificationStatus||'unverified'}));
  return{
    case:c,
    tasks,
    documents,
    integrity:{
      duplicateEvidence,
      classificationHint,
      classificationMismatch:Boolean(classificationHint&&classificationHint!=='mixed'&&classificationHint!==c.employmentType),
      activatedPreStartMismatch:Boolean(['activated','completed'].includes(c.status)&&blockingDone<blocking.length),
      blockingRequired: blocking.length,
      blockingCompleted: blockingDone,
      unverifiedRequiredDocuments,
      activationSnapshotPresent:Boolean(c.activationSnapshot),
      evidenceGroups,
      legacyScanNotes,
      prematureCompletedTasks,
      inconsistentDocumentTasks,
    },
  };
}
async function listTasks(orgId:string,caseId:string){const snap=await adminDb().collection(`organizations/${orgId}/onboardingTasks`).where('caseId','==',caseId).get();return snap.docs.map((d:any)=>d.data() as OnboardingTask).sort((a,b)=>(a.dueAt||'').localeCompare(b.dueAt||''));}
function buildLegacyReconciliationPlan(c:OnboardingCase,tasks:OnboardingTask[],documents:PrehireDocument[]){
  const actions:OnboardingLegacyRepairAction[]=[];
  const taskById=new Map(tasks.map(task=>[task.id,task]));

  for(const doc of documents){
    if(isLegacyScanNote(doc.scanEvidenceRef)){
      actions.push({
        type:'normalize_legacy_scan_note',
        targetType:'prehireDocument',
        targetId:doc.id,
        description:'Move a legacy signing-status note out of the malware-scan evidence field.',
        before:{scanEvidenceRef:doc.scanEvidenceRef||null,legacyNote:doc.legacyNote||null},
        proposed:{scanEvidenceRef:null,legacyNote:doc.scanEvidenceRef||null},
        writeRequired:true,
      });
    }
  }

  for(const task of tasks){
    if(task.phase!=='pre_start'&&task.status==='completed'){
      const earliest=phaseEarliestDate(c.startDate,task.phase);
      const completedDate=task.completedAt?.slice(0,10);
      if((completedDate&&completedDate<earliest)||(!completedDate&&today()<earliest)){
        actions.push({
          type:'reset_premature_lifecycle_task',
          targetType:'onboardingTask',
          targetId:task.id,
          description:`Reset ${task.title} because its recorded completion predates the phase opening date ${earliest}.`,
          before:{status:task.status,completedAt:task.completedAt||null,completedBy:task.completedBy||null,completionNote:task.completionNote||null},
          proposed:{status:'pending',completedAt:null,completedBy:null,earliestCompletion:earliest},
          writeRequired:true,
        });
      }
    }
  }

  const latestRequiredDocs=tasks
    .filter(task=>task.required&&task.blockingActivation&&task.taskType==='document')
    .map(task=>({task,doc:latestPrehireDocumentForTask(documents,task.id)}));

  for(const row of latestRequiredDocs){
    if(row.task.status==='completed'&&(!row.doc||row.doc.verificationStatus!=='verified')){
      actions.push({
        type:'flag_unverified_document_task',
        targetType:'onboardingTask',
        targetId:row.task.id,
        description:`Flag ${row.task.title} for governed HR verification without rewriting historical activation evidence.`,
        before:{status:row.task.status,documentId:row.doc?.id||null,verificationStatus:row.doc?.verificationStatus||'unverified'},
        proposed:{legacyVerificationRequired:true},
        writeRequired:true,
      });
    }
  }

  const shaGroups=new Map<string,PrehireDocument[]>();
  for(const doc of documents){
    const key=String(doc.sha256||'').trim().toLowerCase();
    if(!key)continue;
    const rows=shaGroups.get(key)||[];rows.push(doc);shaGroups.set(key,rows);
  }
  for(const [sha256,rows] of shaGroups){
    if(rows.length>1){
      actions.push({
        type:'duplicate_evidence_review',
        targetType:'evidenceGroup',
        targetId:sha256,
        description:`Review ${rows.length} legacy document records sharing one SHA-256. Preserve evidence; do not delete automatically.`,
        before:{documentIds:rows.map(row=>row.id),taskIds:[...new Set(rows.map(row=>row.taskId))]},
        proposed:{canonicalEvidence:true,automaticDeletion:false},
        writeRequired:false,
      });
    }
  }

  return actions.sort((a,b)=>`${a.type}:${a.targetId}`.localeCompare(`${b.type}:${b.targetId}`));
}
async function loadLegacyReconciliationInputs(orgId:string,caseId:string){
  const db=adminDb();
  const [caseSnap,tasks,docsSnap]=await Promise.all([
    db.doc(`organizations/${orgId}/onboardingCases/${caseId}`).get(),
    listTasks(orgId,caseId),
    db.collection(`organizations/${orgId}/prehireDocuments`).where('caseId','==',caseId).get(),
  ]);
  if(!caseSnap.exists)throw new ApiError(404,'Onboarding case not found.','onboarding_not_found');
  return{case:caseSnap.data() as OnboardingCase,tasks,documents:docsSnap.docs.map((d:any)=>d.data() as PrehireDocument)};
}
async function assertRequiredPrehireDocumentsVerified(orgId:string,caseId:string){
  const db=adminDb();
  const [tasksSnap,docsSnap]=await Promise.all([
    db.collection(`organizations/${orgId}/onboardingTasks`).where('caseId','==',caseId).get(),
    db.collection(`organizations/${orgId}/prehireDocuments`).where('caseId','==',caseId).get(),
  ]);
  const tasks=tasksSnap.docs.map((d:any)=>d.data() as OnboardingTask);
  const docs=docsSnap.docs.map((d:any)=>d.data() as PrehireDocument);
  for(const task of tasks.filter(t=>t.required&&t.blockingActivation&&t.taskType==='document')){
    const latest=latestPrehireDocumentForTask(docs,task.id);
    if(!latest)throw new ApiError(409,`Required prehire document is missing: ${task.title}.`,'prehire_document_missing');
    if(latest.verificationStatus!=='verified')throw new ApiError(409,`HR verification is required before this document can satisfy: ${task.title}.`,'prehire_document_unverified');
  }
}

async function recompute(orgId:string,caseId:string){const db=adminDb();const ref=db.doc(`organizations/${orgId}/onboardingCases/${caseId}`);const [caseSnap,tasks]=await Promise.all([ref.get(),listTasks(orgId,caseId)]);if(!caseSnap.exists)return;const c=caseSnap.data() as OnboardingCase;const relevant=tasks.filter(t=>t.required);const done=relevant.filter(t=>['completed','waived'].includes(t.status)).length;const blocking=tasks.filter(t=>t.required&&t.blockingActivation);const blockingDone=blocking.filter(t=>['completed','waived'].includes(t.status)).length;const progress=relevant.length?Math.round(done/relevant.length*100):100;const ready=blocking.length===blockingDone&&c.status==='in_progress';const completed=c.status==='activated'&&relevant.length===done;const nextStatus=completed?'completed':ready?'ready_for_activation':c.status==='ready_for_activation'&&blockingDone<blocking.length?'in_progress':c.status;await ref.set({progress,requiredPreStartTasks:blocking.length,completedRequiredPreStartTasks:blockingDone,status:nextStatus,updatedAt:now()},{merge:true});const actor={uid:'system:onboarding',orgId,role:'org_admin',permissions:[]} as ActorContext;if(ready){const event=buildDomainEvent(actor,'onboarding.ready','onboardingCase',caseId,{startDate:c.startDate});await db.doc(`organizations/${orgId}/domainEvents/${event.id}`).create(event).catch(()=>undefined);}if(completed){const event=buildDomainEvent(actor,'onboarding.completed','onboardingCase',caseId,{workerId:c.workerId||null});await db.doc(`organizations/${orgId}/domainEvents/${event.id}`).create(event).catch(()=>undefined);}}

export async function actOnOnboardingTask(actor:ActorContext,caseId:string,taskId:string,raw:unknown){
  const input=staffTaskActionSchema.parse(raw);
  const {case:c}=await getOnboardingCase(actor,caseId);
  const ref=adminDb().doc(`organizations/${actor.orgId}/onboardingTasks/${taskId}`);
  const snap=await ref.get();
  if(!snap.exists)throw new ApiError(404,'Onboarding task not found.','task_not_found');
  const task=snap.data() as OnboardingTask;
  if(task.caseId!==caseId)throw new ApiError(409,'Task does not belong to this case.','task_case_mismatch');
  if(actor.role==='manager'&&(c.managerWorkerId!==actor.workerId||task.ownerType!=='manager'))throw new ApiError(403,'Manager can act only on their own onboarding tasks.','forbidden');
  if(actor.role==='manager'&&input.action==='waive')throw new ApiError(403,'Managers cannot waive onboarding controls.','waiver_permission');
  if(input.action==='waive'&&task.blockingActivation&&!adminRoles.has(actor.role))throw new ApiError(403,'Only an HR administrator can waive an activation-blocking control.','waiver_permission');
  if(task.ownerType==='candidate'&&input.action!=='waive')throw new ApiError(409,'Candidate-owned tasks must be completed through the prehire portal.','candidate_task');

  const closedActivation=['activated','completed'].includes(c.status);
  if(closedActivation&&task.phase==='pre_start'&&input.action!=='reconcile_complete'){
    throw new ApiError(409,'Pre-start activation evidence is immutable after activation. Use the governed reconciliation action for legacy gaps.','activation_evidence_locked');
  }
  if(input.action==='reconcile_complete'){
    if(!closedActivation||task.phase!=='pre_start')throw new ApiError(409,'Reconciliation completion is only available for legacy pre-start gaps after activation.','reconciliation_not_applicable');
    if(!adminRoles.has(actor.role))throw new ApiError(403,'HR administrator permission is required for post-activation evidence reconciliation.','reconciliation_permission');
    if((input.note||'').trim().length<10)throw new ApiError(400,'Post-activation reconciliation requires a detailed reason of at least 10 characters.','reconciliation_reason_required');
  }

  if(input.action==='complete'&&task.phase!=='pre_start'){
    const earliest=phaseEarliestDate(c.startDate,task.phase);
    if(today()<earliest)throw new ApiError(409,`This ${task.phase.replace('_',' ')} task cannot be completed before ${earliest}.`,'future_onboarding_phase');
  }

  if((input.action==='complete'||input.action==='reconcile_complete')&&task.phase==='pre_start'&&task.taskType==='approval'){
    await assertRequiredPrehireDocumentsVerified(actor.orgId,caseId);
  }

  const map:any={start:'in_progress',complete:'completed',waive:'waived',reopen:'pending',reconcile_complete:'completed'};
  const timestamp=now();
  const patch:any={status:map[input.action],updatedAt:timestamp,completionNote:input.note||null};
  if(['complete','waive','reconcile_complete'].includes(input.action)){
    patch.completedAt=timestamp;patch.completedBy=actor.uid;
  }else{
    patch.completedAt=null;patch.completedBy=null;
  }
  if(input.action==='reconcile_complete'){
    patch.reconciledAfterActivation=true;
    patch.reconciledAt=timestamp;
    patch.reconciledBy=actor.uid;
  }
  const audit=buildAudit(actor,{
    action:`onboarding.task.${input.action}`,
    entityType:'onboardingTask',
    entityId:task.id,
    before:task,
    after:{...task,...patch},
    metadata:{postActivationReconciliation:input.action==='reconcile_complete',reason:input.note||null},
  });
  const batch=adminDb().batch();
  batch.set(ref,patch,{merge:true});
  batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  await batch.commit();
  await recompute(actor.orgId,caseId);
  return{...task,...patch};
}

export async function actOnOnboardingCase(actor:ActorContext,caseId:string,raw:unknown){const input=caseActionSchema.parse(raw);if(!hrRoles.has(actor.role))throw new ApiError(403,'HR permission required.','forbidden');const db=adminDb();const ref=db.doc(`organizations/${actor.orgId}/onboardingCases/${caseId}`);const snap=await ref.get();if(!snap.exists)throw new ApiError(404,'Onboarding case not found.','onboarding_not_found');const c=snap.data() as OnboardingCase;
if(input.action==='preview_legacy_reconciliation'){
  if(!adminRoles.has(actor.role))throw new ApiError(403,'HR administrator permission is required for legacy onboarding reconciliation.','reconciliation_permission');
  if(!['activated','completed'].includes(c.status))throw new ApiError(409,'Legacy reconciliation is only available for activated or completed onboarding cases.','reconciliation_not_applicable');
  const inputs=await loadLegacyReconciliationInputs(actor.orgId,caseId);
  const actions=buildLegacyReconciliationPlan(inputs.case,inputs.tasks,inputs.documents);
  const previewId=randomUUID(),timestamp=now(),fingerprint=repairFingerprint(actions);
  const preview:OnboardingLegacyReconciliation={id:previewId,caseId,sourceRelease:'H51.68',status:'previewed',fingerprint,actions,createdAt:timestamp,createdBy:actor.uid};
  await db.doc(`organizations/${actor.orgId}/onboardingReconciliations/${previewId}`).create(preview);
  return{preview};
}
if(input.action==='apply_legacy_reconciliation'){
  if(!adminRoles.has(actor.role))throw new ApiError(403,'HR administrator permission is required for legacy onboarding reconciliation.','reconciliation_permission');
  if(!['activated','completed'].includes(c.status))throw new ApiError(409,'Legacy reconciliation is only available for activated or completed onboarding cases.','reconciliation_not_applicable');
  const previewId=String(input.previewId||'');
  const reconciliationRef=db.doc(`organizations/${actor.orgId}/onboardingReconciliations/${previewId}`);
  const previewSnap=await reconciliationRef.get();
  if(!previewSnap.exists)throw new ApiError(404,'Legacy reconciliation preview not found.','reconciliation_preview_not_found');
  const preview=previewSnap.data() as OnboardingLegacyReconciliation;
  if(preview.caseId!==caseId||preview.status!=='previewed')throw new ApiError(409,'Legacy reconciliation preview is no longer applicable.','reconciliation_preview_closed');

  const fresh=await loadLegacyReconciliationInputs(actor.orgId,caseId);
  const freshActions=buildLegacyReconciliationPlan(fresh.case,fresh.tasks,fresh.documents);
  const freshFingerprint=repairFingerprint(freshActions);
  if(freshFingerprint!==preview.fingerprint)throw new ApiError(409,'Onboarding evidence changed after the preview. Generate a new reconciliation preview.','reconciliation_preview_stale');

  const timestamp=now();
  const reason=String(input.reason||'').trim();
  const audit=buildAudit(actor,{
    action:'onboarding.legacy_reconciliation.apply',
    entityType:'onboardingCase',
    entityId:caseId,
    before:{previewId:preview.id,fingerprint:preview.fingerprint},
    after:{status:'applied',sourceRelease:'H51.68',actionCount:preview.actions.length},
    metadata:{reason,writeActions:preview.actions.filter(action=>action.writeRequired).length,advisoryActions:preview.actions.filter(action=>!action.writeRequired).length},
  });

  await db.runTransaction(async tx=>{
    const livePreviewSnap=await tx.get(reconciliationRef);
    const livePreview=livePreviewSnap.data() as OnboardingLegacyReconciliation|undefined;
    if(!livePreviewSnap.exists||livePreview?.status!=='previewed'||livePreview.fingerprint!==preview.fingerprint){
      throw new ApiError(409,'Legacy reconciliation preview changed before confirmation. Generate a new preview.','reconciliation_preview_stale');
    }

    const writeActions=preview.actions.filter(action=>action.writeRequired);
    const refs=writeActions.map(action=>action.targetType==='prehireDocument'
      ?db.doc(`organizations/${actor.orgId}/prehireDocuments/${action.targetId}`)
      :db.doc(`organizations/${actor.orgId}/onboardingTasks/${action.targetId}`));
    const snaps=await Promise.all(refs.map(targetRef=>tx.get(targetRef)));
    for(let index=0;index<writeActions.length;index+=1){
      if(!snaps[index]?.exists)throw new ApiError(409,'A reconciliation target no longer exists. Generate a new preview.','reconciliation_preview_stale');
    }

    for(let index=0;index<writeActions.length;index+=1){
      const action=writeActions[index]!;
      const targetRef=refs[index]!;
      const current=snaps[index]!.data() as any;
      if(action.type==='normalize_legacy_scan_note'){
        if(String(current.scanEvidenceRef||'')!==String(action.before.scanEvidenceRef||''))throw new ApiError(409,'Legacy scan-note evidence changed after preview.','reconciliation_preview_stale');
        tx.set(targetRef,{legacyNote:action.before.scanEvidenceRef||null,scanEvidenceRef:null,legacyNormalizedAt:timestamp,legacyNormalizedBy:actor.uid},{merge:true});
      }
      if(action.type==='reset_premature_lifecycle_task'){
        if(String(current.status||'')!==String(action.before.status||'')||String(current.completedAt||'')!==String(action.before.completedAt||''))throw new ApiError(409,'Lifecycle task state changed after preview.','reconciliation_preview_stale');
        tx.set(targetRef,{
          status:'pending',completedAt:null,completedBy:null,
          completionNote:'Legacy premature completion reset by governed H51.68 reconciliation.',
          legacyReconciliation:{sourceRelease:'H51.68',previousStatus:action.before.status||null,previousCompletedAt:action.before.completedAt||null,previousCompletedBy:action.before.completedBy||null,reason,reconciliationId:preview.id},
          updatedAt:timestamp,
        },{merge:true});
      }
      if(action.type==='flag_unverified_document_task'){
        tx.set(targetRef,{legacyVerificationRequired:true,legacyVerificationFlaggedAt:timestamp,legacyVerificationFlaggedBy:actor.uid,updatedAt:timestamp},{merge:true});
      }
    }

    tx.set(reconciliationRef,{status:'applied',appliedAt:timestamp,appliedBy:actor.uid,reason},{merge:true});
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  });
  await recompute(actor.orgId,caseId);
  return{reconciliation:{...preview,status:'applied',appliedAt:timestamp,appliedBy:actor.uid,reason}};
}
if(input.action==='update_details'){if(!['in_progress','ready_for_activation'].includes(c.status))throw new ApiError(409,'Only an open pre-activation case can be edited.','case_closed');const timestamp=now();const patch:any={updatedAt:timestamp};if(input.workEmail)patch.workEmail=input.workEmail.trim().toLowerCase();if(input.employmentType)patch.employmentType=input.employmentType;const audit=buildAudit(actor,{action:'onboarding.update_details',entityType:'onboardingCase',entityId:c.id,before:{workEmail:c.workEmail,employmentType:c.employmentType},after:{workEmail:patch.workEmail||c.workEmail,employmentType:patch.employmentType||c.employmentType},metadata:{reason:input.reason||null,sharedWorkEmailAllowed:true}});const event=buildDomainEvent(actor,'onboarding.details_updated','onboardingCase',c.id,{workEmailChanged:Boolean(input.workEmail&&input.workEmail.trim().toLowerCase()!==c.workEmail.trim().toLowerCase()),employmentTypeChanged:Boolean(input.employmentType&&input.employmentType!==c.employmentType)});const batch=db.batch();batch.set(ref,patch,{merge:true});batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`),event);await batch.commit();return{case:{...c,...patch}};}if(input.action==='activate')return activateCase(actor,c);if(['cancel','revoke_access'].includes(input.action)){const patch:any={updatedAt:now(),accessStatus:'revoked'};if(input.action==='cancel')patch.status='cancelled';await revokeAccess(actor.orgId,c.id);const audit=buildAudit(actor,{action:`onboarding.${input.action}`,entityType:'onboardingCase',entityId:c.id,before:c,after:{...c,...patch},metadata:{reason:input.reason||null}});const batch=db.batch();batch.set(ref,patch,{merge:true});batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();return{case:{...c,...patch}};}if(input.action==='rotate_access'){if(['activated','cancelled'].includes(c.status))throw new ApiError(409,'Access cannot be rotated for a closed onboarding case.','case_closed');const token=randomBytes(32).toString('base64url'),tokenHash=hash(token),timestamp=now(),accessExpiresAt=new Date(Date.now()+30*86400000).toISOString();const activeTokens=await db.collection('prehireAccessIndex').where('orgId','==',actor.orgId).where('caseId','==',c.id).where('status','==','active').get();const nextSendCount=Number(c.accessSendCount||0)+1;const rotatePatch={accessStatus:'active' as const,accessExpiresAt,accessSendCount:nextSendCount,updatedAt:timestamp};const audit=buildAudit(actor,{action:'onboarding.rotate_access',entityType:'onboardingCase',entityId:c.id,before:c,after:{...c,...rotatePatch},metadata:{previousActiveTokenCount:activeTokens.size}});const rotateBatch=db.batch();for(const d of activeTokens.docs)rotateBatch.set(d.ref,{status:'revoked',revokedAt:timestamp},{merge:true});rotateBatch.create(db.doc(`prehireAccessIndex/${tokenHash}`),{caseId:c.id,orgId:actor.orgId,status:'active',expiresAt:accessExpiresAt,createdAt:timestamp});rotateBatch.set(ref,rotatePatch,{merge:true});rotateBatch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await rotateBatch.commit();const accessUrl=`${process.env.APP_BASE_URL||'http://localhost:3000'}/prehire#token=${encodeURIComponent(token)}`;await sendPrehireAccess(c.candidateEmail,c.candidateDisplayName,accessUrl).catch(()=>undefined);return{case:{...c,...rotatePatch},accessUrl};}throw new ApiError(400,'Unsupported case action.','unsupported_action');}

async function revokeAccess(orgId:string,caseId:string){const snap=await adminDb().collection('prehireAccessIndex').where('orgId','==',orgId).where('caseId','==',caseId).where('status','==','active').get();const batch=adminDb().batch();for(const d of snap.docs)batch.set(d.ref,{status:'revoked',revokedAt:now()},{merge:true});if(!snap.empty)await batch.commit();}
async function assertRequiredPrehireDocumentsClean(orgId:string,caseId:string){
  if(!requireCleanPrehireScan())return;
  const db=adminDb(),[tasksSnap,docsSnap]=await Promise.all([
    db.collection(`organizations/${orgId}/onboardingTasks`).where('caseId','==',caseId).get(),
    db.collection(`organizations/${orgId}/prehireDocuments`).where('caseId','==',caseId).get()
  ]);
  const tasks=tasksSnap.docs.map((d:any)=>d.data() as OnboardingTask);
  const docs=docsSnap.docs.map((d:any)=>d.data() as PrehireDocument);
  const gate=evaluateRequiredPrehireDocumentScans(tasks,docs,true);
  if(gate.ok)return;
  if(gate.code==='prehire_document_missing')throw new ApiError(409,`Required prehire document is missing: ${gate.taskTitle}.`,gate.code);
  if(gate.code==='prehire_document_quarantined')throw new ApiError(423,`Required prehire document is quarantined: ${gate.taskTitle}.`,gate.code);
  throw new ApiError(423,`Required prehire document must have clean malware-scan evidence before activation: ${gate.taskTitle}.`,gate.code);
}
async function activateCase(actor:ActorContext,c:OnboardingCase){
  if(!['super_admin','org_admin','hr_admin'].includes(actor.role))throw new ApiError(403,'HR administrator activation required.','activation_permission');
  if(c.status==='activated'&&c.workerId)return{case:c,workerId:c.workerId,deduplicated:true};
  if(c.status!=='ready_for_activation')throw new ApiError(409,'All blocking pre-start tasks must be completed before activation.','not_ready');
  if(c.startDate>today())throw new ApiError(409,'The worker cannot be activated before the accepted start date.','future_start');

  const db=adminDb();
  const [tasksSnap,docsSnap]=await Promise.all([
    db.collection(`organizations/${actor.orgId}/onboardingTasks`).where('caseId','==',c.id).get(),
    db.collection(`organizations/${actor.orgId}/prehireDocuments`).where('caseId','==',c.id).get(),
  ]);
  const tasks=tasksSnap.docs.map((d:any)=>d.data() as OnboardingTask);
  const documents=docsSnap.docs.map((d:any)=>d.data() as PrehireDocument);
  const blocking=tasks.filter(t=>t.required&&t.blockingActivation);
  const blockingDone=blocking.filter(t=>['completed','waived'].includes(t.status));
  if(blockingDone.length!==blocking.length)throw new ApiError(409,'Activation readiness changed. Refresh the case and complete all blocking controls.','activation_readiness_changed');

  await assertRequiredPrehireDocumentsClean(actor.orgId,c.id);
  await assertRequiredPrehireDocumentsVerified(actor.orgId,c.id);

  const documentEvidence=blocking
    .filter(t=>t.taskType==='document')
    .map(task=>{
      const doc=latestPrehireDocumentForTask(documents,task.id);
      if(!doc)throw new ApiError(409,`Required prehire document is missing: ${task.title}.`,'prehire_document_missing');
      return{
        taskId:task.id,
        documentId:doc.id,
        sha256:doc.sha256,
        scanStatus:doc.scanStatus,
        verificationStatus:doc.verificationStatus||'unverified',
      };
    });

  const activationSnapshot={
    capturedAt:now(),
    capturedBy:actor.uid,
    requiredPreStartTasks:blocking.length,
    completedRequiredPreStartTasks:blockingDone.length,
    blockingTaskIds:blocking.map(t=>t.id),
    workEmail:c.workEmail,
    employmentType:c.employmentType,
    startDate:c.startDate,
    documentEvidence,
  };

  const result=await hireCandidate(actor,{
    applicationId:c.applicationId,
    offerId:c.offerId,
    employeeNumber:c.employeeNumber,
    workEmail:c.workEmail,
    hireDate:c.startDate,
    employmentType:c.employmentType,
    legalFirstName:c.profile.legalFirstName,
    legalLastName:c.profile.legalLastName,
    preferredName:c.profile.preferredName,
    personalEmail:c.profile.personalEmail,
    phone:c.profile.phone
  });
  await promotePrehireEvidence(actor,c.id,result.workerId);
  const timestamp=now();
  const ref=db.doc(`organizations/${actor.orgId}/onboardingCases/${c.id}`);
  const patch={status:'activated',workerId:result.workerId,activatedAt:timestamp,activatedBy:actor.uid,accessStatus:'revoked',activationSnapshot,updatedAt:timestamp};
  await revokeAccess(actor.orgId,c.id);
  const audit=buildAudit(actor,{action:'onboarding.activate',entityType:'onboardingCase',entityId:c.id,before:c,after:{...c,...patch},metadata:{activationSnapshot}});
  const event=buildDomainEvent(actor,'onboarding.activated','onboardingCase',c.id,{workerId:result.workerId,startDate:c.startDate});
  const batch=db.batch();
  batch.set(ref,patch,{merge:true});
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`),event);
  await batch.commit();
  return{case:{...c,...patch},workerId:result.workerId};
}

export async function resolvePrehireToken(token:string){if(!token||token.length<30)throw new ApiError(401,'Valid prehire access token required.','prehire_token_required');const tokenHash=hash(token);const db=adminDb();const indexSnap=await db.doc(`prehireAccessIndex/${tokenHash}`).get();if(!indexSnap.exists)throw new ApiError(401,'Prehire access is invalid or revoked.','invalid_prehire_token');const index=indexSnap.data() as {caseId:string;orgId:string;status:string;expiresAt:string};const orgId=index.orgId;if(index.status!=='active')throw new ApiError(401,'Prehire access is invalid or revoked.','invalid_prehire_token');if(index.expiresAt<now()){const batch=db.batch();batch.set(indexSnap.ref,{status:'expired'},{merge:true});batch.set(db.doc(`organizations/${orgId}/onboardingCases/${index.caseId}`),{accessStatus:'expired',updatedAt:now()},{merge:true});await batch.commit();throw new ApiError(401,'Prehire access has expired.','prehire_expired');}const caseSnap=await db.doc(`organizations/${orgId}/onboardingCases/${index.caseId}`).get();if(!caseSnap.exists)throw new ApiError(404,'Prehire case not found.','onboarding_not_found');const c=caseSnap.data() as OnboardingCase;if(!['in_progress','ready_for_activation'].includes(c.status))throw new ApiError(409,'This prehire journey is closed.','prehire_closed');return{orgId,case:c,tokenHash};}
export async function candidatePortal(token:string){const {orgId,case:c}=await resolvePrehireToken(token);const tasks=(await listTasks(orgId,c.id)).filter(t=>t.ownerType==='candidate');const policies=await publishedPolicies(orgId);const policyMap=Object.fromEntries(policies.map(p=>[p.id,{id:p.id,title:p.title,version:p.version,content:p.content,effectiveDate:p.effectiveDate}]));return{case:{id:c.id,candidateDisplayName:c.candidateDisplayName,startDate:c.startDate,status:c.status,progress:c.progress,profile:c.profile},tasks:tasks.map(t=>({...t,policy:t.policyId?policyMap[t.policyId]:undefined}))};}
export async function updateCandidateProfile(token:string,raw:unknown){const input=prehireProfileSchema.parse(raw);const {orgId,case:c}=await resolvePrehireToken(token);const db=adminDb();const timestamp=now();await db.doc(`organizations/${orgId}/onboardingCases/${c.id}`).set({profile:{...input,updatedAt:timestamp},updatedAt:timestamp},{merge:true});const tasks=await listTasks(orgId,c.id);const profileTask=tasks.find(t=>t.ownerType==='candidate'&&t.taskType==='form'&&t.phase==='pre_start');if(profileTask)await db.doc(`organizations/${orgId}/onboardingTasks/${profileTask.id}`).set({status:'completed',completedAt:timestamp,completedBy:'candidate',updatedAt:timestamp},{merge:true});await recompute(orgId,c.id);return{ok:true};}
export async function actCandidateTask(token:string,taskId:string,raw:unknown){const input=candidateTaskActionSchema.parse(raw);const {orgId,case:c}=await resolvePrehireToken(token);const ref=adminDb().doc(`organizations/${orgId}/onboardingTasks/${taskId}`);const snap=await ref.get();if(!snap.exists)throw new ApiError(404,'Task not found.','task_not_found');const task=snap.data() as OnboardingTask;if(task.caseId!==c.id||task.ownerType!=='candidate')throw new ApiError(403,'Task is outside this prehire session.','forbidden');if(task.taskType==='document')throw new ApiError(409,'Document tasks complete only after a successful upload.','upload_required');if(task.taskType==='policy_ack'&&input.action!=='acknowledge')throw new ApiError(409,'Policy task requires acknowledgement.','acknowledgement_required');const timestamp=now();await ref.set({status:'completed',completedAt:timestamp,completedBy:'candidate',completionNote:input.action==='acknowledge'?'Explicit policy acknowledgement recorded.':'Candidate confirmed completion.',updatedAt:timestamp},{merge:true});if(task.taskType==='policy_ack')await adminDb().doc(`organizations/${orgId}/policyAcknowledgements/${randomUUID()}`).create({caseId:c.id,taskId:task.id,candidateId:c.candidateId,policyId:task.policyId,policyVersion:task.policyVersion,policyVersionId:task.policyVersionId,contentSha256:task.policyContentSha256,acknowledgedAt:timestamp,method:'secure_prehire_portal'});await recompute(orgId,c.id);return{ok:true};}
export async function uploadCandidateDocument(token:string,taskId:string,file:File){
  const {orgId,case:c}=await resolvePrehireToken(token);
  if(file.size<=0||file.size>10*1024*1024)throw new ApiError(400,'File must be between 1 byte and 10 MB.','invalid_file_size');
  const allowed=new Set(['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
  if(!allowed.has(file.type))throw new ApiError(400,'Only PDF, JPG, PNG, and DOCX files are accepted.','unsupported_file_type');
  const taskRef=adminDb().doc(`organizations/${orgId}/onboardingTasks/${taskId}`);
  const taskSnap=await taskRef.get();
  if(!taskSnap.exists)throw new ApiError(404,'Document task not found.','task_not_found');
  const task=taskSnap.data() as OnboardingTask;
  if(task.caseId!==c.id||task.ownerType!=='candidate'||task.taskType!=='document')throw new ApiError(403,'Document task is outside this prehire session.','forbidden');

  const bytes=Buffer.from(await file.arrayBuffer());
  if(!validUploadMagic(bytes,file.type))throw new ApiError(400,'File signature does not match the declared file type.','file_signature_mismatch');
  const sha256=createHash('sha256').update(bytes).digest('hex');

  const existingDocs=await adminDb().collection(`organizations/${orgId}/prehireDocuments`).where('caseId','==',c.id).get();
  const duplicate=existingDocs.docs.find(d=>String(d.data()?.sha256||'').toLowerCase()===sha256.toLowerCase());
  if(duplicate)throw new ApiError(409,'This exact file is already attached to this onboarding case. Use the existing evidence or an explicit governed reuse decision instead of uploading another copy.','duplicate_prehire_evidence');

  const docId=randomUUID();
  const safeName=file.name.replace(/[^A-Za-z0-9._-]/g,'_').slice(-120);
  const storagePath=`organizations/${orgId}/prehire/${c.id}/${docId}-${safeName}`;
  const bucket=adminBucket();
  await bucket.file(storagePath).save(bytes,{resumable:false,contentType:file.type,metadata:{cacheControl:'private,max-age=0,no-store',metadata:{orgId,caseId:c.id,taskId}}});
  const timestamp=now();
  const doc:PrehireDocument={
    id:docId,caseId:c.id,taskId,fileName:safeName,contentType:file.type,size:file.size,storagePath,sha256,
    scanStatus:'not_scanned',verificationStatus:'unverified',uploadedAt:timestamp,uploadedBy:'candidate'
  };
  const batch=adminDb().batch();
  batch.create(adminDb().doc(`organizations/${orgId}/prehireDocuments/${docId}`),doc);
  batch.set(taskRef,{
    status:'in_progress',
    completedAt:null,
    completedBy:null,
    completionNote:'Upload received; malware-scan status and HR requirement verification are tracked separately.',
    updatedAt:timestamp
  },{merge:true});
  await batch.commit();
  await recompute(orgId,c.id);
  return{document:{id:doc.id,fileName:doc.fileName,size:doc.size,uploadedAt:doc.uploadedAt}};
}

export async function actOnPrehireDocument(actor:ActorContext,caseId:string,documentId:string,raw:unknown){
  if(!adminRoles.has(actor.role))throw new ApiError(403,'HR administrator permission required for prehire document controls.','forbidden');
  await getOnboardingCase(actor,caseId);
  const input=prehireDocumentActionSchema.parse(raw),db=adminDb(),ref=db.doc(`organizations/${actor.orgId}/prehireDocuments/${documentId}`),snap=await ref.get();
  if(!snap.exists)throw new ApiError(404,'Prehire document not found.','document_not_found');
  const doc=snap.data() as PrehireDocument;
  if(doc.caseId!==caseId)throw new ApiError(409,'Document does not belong to this onboarding case.','document_case_mismatch');
  const timestamp=now();
  const taskDocsSnap=await db.collection(`organizations/${actor.orgId}/prehireDocuments`).where('taskId','==',doc.taskId).get();
  const taskDocs=taskDocsSnap.docs.map((d:any)=>d.data() as PrehireDocument).filter(candidate=>candidate.caseId===caseId);
  const latest=latestPrehireDocumentForTask(taskDocs,doc.taskId);
  const isLatest=latest?.id===documentId;
  if(['verify_requirement','reject_requirement'].includes(input.action)&&!isLatest)throw new ApiError(409,'Only the latest document for this requirement can be verified or rejected.','stale_prehire_document');

  const patch:any={};
  const taskRef=db.doc(`organizations/${actor.orgId}/onboardingTasks/${doc.taskId}`);
  const metadata:any={caseId,taskId:doc.taskId,latestForTask:isLatest};

  if(input.action==='set_scan_clean'||input.action==='set_scan_blocked'){
    if(input.action==='set_scan_clean'&&isLegacyScanNote(input.scanEvidenceRef)){
      throw new ApiError(400,'Signing status is not malware-scan evidence. Record the scan provider/reference instead.','invalid_scan_evidence_semantics');
    }
    const scanStatus=input.action==='set_scan_clean'?'clean':'blocked';
    const scanEvidenceRef=String(input.scanEvidenceRef||'').trim();
    if(scanStatus==='clean'&&requireCleanPrehireScan()&&!scanEvidenceRef)throw new ApiError(400,'A malware-scan evidence reference is required before recording a clean production prehire document.','scan_evidence_required');
    Object.assign(patch,{scanStatus,scanEvidenceRef:scanEvidenceRef||undefined,scanRecordedBy:actor.uid,scanRecordedAt:timestamp});
    metadata.scanEvidenceRecorded=Boolean(scanEvidenceRef);
  }else{
    if(input.action==='verify_requirement'&&requireCleanPrehireScan()&&doc.scanStatus!=='clean')throw new ApiError(423,'The document must pass malware scanning before HR requirement verification.','scan_required');
    const allDocsSnap=await db.collection(`organizations/${actor.orgId}/prehireDocuments`).where('caseId','==',caseId).get();
    const sameShaOtherTask=allDocsSnap.docs
      .map((d:any)=>d.data() as PrehireDocument)
      .filter(other=>other.id!==doc.id&&other.taskId!==doc.taskId&&other.sha256===doc.sha256&&other.verificationStatus==='verified');
    if(input.action==='verify_requirement'&&sameShaOtherTask.length>0&&!String(input.reuseReason||'').trim()){
      throw new ApiError(409,'This same file already satisfies another onboarding requirement. Provide an explicit evidence-reuse reason to verify it for this requirement.','duplicate_evidence_reuse_reason_required');
    }
    Object.assign(patch,{
      verificationStatus:input.action==='verify_requirement'?'verified':'rejected',
      verificationNote:String(input.verificationNote||'').trim(),
      verifiedBy:actor.uid,
      verifiedAt:timestamp
    });
    metadata.reuseReason=String(input.reuseReason||'').trim()||null;
  }

  const audit=buildAudit(actor,{
    action:`onboarding.prehire_document.${input.action}`,
    entityType:'prehireDocument',
    entityId:documentId,
    before:{caseId:doc.caseId,taskId:doc.taskId,scanStatus:doc.scanStatus,verificationStatus:doc.verificationStatus||'unverified'},
    after:{caseId:doc.caseId,taskId:doc.taskId,...patch},
    metadata
  });

  const batch=db.batch();
  batch.set(ref,patch,{merge:true});

  if(isLatest&&input.action==='set_scan_blocked'){
    batch.set(taskRef,{status:'pending',completedAt:null,completedBy:null,completionNote:'Latest candidate document was quarantined and must be replaced.',updatedAt:timestamp},{merge:true});
  }
  if(isLatest&&input.action==='set_scan_clean'){
    batch.set(taskRef,{status:'in_progress',completedAt:null,completedBy:null,completionNote:'Malware scan passed. HR requirement verification is still required.',updatedAt:timestamp},{merge:true});
  }
  if(isLatest&&input.action==='verify_requirement'){
    batch.set(taskRef,{status:'completed',completedAt:timestamp,completedBy:actor.uid,completionNote:`HR verified requirement: ${String(input.verificationNote||'').trim()}`,legacyVerificationRequired:false,updatedAt:timestamp},{merge:true});
  }
  if(isLatest&&input.action==='reject_requirement'){
    batch.set(taskRef,{status:'pending',completedAt:null,completedBy:null,completionNote:`HR rejected requirement evidence: ${String(input.verificationNote||'').trim()}`,updatedAt:timestamp},{merge:true});
  }

  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  await batch.commit();
  if(isLatest)await recompute(actor.orgId,caseId);
  return{...doc,...patch};
}

export async function downloadPrehireDocument(actor:ActorContext,caseId:string,documentId:string){if(!hrRoles.has(actor.role))throw new ApiError(403,'HR permission required to access prehire documents.','forbidden');await getOnboardingCase(actor,caseId);const snap=await adminDb().doc(`organizations/${actor.orgId}/prehireDocuments/${documentId}`).get();if(!snap.exists)throw new ApiError(404,'Prehire document not found.','document_not_found');const doc=snap.data() as PrehireDocument;if(doc.caseId!==caseId)throw new ApiError(409,'Document does not belong to this onboarding case.','document_case_mismatch');if(doc.scanStatus==='blocked')throw new ApiError(423,'Prehire document is quarantined.','document_quarantined');if(requireCleanPrehireScan()&&doc.scanStatus!=='clean')throw new ApiError(423,'Prehire document download is blocked until malware scanning reports clean.','scan_required');const [bytes]=await adminBucket().file(doc.storagePath).download();return{doc,bytes};}

export async function processOnboardingDueTasks(orgId:string,limit=100){const db=adminDb();const timestamp=now();const snap=await db.collection(`organizations/${orgId}/onboardingTasks`).where('status','in',['pending','in_progress']).where('dueAt','<=',timestamp).limit(Math.max(1,Math.min(limit,200))).get();const summary={scanned:snap.size,overdue:0,notifications:0};for(const d of snap.docs){const task=d.data() as OnboardingTask;await d.ref.set({status:'overdue',updatedAt:timestamp},{merge:true});summary.overdue++;const caseSnap=await db.doc(`organizations/${orgId}/onboardingCases/${task.caseId}`).get();const c=caseSnap.data() as OnboardingCase|undefined;if(!c)continue;let targetRole:string|undefined='hr_admin';let targetUid:string|undefined;if(task.ownerType==='manager'){const ms=await db.collection(`organizations/${orgId}/memberships`).where('workerId','==',c.managerWorkerId).where('status','==','active').limit(1).get();targetUid=ms.empty?undefined:ms.docs[0].id;targetRole=targetUid?undefined:'hr_admin';}const id=randomUUID();await db.doc(`organizations/${orgId}/notifications/${id}`).create({id,title:'Onboarding task overdue',message:`${task.title} is overdue for ${c.candidateDisplayName}.`,category:'onboarding',priority:'high',targetRole,targetUid,status:'unread',inAppVisible:true,emailStatus:'pending',emailAttempts:0,createdAt:timestamp,updatedAt:timestamp});summary.notifications++;}return summary;}
