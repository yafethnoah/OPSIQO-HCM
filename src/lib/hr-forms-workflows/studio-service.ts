import { createHash, randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { HRFormField, HRFormTemplate } from '@/modules/hr-forms-workflows';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { generateAiAnswer } from '@/lib/ai-intelligence/provider';
import { getPlatformSettings } from '@/lib/platform-settings/service';
import { brandFromPlatformSettings } from '@/lib/documents/professional-document';
import { buildFillablePdf } from '@/lib/documents/fillable-pdf';
import { buildSimpleDocx } from './docx';
import { createFormTemplate, getFormTemplate } from './opsiqo-service';
import { applyTargetContext, packBlueprints, singleBlueprint, type Blueprint } from './professional-blueprints';
import { studioEnhanceSchema, studioGenerateSchema, type StudioGenerateInput, type StudioIntent } from './studio-schemas';

const now=()=>new Date().toISOString();
const hrRoles=new Set(['super_admin','org_admin','hr_admin','hr_partner']);

function requireStudio(actor:ActorContext){
  if(!actor.permissions.includes('workflow.manage')||!hrRoles.has(actor.role)) throw new ApiError(403,'HR Forms Studio management permission required.','forbidden');
}
function requireAi(actor:ActorContext){
  requireStudio(actor);
  if(!actor.permissions.includes('ai.use')) throw new ApiError(403,'Governed AI permission required.','forbidden');
}
function labelOf(d:any,fallback:string){
  return String(d?.displayName||d?.name||d?.title||d?.requisitionNumber||d?.code||fallback).trim();
}
function targetCollection(kind?:string){
  return kind==='requisition'?'requisitions':kind==='position'?'positions':kind==='worker'?'workers':null;
}
function cleanObject(value:any){
  const blocked=new Set(['password','token','secret','ssn','sin','bankAccount','accessToken','refreshToken']);
  const out:any={};
  if(!value||typeof value!=='object')return value;
  for(const [k,v] of Object.entries(value)){
    if(blocked.has(k)||/token|secret|password/i.test(k))continue;
    if(v===null||['string','number','boolean'].includes(typeof v))out[k]=v;
    else if(Array.isArray(v))out[k]=v.slice(0,20).map(x=>typeof x==='object'?cleanObject(x):x);
  }
  return out;
}

export async function studioOptions(actor:ActorContext){
  requireStudio(actor);
  const db=adminDb();
  const [orgSnap,requisitions,positions,workers,workflows]=await Promise.all([
    db.doc(`organizations/${actor.orgId}`).get(),
    actor.permissions.includes('recruiting.read')?db.collection(`organizations/${actor.orgId}/requisitions`).limit(100).get():Promise.resolve(null),
    db.collection(`organizations/${actor.orgId}/positions`).limit(150).get(),
    db.collection(`organizations/${actor.orgId}/workers`).limit(150).get(),
    db.collection(`organizations/${actor.orgId}/workflowDefinitions`).where('enabled','==',true).limit(100).get().catch(()=>null),
  ]);
  const opt=(snap:any,kind:string)=>snap?snap.docs.map((d:any)=>({id:d.id,kind,label:labelOf(d.data(),d.id),subtitle:String(d.data()?.status||d.data()?.departmentName||d.data()?.orgUnitName||'')})).sort((a:any,b:any)=>a.label.localeCompare(b.label)):[];
  return{
    organization:{id:actor.orgId,name:labelOf(orgSnap.data(),'Organization')},
    requisitions:opt(requisitions,'requisition'),
    positions:opt(positions,'position'),
    workers:opt(workers,'worker'),
    workflows:opt(workflows,'workflow'),
    intents:[
      {id:'recruitment',label:'Recruitment',description:'Hiring requisition, screening, interview, reference and offer forms.',targetKind:'requisition',pack:true},
      {id:'interview',label:'Interview',description:'Structured scored interview documents.',targetKind:'requisition',pack:true},
      {id:'onboarding',label:'Onboarding',description:'Complete new-hire information, access, equipment, orientation and probation forms.',targetKind:'worker',pack:true},
      {id:'employee_information',label:'Employee Information',description:'Employee and emergency information documents.',targetKind:'worker',pack:false},
      {id:'leave',label:'Leave / Time Away',description:'Professional leave and manager/HR review form.',targetKind:'worker',pack:false},
      {id:'performance',label:'Performance',description:'Performance review and development documentation.',targetKind:'worker',pack:false},
      {id:'employee_relations',label:'Employee Relations',description:'Restricted case intake and review documentation.',targetKind:'worker',pack:false},
      {id:'health_safety',label:'Health & Safety',description:'Incident/hazard reporting and corrective-action documentation.',targetKind:'worker',pack:false},
      {id:'accommodation',label:'Accommodation',description:'Functional limitation and accommodation planning form.',targetKind:'worker',pack:false},
      {id:'offboarding',label:'Offboarding',description:'Departure, handover, access, property, payroll and exit documents.',targetKind:'worker',pack:true},
      {id:'contractor',label:'Contractor',description:'External worker onboarding and compliance form.',targetKind:'worker',pack:false},
      {id:'custom',label:'Custom',description:'A complete professional HR form generated from the selected context.',targetKind:'position',pack:false},
    ]
  };
}

async function resolveTarget(actor:ActorContext,input:StudioGenerateInput){
  const collection=targetCollection(input.targetKind);
  if(!collection||!input.targetId)return{record:null,label:'',source:null};
  const snap=await adminDb().doc(`organizations/${actor.orgId}/${collection}/${input.targetId}`).get();
  if(!snap.exists)throw new ApiError(404,'Selected OPSIQO record was not found. Refresh the Studio choices and try again.','studio_target_not_found');
  const record=snap.data()||{};
  return{
    record,
    label:labelOf(record,input.targetId),
    source:{id:`studio:${input.targetKind}:${input.targetId}`,kind:'document',title:labelOf(record,input.targetId),summary:JSON.stringify(cleanObject(record)).slice(0,7000),source:`OPSIQO ${input.targetKind}`,asOf:String((record as any).updatedAt||(record as any).createdAt||now()),href:input.targetKind==='requisition'?'/recruiting':input.targetKind==='worker'?'/people':'/organization',dataQuality:'Authoritative organization-scoped OPSIQO record selected through Intelligent Form Studio.',sensitivity:'internal'}
  };
}

async function discoverSupportingEvidence(actor:ActorContext,input:StudioGenerateInput,target:any){
  const db=adminDb(),sources:any[]=[];
  const orgSnap=await db.doc(`organizations/${actor.orgId}`).get();
  if(orgSnap.exists)sources.push({id:`studio:organization:${actor.orgId}`,kind:'document',title:labelOf(orgSnap.data(),'Organization profile'),summary:JSON.stringify(cleanObject(orgSnap.data())).slice(0,5000),source:'OPSIQO organization profile',asOf:String(orgSnap.data()?.updatedAt||now()),href:'/settings',dataQuality:'Authoritative organization profile.',sensitivity:'internal'});
  if(target.source)sources.push(target.source);
  if(input.targetKind==='requisition'&&target.record?.positionId){
    const p=await db.doc(`organizations/${actor.orgId}/positions/${target.record.positionId}`).get();
    if(p.exists)sources.push({id:`studio:position:${p.id}`,kind:'document',title:labelOf(p.data(),'Position'),summary:JSON.stringify(cleanObject(p.data())).slice(0,5000),source:'OPSIQO position',asOf:String(p.data()?.updatedAt||now()),href:'/organization',dataQuality:'Authoritative position record.',sensitivity:'internal'});
  }
  try{
    const policies=await db.collection(`organizations/${actor.orgId}/policies`).limit(8).get();
    for(const d of policies.docs)sources.push({id:`studio:policy:${d.id}`,kind:'document',title:labelOf(d.data(),'Policy'),summary:JSON.stringify(cleanObject(d.data())).slice(0,3500),source:'OPSIQO policy library',asOf:String(d.data()?.updatedAt||d.data()?.createdAt||now()),href:'/compliance',dataQuality:'Organization policy record. Applicability still requires human review.',sensitivity:'internal'});
  }catch{}
  try{
    const workflows=await db.collection(`organizations/${actor.orgId}/workflowDefinitions`).where('enabled','==',true).limit(8).get();
    for(const d of workflows.docs)sources.push({id:`studio:workflow:${d.id}`,kind:'workflow',title:labelOf(d.data(),'Workflow'),summary:JSON.stringify(cleanObject(d.data())).slice(0,3000),source:'OPSIQO workflow',asOf:String(d.data()?.updatedAt||d.data()?.createdAt||now()),href:'/workflows',dataQuality:'Enabled governed workflow definition.',sensitivity:'internal'});
  }catch{}
  return sources.slice(0,18);
}

const intentNames:Record<StudioIntent,string>={
  recruitment:'recruitment',interview:'structured interview',onboarding:'employee onboarding',employee_information:'employee information',
  leave:'leave/time-away',performance:'performance review',employee_relations:'employee relations',health_safety:'health and safety',
  accommodation:'workplace accommodation',offboarding:'employee offboarding',contractor:'contractor/external worker onboarding',custom:'custom HR'
};

function buildAutomaticPrompt(input:StudioGenerateInput,organization:string,targetLabel:string,evidence:any[]){
  const pack=input.output==='pack';
  return [
    `Create ${pack?'a complete professional HR form pack':'a complete professional HR form'} for ${intentNames[input.intent]}.`,
    `Organization: ${organization}.`,
    targetLabel?`Selected OPSIQO context: ${targetLabel}.`:'No specific person/position/vacancy was selected; create a reusable organization-level template.',
    input.notes?`Additional user context: ${input.notes}`:'',
    '',
    'OPSIQO FORM QUALITY STANDARD:',
    '- Produce a finished HR document, not a list of database fields.',
    '- Use clear document title, control information, numbered/labelled sections, instructions, checkboxes/acknowledgements, tables or repeating rows where useful, signature/date blocks, HR-only controls where appropriate, and approval/completion sections.',
    '- The digital form, PDF and DOCX must express the same business document.',
    '- Use organization-specific facts only when supported by the supplied OPSIQO evidence.',
    '- Never invent organization policy, job requirements, approval authority, legal requirements or credentials.',
    '- If evidence is missing, identify the gap; do not fill it with an invented rule.',
    '- Accommodation content should focus on functional limitations/barriers and workplace supports; do not solicit diagnosis by default.',
    '- Recruiting/interview content must remain job-related. Never use protected traits or irrelevant personal characteristics for scoring.',
    '- Structured interview core scored questions, anchors and weights must be standardized and version controlled; candidate-specific clarification is unscored.',
    '- Consequential employment decisions remain with authorized humans.',
    '- Human review is mandatory before publication.',
    '',
    `Available governed evidence IDs: ${evidence.map(x=>x.id).join(', ')||'none'}.`,
  ].filter(Boolean).join('\n');
}

async function modelProfile(orgId:string):Promise<any>{
  const snap=await adminDb().collection(`organizations/${orgId}/aiModelProfiles`).where('status','==','active').orderBy('version','desc').limit(1).get();
  if(!snap.empty)return snap.docs[0]!.data();
  const provider=(process.env.OPSIQO_AI_PROVIDER||'demo') as 'demo'|'openai'|'gemini';
  const model=provider==='openai'?(process.env.OPENAI_MODEL||'gpt-5.6-terra'):provider==='gemini'?(process.env.GEMINI_MODEL||'gemini-3.5-flash'):'opsiqo-evidence-demo-v1';
  return{id:'studio-runtime',code:'HR_FORM_STUDIO',provider,model,purpose:'Governed professional HR form generation.',dataHandlingNote:'Organization-scoped evidence only.',version:1,status:'active',createdBy:'system',createdAt:now(),updatedAt:now()};
}

function contextDefaults(input:StudioGenerateInput,target:any){
  const r=target.record||{};
  return{
    targetLabel:target.label||'',
    positionTitle:String(r.title||r.positionTitle||r.roleTitle||r.requisitionTitle||''),
    department:String(r.departmentName||r.department||r.orgUnitName||''),
    manager:String(r.managerName||r.hiringManagerName||''),
  };
}
function uniqueCode(prefix:string,index:number){
  const stamp=new Date().toISOString().replace(/\D/g,'').slice(2,12);
  return `${prefix}-${stamp}-${String(index+1).padStart(2,'0')}`.slice(0,80);
}
function applyAiGuidanceToFields(fields:HRFormField[],answer:any):HRFormField[]{
  const clean=structuredClone(fields).filter((f:HRFormField)=>f.id!=='ai_review_guidance');
  const findings=(answer?.findings||[]).slice(0,4).map((x:any)=>String(x)).filter(Boolean);
  if(findings.length){
    clean.push({id:'ai_review_guidance',kind:'section',label:'OPSIQO Review Guidance',helpText:'AI-assisted, evidence-grounded guidance. Human review required.',children:findings.map((f:string,i:number)=>({id:`ai_guidance_${i+1}`,kind:'instruction',label:f}))});
  }
  return clean;
}
function attachAiGuidance(blueprint:Blueprint,answer:any):Blueprint{
  const copy=structuredClone(blueprint);
  copy.fields=applyAiGuidanceToFields(copy.fields,answer);
  return copy;
}
function safeEnhancementWarning(){
  return 'The professional forms were generated successfully. AI enhancement is temporarily unavailable, so OPSIQO used its governed HR blueprints and available organization records. You can retry AI enhancement later.';
}

export async function generateStudioArtifact(actor:ActorContext,raw:unknown){
  requireStudio(actor);
  const input=studioGenerateSchema.parse(raw);
  const target=await resolveTarget(actor,input);
  const evidence=await discoverSupportingEvidence(actor,input,target);
  const orgSnap=await adminDb().doc(`organizations/${actor.orgId}`).get();
  const organization=labelOf(orgSnap.data(),'Organization');
  const automaticPrompt=buildAutomaticPrompt(input,organization,target.label,evidence);
  const profile=await modelProfile(actor.orgId);
  let generated:Awaited<ReturnType<typeof generateAiAnswer>>|null=null;
  let enhancementStatus:'completed'|'unavailable'|'skipped'='skipped';
  let enhancementFailureCode:string|null=null;
  let enhancementWarning:string|null=null;
  if(actor.permissions.includes('ai.use')&&evidence.length){
    try{
      generated=await generateAiAnswer({
        question:automaticPrompt,
        systemInstruction:'You are OPSIQO Intelligent Form Studio. The application, not the end user, has composed this prompt from a selected HR process and governed organization context. Analyze the evidence to improve the professional HR forms supplied by OPSIQO deterministic blueprints. Never invent missing organization policy or legal rules. Identify useful organization-specific considerations and evidence gaps. Do not make consequential employment decisions.',
        evidence:evidence as any
      },profile);
      enhancementStatus='completed';
    }catch(error){
      enhancementStatus='unavailable';
      enhancementFailureCode=String((error as any)?.code||'ai_provider_unavailable').slice(0,120);
      enhancementWarning=safeEnhancementWarning();
      console.warn('OPSIQO_HR_FORMS_AI_ENHANCEMENT_UNAVAILABLE',JSON.stringify({orgId:actor.orgId,code:enhancementFailureCode,provider:profile.provider,model:profile.model}));
    }
  }else if(!actor.permissions.includes('ai.use')){
    enhancementStatus='skipped';
    enhancementWarning='The professional forms were generated without AI enhancement because this user does not have AI-use permission.';
  }else if(!evidence.length){
    enhancementStatus='skipped';
    enhancementWarning='The professional forms were generated from OPSIQO governed blueprints. No organization evidence was available for AI enhancement.';
  }

  const sourceBlueprints=input.output==='pack'?packBlueprints(input.intent):[singleBlueprint(input.intent)];
  const defaults=contextDefaults(input,target);
  const blueprints=sourceBlueprints.map(b=>attachAiGuidance(applyTargetContext(b,defaults),generated?.answer));
  const templates:HRFormTemplate[]=[];
  for(let i=0;i<blueprints.length;i++){
    const b=blueprints[i]!;
    const created=await createFormTemplate(actor,{
      formCode:uniqueCode(b.codePrefix,i),title:b.title,description:`Professional OPSIQO ${intentNames[input.intent]} document generated by Intelligent Form Studio. Review before approval and publication.`,
      category:b.category,subcategory:b.subcategory,sensitivity:b.sensitivity,tags:['intelligent-form-studio','professional-form',input.output==='pack'?'form-pack':'single-form'],fields:b.fields
    },{
      aiGenerated:Boolean(generated),
      sourceDocumentIds:evidence.map(x=>x.id),
      aiGenerationMetadata:{
        studioVersion:'H51.79',promptWrittenBy:'OPSIQO',automaticPrompt,automaticPromptHash:createHash('sha256').update(automaticPrompt).digest('hex'),
        provider:generated?.provider||'deterministic',model:generated?.model||'professional-blueprint-v1',aiEnhancementStatus:enhancementStatus,aiEnhancementFailureCode:enhancementFailureCode,
        citations:generated?.answer?.citations||[],confidence:generated?.answer?.confidence??null,
        evidenceCompleteness:generated?.answer?.evidenceCompleteness??null,limitations:generated?.answer?.limitations||[],
        intent:input.intent,output:input.output,targetKind:input.targetKind||null,targetId:input.targetId||null
      }
    });
    templates.push(created);
  }

  let pack:any=null;
  if(templates.length>1){
    const id=randomUUID(),timestamp=now();
    pack={id,organizationId:actor.orgId,name:`${intentNames[input.intent][0]!.toUpperCase()+intentNames[input.intent].slice(1)} Form Pack`,intent:input.intent,status:'draft',templateIds:templates.map(x=>x.id),createdBy:actor.uid,createdAt:timestamp,updatedAt:timestamp,sourceIds:evidence.map(x=>x.id)};
    const audit=buildAudit(actor,{action:'hr_forms.pack.create',entityType:'hrFormPack',entityId:id,after:{name:pack.name,intent:input.intent,templateIds:pack.templateIds}});
    const db=adminDb(),b=db.batch();b.create(db.doc(`organizations/${actor.orgId}/hrFormPacks/${id}`),pack);b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();
  }

  const missing:string[]=[];
  if((input.intent==='recruitment'||input.intent==='interview')&&!input.targetId)missing.push('No vacancy/requisition selected; role-specific details should be reviewed before publication.');
  if((input.intent==='onboarding'||input.intent==='offboarding'||input.intent==='performance'||input.intent==='employee_information')&&!input.targetId)missing.push('No employee selected; reusable templates were generated without employee prefill.');

  return{
    templates,pack,promptWrittenBy:'OPSIQO',promptPreview:automaticPrompt.slice(0,900),
    contextUsed:evidence.map(x=>({id:x.id,title:x.title,source:x.source})),
    missingOrganizationalSources:missing,
    warnings:[...(generated?.answer?.limitations||[]),...(enhancementWarning?[enhancementWarning]:[])],
    aiEnhancement:{status:enhancementStatus,canRetry:enhancementStatus==='unavailable'&&actor.permissions.includes('ai.use'),warning:enhancementWarning,provider:generated?.provider||profile.provider,model:generated?.model||profile.model},
    requiresHumanReview:true
  };
}


export async function enhanceStudioArtifacts(actor:ActorContext,raw:unknown){
  requireAi(actor);
  const input=studioEnhanceSchema.parse(raw);
  const target=await resolveTarget(actor,input);
  const evidence=await discoverSupportingEvidence(actor,input,target);
  const orgSnap=await adminDb().doc(`organizations/${actor.orgId}`).get();
  const organization=labelOf(orgSnap.data(),'Organization');
  const automaticPrompt=buildAutomaticPrompt(input,organization,target.label,evidence);
  const profile=await modelProfile(actor.orgId);
  if(!evidence.length)return{status:'unavailable',canRetry:true,warning:'No organization evidence is currently available for AI enhancement.',templates:[]};
  let generated:Awaited<ReturnType<typeof generateAiAnswer>>;
  try{
    generated=await generateAiAnswer({
      question:automaticPrompt,
      systemInstruction:'You are OPSIQO Intelligent Form Studio. Enhance only the existing governed professional forms using supplied organization evidence. Never invent policy, legal requirements or consequential employment decisions.',
      evidence:evidence as any
    },profile);
  }catch(error){
    const code=String((error as any)?.code||'ai_provider_unavailable').slice(0,120);
    console.warn('OPSIQO_HR_FORMS_AI_RETRY_UNAVAILABLE',JSON.stringify({orgId:actor.orgId,code,provider:profile.provider,model:profile.model}));
    return{status:'unavailable',canRetry:true,warning:safeEnhancementWarning(),templates:[]};
  }
  const db=adminDb(),timestamp=now(),updated:HRFormTemplate[]=[];
  const batch=db.batch();
  for(const id of input.templateIds){
    const ref=db.doc(`organizations/${actor.orgId}/hrFormTemplates/${id}`);
    const snap=await ref.get();
    if(!snap.exists)continue;
    const current=snap.data() as HRFormTemplate;
    if(!['draft','under_review'].includes(current.status))continue;
    const next:HRFormTemplate={...current,fields:applyAiGuidanceToFields(current.fields,generated.answer),aiGenerated:true,updatedBy:actor.uid,updatedAt:timestamp,aiGenerationMetadata:{...(current.aiGenerationMetadata||{}),studioVersion:'H51.79',promptWrittenBy:'OPSIQO',automaticPrompt,automaticPromptHash:createHash('sha256').update(automaticPrompt).digest('hex'),provider:generated.provider,model:generated.model,citations:generated.answer.citations,confidence:generated.answer.confidence,evidenceCompleteness:generated.answer.evidenceCompleteness,limitations:generated.answer.limitations,aiEnhancementStatus:'completed',aiEnhancementFailureCode:null}};
    const audit=buildAudit(actor,{action:'hr_forms.template.ai_enhance',entityType:'hrFormTemplate',entityId:id,before:{version:current.version,aiGenerated:current.aiGenerated},after:{version:next.version,aiGenerated:true,provider:generated.provider,model:generated.model}});
    batch.set(ref,next);
    batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
    updated.push(next);
  }
  if(updated.length)await batch.commit();
  return{status:'completed',canRetry:false,warning:null,templates:updated,provider:generated.provider,model:generated.model};
}

function docLines(template:HRFormTemplate){
  const lines:Array<{label?:string;value:string}>=[];
  const walk=(fields:HRFormField[],depth=0)=>{
    for(const f of fields){
      if(f.kind==='section'||f.kind==='heading'){
        lines.push({value:`${depth?'  ':''}${f.label.toUpperCase()}`});
        if(f.helpText)lines.push({value:f.helpText});
      }else if(f.kind==='instruction'){
        lines.push({value:f.label});
        if(f.helpText)lines.push({value:f.helpText});
      }else if(f.kind==='acknowledgement'||f.kind==='checkbox'||f.kind==='yes_no'){
        lines.push({value:`☐ ${f.label}${f.helpText?` — ${f.helpText}`:''}`});
      }else if(f.kind==='repeating_rows'||f.kind==='table'){
        lines.push({label:f.label,value:'____________________________________________________________'});
        lines.push({value:'____________________________________________________________'});
        lines.push({value:'____________________________________________________________'});
      }else if(f.kind==='signature'||f.kind==='initials'){
        lines.push({label:f.label,value:'____________________________    Date: ____________'});
      }else if(f.kind==='scale_1_5'){
        lines.push({label:f.label,value:'☐ 1   ☐ 2   ☐ 3   ☐ 4   ☐ 5'});
        if(f.scoring?.anchors)lines.push({value:Object.entries(f.scoring.anchors).map(([k,v])=>`${k}: ${v}`).join(' | ')});
      }else{
        lines.push({label:f.label,value:String(f.defaultValue||'____________________________________________')});
        if(f.helpText)lines.push({value:f.helpText});
      }
      if(f.children?.length)walk(f.children,depth+1);
    }
  };
  walk(template.fields);
  return lines;
}

export async function exportBlankTemplate(actor:ActorContext,templateId:string,format:'pdf'|'docx'){
  requireStudio(actor);
  const template=await getFormTemplate(actor,templateId);
  const settings=await getPlatformSettings(actor),brand=brandFromPlatformSettings(settings as any,'Organization');
  const control=[`Form code: ${template.formCode}`,`Version: ${template.version}`,`Status: ${template.status}`,`Sensitivity: ${template.sensitivity}`];
  const lines:Array<{label?:string;value:string}>=[...control.map(v=>({value:v})),{value:'Human review required before use or publication.'},...docLines(template)];
  const safe=template.title.replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,80)||'HR_Form';
  if(format==='docx')return{bytes:buildSimpleDocx({title:template.title,lines}),contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',fileName:`${safe}_v${template.version}.docx`};
  const content=[`# ${template.title}`,...lines.map(x=>x.label?`${x.label}: ${x.value}`:x.value)].join('\n');
  return{bytes:buildFillablePdf({title:template.title,content,brand,documentReference:`${template.formCode}-v${template.version}`}),contentType:'application/pdf',fileName:`${safe}_v${template.version}.pdf`};
}

export async function exportFormPack(actor:ActorContext,packId:string,format:'pdf'|'docx'){
  requireStudio(actor);
  const db=adminDb(),packSnap=await db.doc(`organizations/${actor.orgId}/hrFormPacks/${packId}`).get();
  if(!packSnap.exists)throw new ApiError(404,'Form pack not found.','hr_form_pack_not_found');
  const pack:any=packSnap.data(),ids:Array<string>=Array.isArray(pack.templateIds)?pack.templateIds:[];
  const templates:HRFormTemplate[]=[];
  for(const id of ids){
    const snap=await db.doc(`organizations/${actor.orgId}/hrFormTemplates/${id}`).get();
    if(snap.exists)templates.push(snap.data() as HRFormTemplate);
  }
  if(!templates.length)throw new ApiError(409,'Form pack has no available templates.','hr_form_pack_empty');
  const lines:Array<{label?:string;value:string}>=[];
  for(const template of templates){
    lines.push({value:''},{value:`===== ${template.title.toUpperCase()} =====`},{value:`Form: ${template.formCode} | Version: ${template.version} | Status: ${template.status}`},...docLines(template));
  }
  const title=String(pack.name||'OPSIQO HR Form Pack');
  const safe=title.replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,90)||'OPSIQO_HR_Form_Pack';
  if(format==='docx')return{bytes:buildSimpleDocx({title,lines}),contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',fileName:`${safe}.docx`};
  const settings=await getPlatformSettings(actor),brand=brandFromPlatformSettings(settings as any,'Organization');
  const content=[`# ${title}`,...lines.map(x=>x.label?`${x.label}: ${x.value}`:x.value)].join('\n');
  return{bytes:buildFillablePdf({title,content,brand,documentReference:packId}),contentType:'application/pdf',fileName:`${safe}.pdf`};
}
