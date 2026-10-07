import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { WorkflowDefinition } from '@/domain/workflow';
import type { HRFormField, HRFormInstance, HRFormSubmission, HRFormTemplate } from '@/modules/hr-forms-workflows';
import { validateSubmission } from '@/modules/hr-forms-workflows/validation';
import { scoreSubmission } from '@/modules/hr-forms-workflows/scoring';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { startWorkflowFromDefinition } from '@/lib/workflow/service';
import { generateAiAnswer } from '@/lib/ai-intelligence/provider';
import { getPlatformSettings } from '@/lib/platform-settings/service';
import { brandFromPlatformSettings } from '@/lib/documents/professional-document';
import { buildFillablePdf } from '@/lib/documents/fillable-pdf';
import { buildSimpleDocx } from './docx';
import {
  aiFormGenerateSchema,
  formInstanceCreateSchema,
  formSubmissionCreateSchema,
  formTemplateCreateSchema,
  templateActionSchema,
  interviewTemplateSchema,
} from './schemas';

const now=()=>new Date().toISOString();
const adminRoles=new Set(['super_admin','org_admin','hr_admin']);
const hrRoles=new Set(['super_admin','org_admin','hr_admin','hr_partner']);

function requireRead(actor:ActorContext){
  if(!actor.permissions.includes('workflow.read')) throw new ApiError(403,'HR Forms read permission required.','forbidden');
}
function requireManage(actor:ActorContext){
  if(!actor.permissions.includes('workflow.manage')||!hrRoles.has(actor.role)) throw new ApiError(403,'HR Forms management permission required.','forbidden');
}
function requireApprove(actor:ActorContext){
  if(!actor.permissions.includes('workflow.manage')||!adminRoles.has(actor.role)) throw new ApiError(403,'HR administrator approval permission required.','forbidden');
}
function requireSubmit(actor:ActorContext){
  if(!actor.permissions.includes('workflow.run')&&!hrRoles.has(actor.role)) throw new ApiError(403,'Form submission permission required.','forbidden');
}
function requireAi(actor:ActorContext){
  requireManage(actor);
  if(!actor.permissions.includes('ai.use')) throw new ApiError(403,'Governed AI permission required.','forbidden');
}
function bump(version:string){
  const [majorRaw,minorRaw]=String(version||'1.0').split('.');
  const major=Math.max(1,Number(majorRaw)||1),minor=Math.max(0,Number(minorRaw)||0);
  return `${major}.${minor+1}`;
}
function templateRef(orgId:string,id:string){return adminDb().doc(`organizations/${orgId}/hrFormTemplates/${id}`);}
function instanceRef(orgId:string,id:string){return adminDb().doc(`organizations/${orgId}/hrFormInstances/${id}`);}
function submissionRef(orgId:string,id:string){return adminDb().doc(`organizations/${orgId}/hrFormSubmissions/${id}`);}

export async function listFormTemplates(actor:ActorContext){
  requireRead(actor);
  const snap=await adminDb().collection(`organizations/${actor.orgId}/hrFormTemplates`).orderBy('updatedAt','desc').limit(250).get();
  const rows=snap.docs.map(d=>d.data() as HRFormTemplate);
  return hrRoles.has(actor.role)?rows:rows.filter(x=>x.status==='published'&&x.sensitivity!=='restricted');
}

export async function getFormTemplate(actor:ActorContext,id:string){
  requireRead(actor);
  const snap=await templateRef(actor.orgId,id).get();
  if(!snap.exists)throw new ApiError(404,'Form template not found.','hr_form_not_found');
  const row=snap.data() as HRFormTemplate;
  if(!hrRoles.has(actor.role)&&(row.status!=='published'||row.sensitivity==='restricted'))throw new ApiError(403,'Form is outside your access scope.','forbidden');
  return row;
}

export async function createFormTemplate(actor:ActorContext,raw:unknown,extra:Partial<HRFormTemplate>={}){
  requireManage(actor);
  const input=formTemplateCreateSchema.parse(raw),db=adminDb(),timestamp=now();
  const duplicate=await db.collection(`organizations/${actor.orgId}/hrFormTemplates`).where('formCode','==',input.formCode).where('status','in',['draft','under_review','approved','published']).limit(1).get();
  if(!duplicate.empty)throw new ApiError(409,'An active form with this code already exists. Create a new version instead.','hr_form_code_exists');
  const id=randomUUID();
  const row:HRFormTemplate={
    id,organizationId:actor.orgId,formCode:input.formCode,title:input.title,description:input.description,
    category:input.category,subcategory:input.subcategory,status:'draft',version:'1.0',workerTypes:input.workerTypes,
    sensitivity:input.sensitivity,aiGenerated:Boolean(extra.aiGenerated),workflowId:input.workflowId,retentionPolicyId:input.retentionPolicyId,
    tags:input.tags,fields:input.fields,createdBy:actor.uid,createdAt:timestamp,updatedBy:actor.uid,updatedAt:timestamp,
    sourceDocumentIds:extra.sourceDocumentIds,aiGenerationMetadata:extra.aiGenerationMetadata,
  };
  const audit=buildAudit(actor,{action:'hr_forms.template.create',entityType:'hrFormTemplate',entityId:id,after:row});
  const b=db.batch();b.create(templateRef(actor.orgId,id),row);b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();
  return row;
}

async function patchTemplate(actor:ActorContext,current:HRFormTemplate,patch:Record<string,unknown>){
  if(['published','retired','superseded'].includes(current.status))throw new ApiError(409,'Published/retired forms are immutable. Create a new version.','hr_form_immutable');
  const allowed=['title','description','category','subcategory','sensitivity','workerTypes','workflowId','retentionPolicyId','tags','fields'] as const;
  const next:any={...current};
  for(const key of allowed)if(Object.prototype.hasOwnProperty.call(patch,key))next[key]=(patch as any)[key];
  next.updatedBy=actor.uid;next.updatedAt=now();
  const audit=buildAudit(actor,{action:'hr_forms.template.update',entityType:'hrFormTemplate',entityId:current.id,before:current,after:next});
  const db=adminDb(),b=db.batch();b.set(templateRef(actor.orgId,current.id),next);b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return next as HRFormTemplate;
}

export async function actOnFormTemplate(actor:ActorContext,id:string,raw:unknown){
  requireManage(actor);
  const {action,patch}=templateActionSchema.parse(raw),current=await getFormTemplate(actor,id),timestamp=now(),db=adminDb();
  if(action==='save')return patchTemplate(actor,current,patch||{});
  if(action==='new_version'){
    const nextId=randomUUID(),next:HRFormTemplate={...current,id:nextId,status:'draft',version:bump(current.version),approvedBy:undefined,approvedAt:undefined,publishedBy:undefined,publishedAt:undefined,supersedesTemplateId:current.id,createdBy:actor.uid,createdAt:timestamp,updatedBy:actor.uid,updatedAt:timestamp};
    const audit=buildAudit(actor,{action:'hr_forms.template.new_version',entityType:'hrFormTemplate',entityId:nextId,before:{id:current.id,version:current.version},after:next});
    const b=db.batch();b.create(templateRef(actor.orgId,nextId),next);b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return next;
  }
  if(action==='submit_review'){
    if(current.status!=='draft')throw new ApiError(409,'Only draft forms can be submitted for review.','hr_form_state');
    return patchStatus(actor,current,'under_review','hr_forms.template.submit_review');
  }
  if(action==='approve'){
    requireApprove(actor);
    if(current.status!=='under_review')throw new ApiError(409,'Form must be submitted for review before approval.','hr_form_state');
    return patchStatus(actor,current,'approved','hr_forms.template.approve',{approvedBy:actor.uid,approvedAt:timestamp});
  }
  if(action==='publish'){
    requireApprove(actor);
    if(current.status!=='approved')throw new ApiError(409,'Form must be approved before publication.','hr_form_state');
    if(!current.fields.length)throw new ApiError(409,'Cannot publish an empty form.','hr_form_empty');
    return patchStatus(actor,current,'published','hr_forms.template.publish',{publishedBy:actor.uid,publishedAt:timestamp});
  }
  if(action==='retire'){
    requireApprove(actor);
    if(current.status!=='published')throw new ApiError(409,'Only published forms can be retired.','hr_form_state');
    return patchStatus(actor,current,'retired','hr_forms.template.retire');
  }
  throw new ApiError(400,'Unsupported form action.','invalid_action');
}
async function patchStatus(actor:ActorContext,current:HRFormTemplate,status:HRFormTemplate['status'],auditAction:string,extra:Record<string,unknown>={}){
  const next={...current,status,...extra,updatedBy:actor.uid,updatedAt:now()} as HRFormTemplate;
  const db=adminDb(),audit=buildAudit(actor,{action:auditAction,entityType:'hrFormTemplate',entityId:current.id,before:current,after:next}),b=db.batch();
  b.set(templateRef(actor.orgId,current.id),next);b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return next;
}

export async function createFormInstance(actor:ActorContext,raw:unknown){
  requireSubmit(actor);
  const input=formInstanceCreateSchema.parse(raw),template=await getFormTemplate(actor,input.templateId);
  if(template.status!=='published')throw new ApiError(409,'Only published forms can be instantiated.','hr_form_not_published');
  const timestamp=now(),id=randomUUID();
  const row:any={id,organizationId:actor.orgId,templateId:template.id,templateVersion:template.version,status:'open',subject:input.subject,snapshot:structuredClone(template),createdBy:actor.uid,createdAt:timestamp,dueAt:input.dueAt,assignedToUid:input.assignedToUid};
  const db=adminDb(),audit=buildAudit(actor,{action:'hr_forms.instance.create',entityType:'hrFormInstance',entityId:id,after:{templateId:template.id,templateVersion:template.version,subject:input.subject,assignedToUid:input.assignedToUid}}),b=db.batch();
  b.create(instanceRef(actor.orgId,id),row);b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row as HRFormInstance;
}

export async function submitFormInstance(actor:ActorContext,instanceId:string,raw:unknown){
  requireSubmit(actor);
  const input=formSubmissionCreateSchema.parse(raw),db=adminDb(),iSnap=await instanceRef(actor.orgId,instanceId).get();
  if(!iSnap.exists)throw new ApiError(404,'Form instance not found.','hr_form_instance_not_found');
  const instance:any=iSnap.data();
  if(instance.status!=='open')throw new ApiError(409,'Form instance is no longer open.','hr_form_instance_closed');
  if(instance.assignedToUid&&instance.assignedToUid!==actor.uid&&!hrRoles.has(actor.role))throw new ApiError(403,'Form instance is assigned to another user.','forbidden');
  const issues=validateSubmission(instance.snapshot,input.answers);
  if(issues.length)throw new ApiError(400,'Form validation failed.','hr_form_validation',issues);
  const score=scoreSubmission(instance.snapshot,input.answers),timestamp=now(),id=randomUUID();
  const submission:any={id,organizationId:actor.orgId,instanceId,templateId:instance.templateId,templateVersion:instance.templateVersion,submittedBy:actor.uid,submittedAt:timestamp,answers:input.answers,score:{sections:score.sectionScores,weightedTotal:score.weightedTotal,missingRequiredCount:score.missingScoredResponses.length},status:'submitted'};
  const audit=buildAudit(actor,{action:'hr_forms.submission.create',entityType:'hrFormSubmission',entityId:id,after:{instanceId,templateId:submission.templateId,templateVersion:submission.templateVersion,score:submission.score}});
  const b=db.batch();b.create(submissionRef(actor.orgId,id),submission);b.set(instanceRef(actor.orgId,instanceId),{status:'submitted',submittedAt:timestamp,submissionId:id},{merge:true});b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();
  if(instance.snapshot.workflowId){
    const wSnap=await db.doc(`organizations/${actor.orgId}/workflowDefinitions/${instance.snapshot.workflowId}`).get();
    if(!wSnap.exists)throw new ApiError(409,'Linked workflow no longer exists.','hr_form_workflow_missing');
    const run=await startWorkflowFromDefinition(actor,wSnap.data() as WorkflowDefinition,{entityType:'hrFormSubmission',entityId:id,dispatchKey:`hr-form:${id}`});
    await submissionRef(actor.orgId,id).set({workflowRunId:run.run.id,status:'under_review'},{merge:true});submission.workflowRunId=run.run.id;submission.status='under_review';
  }
  await createFormNotification(actor,{title:'HR form submitted',message:`${instance.snapshot.title} was submitted and is ready for governed review.`,targetRole:'hr_admin',entityId:id});
  if(instance.packId){
    const pRef=db.doc(`organizations/${actor.orgId}/hrFormPacks/${instance.packId}`),pSnap=await pRef.get();
    if(pSnap.exists){
      const pack:any=pSnap.data(),instanceIds:Array<string>=Array.isArray(pack.instanceIds)?pack.instanceIds:[];
      const states=await Promise.all(instanceIds.map(async otherId=>{
        const snap=otherId===instance.id?null:await db.doc(`organizations/${actor.orgId}/hrFormInstances/${otherId}`).get();
        return otherId===instance.id?'submitted':String(snap?.data()?.status||'open');
      }));
      if(instanceIds.length&&states.every(state=>state==='submitted')){
        await pRef.set({status:'completed',completedAt:timestamp,updatedAt:timestamp},{merge:true});
      }
    }
  }
  return submission as HRFormSubmission;
}

async function createFormNotification(actor:ActorContext,input:{title:string;message:string;targetRole?:string;targetUid?:string;entityId:string}){
  const id=randomUUID(),timestamp=now(),row={id,type:'hr_forms',category:'workflow',priority:'normal',title:input.title,message:input.message,targetRole:input.targetRole,targetUid:input.targetUid,entityType:'hrFormSubmission',entityId:input.entityId,status:'unread',inAppVisible:true,emailStatus:'pending',emailAttempts:0,createdAt:timestamp,updatedAt:timestamp};
  await adminDb().doc(`organizations/${actor.orgId}/notifications/${id}`).create(row);return row;
}

export async function listFormSubmissions(actor:ActorContext){
  requireRead(actor);
  if(!hrRoles.has(actor.role)&&!actor.permissions.includes('audit.read'))throw new ApiError(403,'HR Forms submission review permission required.','forbidden');
  const snap=await adminDb().collection(`organizations/${actor.orgId}/hrFormSubmissions`).orderBy('submittedAt','desc').limit(200).get();
  return snap.docs.map(d=>d.data());
}

export async function formDashboard(actor:ActorContext){
  requireRead(actor);const db=adminDb();
  const [templates,instances,submissions]=await Promise.all([
    db.collection(`organizations/${actor.orgId}/hrFormTemplates`).limit(500).get(),
    db.collection(`organizations/${actor.orgId}/hrFormInstances`).limit(500).get(),
    db.collection(`organizations/${actor.orgId}/hrFormSubmissions`).limit(500).get(),
  ]);
  const t=templates.docs.map(d=>d.data()),i=instances.docs.map(d=>d.data()),s=submissions.docs.map(d=>d.data());
  return{
    metrics:{
      templates:t.length,published:t.filter(x=>x.status==='published').length,drafts:t.filter(x=>x.status==='draft').length,
      openRequests:i.filter(x=>x.status==='open').length,submissions:s.length,underReview:s.filter(x=>x.status==='under_review').length,
      aiGenerated:t.filter(x=>x.aiGenerated).length
    },
    categories:Object.entries(t.reduce((m:any,x:any)=>{m[x.category]=(m[x.category]||0)+1;return m;},{})).map(([category,count])=>({category,count}))
  };
}

async function modelProfile(orgId:string):Promise<any>{
  const snap=await adminDb().collection(`organizations/${orgId}/aiModelProfiles`).where('status','==','active').orderBy('version','desc').limit(1).get();
  if(!snap.empty)return snap.docs[0]!.data();
  const provider=(process.env.OPSIQO_AI_PROVIDER||'demo') as 'demo'|'openai'|'gemini';
  const model=provider==='openai'?(process.env.OPENAI_MODEL||'gpt-5.6-terra'):provider==='gemini'?(process.env.GEMINI_MODEL||'gemini-3.5-flash'):'opsiqo-evidence-demo-v1';
  return{id:'hr-forms-runtime',code:'HR_FORMS_RUNTIME',provider,model,purpose:'Governed HR form drafting.',dataHandlingNote:'Permission-scoped organizational evidence only.',version:1,status:'active',createdBy:'system',createdAt:now(),updatedAt:now()};
}
async function sourceEvidence(actor:ActorContext,refs:Array<{type:string;id:string}>){
  const map:Record<string,string>={requisition:'requisitions',policy:'policies',workflow:'workflowDefinitions',position:'positions',document:'employeeDocuments'};
  const result:any[]=[],missing:string[]=[];
  for(const ref of refs){
    const collection=map[ref.type];if(!collection){missing.push(`${ref.type}:${ref.id}`);continue;}
    const snap=await adminDb().doc(`organizations/${actor.orgId}/${collection}/${ref.id}`).get();
    if(!snap.exists){missing.push(`${ref.type}:${ref.id}`);continue;}
    const data=snap.data()||{},title=String((data as any).title||(data as any).name||(data as any).code||`${ref.type} ${ref.id}`);
    result.push({id:`hrforms:${ref.type}:${ref.id}`,kind:'document',title,summary:JSON.stringify(data).slice(0,7000),source:`OPSIQO ${ref.type} ${ref.id}`,asOf:String((data as any).updatedAt||(data as any).createdAt||now()),href:ref.type==='requisition'?'/recruiting':ref.type==='workflow'?'/workflows':'/hr-forms',dataQuality:'Authoritative OPSIQO organizational record supplied for form drafting.',sensitivity:'internal'});
  }
  return{result,missing};
}
function generatedFields(answer:any,category:string):HRFormField[]{
  const fields:HRFormField[]=[
    {id:'requester',kind:'employee_selector',label:'Employee / requester',required:true,sensitivity:'confidential'},
    {id:'request_date',kind:'date',label:'Request / completion date',required:true},
  ];
  (answer?.findings||[]).slice(0,6).forEach((finding:string,index:number)=>fields.push({id:`evidence_${index+1}`,kind:'textarea',label:String(finding).slice(0,180),helpText:'Provide organization-specific evidence or response. Human review required.',required:true,sensitivity:'confidential'}));
  (answer?.recommendations||[]).slice(0,4).forEach((rec:any,index:number)=>fields.push({id:`review_${index+1}`,kind:'acknowledgement',label:String(rec.title||`Review item ${index+1}`).slice(0,180),helpText:String(rec.rationale||'').slice(0,600),required:true}));
  if(category.toLowerCase().includes('interview'))fields.push({id:'overall_notes',kind:'textarea',label:'Job-related evidence summary',required:true,sensitivity:'confidential'});
  fields.push({id:'signature',kind:'signature',label:'Reviewer / participant signature',required:false,sensitivity:'confidential'});
  return fields;
}
export async function generateFormWithAi(actor:ActorContext,raw:unknown){
  requireAi(actor);const input=aiFormGenerateSchema.parse(raw),sources=await sourceEvidence(actor,input.sourceRefs);
  if(!sources.result.length){
    return{created:null,sourcesUsed:[],missingOrganizationalSources:sources.missing.length?sources.missing:['At least one governed organizational source is required for AI form generation.'],warnings:['MISSING ORGANIZATIONAL SOURCE'],requiresHumanReview:true};
  }
  const profile=await modelProfile(actor.orgId);
  const generated=await generateAiAnswer({
    question:`Create an HR form drafting analysis for this request: ${input.prompt}`,
    systemInstruction:'You are OPSIQO HR Forms drafting intelligence. Analyze ONLY the supplied organizational evidence. Identify the information the form must collect, review controls, missing evidence and workflow considerations. Never make consequential employment decisions. Never invent law, policy, job requirements or organizational rules. Human review is mandatory.',
    evidence:sources.result as any
  },profile);
  const category=input.category||'Custom';
  const code=`AI-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const created=await createFormTemplate(actor,{
    formCode:code,title:String(generated.answer.summary||input.prompt).slice(0,180),description:`AI-assisted draft. ${String(generated.answer.summary||'').slice(0,1200)}`,
    category,sensitivity:'confidential',tags:['ai-generated','human-review-required'],fields:generatedFields(generated.answer,category)
  },{
    aiGenerated:true,sourceDocumentIds:input.sourceRefs.map(x=>`${x.type}:${x.id}`),
    aiGenerationMetadata:{provider:generated.provider,model:generated.model,citations:generated.answer.citations,confidence:generated.answer.confidence,evidenceCompleteness:generated.answer.evidenceCompleteness,limitations:generated.answer.limitations}
  });
  return{created,sourcesUsed:sources.result.map(x=>({id:x.id,title:x.title,source:x.source})),missingOrganizationalSources:sources.missing,warnings:generated.answer.limitations||[],requiresHumanReview:true};
}

export async function generateRecruitingInterviewTemplate(actor:ActorContext,raw:unknown){
  requireManage(actor);if(!actor.permissions.includes('recruiting.read'))throw new ApiError(403,'Recruiting access required.','forbidden');
  const input=interviewTemplateSchema.parse(raw),snap=await adminDb().doc(`organizations/${actor.orgId}/requisitions/${input.requisitionId}`).get();
  if(!snap.exists)throw new ApiError(404,'Requisition not found.','requisition_not_found');
  const req:any=snap.data(),requirements=(req.requirements||[]).map((x:any)=>String(x).trim()).filter(Boolean).slice(0,8);
  const questions=[{competency:'Role motivation and relevance',question:`What interests you about the ${req.title} role, and which parts of your documented experience are most relevant?`},
    {competency:'Ownership and results',question:'Tell us about work you personally owned from planning through delivery. What did you do and what result did you achieve?'},
    ...requirements.map((r:string)=>({competency:r.slice(0,100),question:`Describe a specific example that demonstrates your capability with this role requirement: "${r}".`}))].slice(0,10);
  const weight=questions.length?Math.round(100/questions.length):0;
  const fields:HRFormField[]=[
    {id:'candidate',kind:'candidate_selector',label:'Candidate',required:true,sensitivity:'confidential'},
    {id:'interview_date',kind:'date',label:'Interview date',required:true},
    {id:'interviewer',kind:'employee_selector',label:'Interviewer',required:true,sensitivity:'confidential'},
    ...questions.flatMap((q,index)=>[
      {id:`q${index+1}_prompt`,kind:'instruction',label:q.question,helpText:`Competency: ${q.competency}`} as HRFormField,
      {id:`q${index+1}_score`,kind:'scale_1_5',label:`${q.competency} score`,required:true,scoring:{enabled:true,min:1,max:5,weight,anchors:{'1':'Little/no job-related evidence; vague or unsupported.','3':'Relevant example with reasonable ownership and sufficient evidence.','5':'Specific, well-evidenced example showing strong judgment, ownership, impact and learning.'}}} as HRFormField,
      {id:`q${index+1}_evidence`,kind:'textarea',label:`${q.competency} supporting evidence`,required:true,helpText:'Record job-related evidence supporting the score.',sensitivity:'confidential'} as HRFormField
    ]),
    {id:'unscored_follow_up',kind:'textarea',label:'Unscored candidate-specific follow-up notes',required:false,helpText:'Use only for clarification. Do not change the frozen scored questions or weights.',sensitivity:'confidential'}
  ];
  const code=`INT-${String(req.code||input.requisitionId).replace(/[^A-Za-z0-9_.-]/g,'-')}-${input.stage}`.slice(0,80);
  return createFormTemplate(actor,{formCode:code,title:`${req.title} — ${input.stage} Interview Evaluation`,description:'Version-controlled structured interview scorecard. Core scored questions and weights are frozen per published version; candidate-specific clarification is unscored.',category:'Recruitment',subcategory:'Candidate Interview Evaluation',sensitivity:'confidential',workerTypes:['candidate','manager'],tags:['structured-interview','standardized-scorecard',input.requisitionId],fields},{sourceDocumentIds:[`requisition:${input.requisitionId}`]});
}

export async function exportFormSubmission(actor:ActorContext,id:string,format:'pdf'|'docx'){
  if(!actor.permissions.includes('documents.read')&&!hrRoles.has(actor.role))throw new ApiError(403,'Document access required.','forbidden');
  const sSnap=await submissionRef(actor.orgId,id).get();if(!sSnap.exists)throw new ApiError(404,'Submission not found.','hr_form_submission_not_found');
  const submission:any=sSnap.data(),tSnap=await templateRef(actor.orgId,submission.templateId).get();if(!tSnap.exists)throw new ApiError(409,'Submission template no longer exists.','hr_form_template_missing');
  const template=tSnap.data() as HRFormTemplate,fieldMap=new Map<string,string>();
  const walk=(fields:HRFormField[])=>{for(const f of fields){fieldMap.set(f.id,f.label);if(f.children?.length)walk(f.children);}};walk(template.fields);
  const lines=Object.entries(submission.answers||{}).map(([key,value])=>({label:fieldMap.get(key)||key,value:Array.isArray(value)?value.join(', '):typeof value==='object'?JSON.stringify(value):String(value??'')}));
  const settings=await getPlatformSettings(actor),brand=brandFromPlatformSettings(settings as any,'Organization'),content=[`# ${template.title}`,`Reference: ${submission.id}`,`Submitted: ${submission.submittedAt}`,...lines.map(x=>`${x.label}: ${x.value}`)].join('\n');
  const safe=template.title.replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,80)||'HR_Form';
  if(format==='pdf')return{bytes:buildFillablePdf({title:template.title,content,brand,documentReference:submission.id}),contentType:'application/pdf',fileName:`${safe}_${submission.id.slice(0,8)}.pdf`};
  return{bytes:buildSimpleDocx({title:template.title,lines:[{label:'Reference',value:submission.id},{label:'Submitted',value:submission.submittedAt},...lines]}),contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',fileName:`${safe}_${submission.id.slice(0,8)}.docx`};
}

export async function getFormInstance(actor:ActorContext,id:string){
  requireRead(actor);
  const snap=await instanceRef(actor.orgId,id).get();
  if(!snap.exists)throw new ApiError(404,'Form instance not found.','hr_form_instance_not_found');
  const row:any=snap.data();
  if(row.assignedToUid&&row.assignedToUid!==actor.uid&&!hrRoles.has(actor.role))throw new ApiError(403,'Form instance is assigned to another user.','forbidden');
  return row;
}

export async function listFormInstances(actor:ActorContext,templateId?:string){
  requireRead(actor);
  const snap=await adminDb().collection(`organizations/${actor.orgId}/hrFormInstances`).orderBy('createdAt','desc').limit(500).get();
  return snap.docs.map(d=>d.data() as any).filter(row=>!templateId||row.templateId===templateId).filter(row=>!row.assignedToUid||row.assignedToUid===actor.uid||hrRoles.has(actor.role));
}
