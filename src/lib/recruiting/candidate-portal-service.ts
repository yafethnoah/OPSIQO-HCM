import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {FieldValue,type DocumentReference} from 'firebase-admin/firestore';
import {z} from 'zod';
import type {ActorContext} from '@/domain/security';
import type {Application,Candidate,Requisition} from '@/domain/recruiting';
import type {CandidateApplicationDocument,CandidateApplicationLink,RecruitingScreeningQuestion} from '@/domain/candidate-portal';
import {adminBucket,adminDb} from '@/lib/firebase/admin';
import {ApiError} from '@/lib/http/errors';
import {buildAudit} from '@/lib/audit/service';
import {buildDomainEvent} from '@/lib/events/build';
import {extractRecruitingDocumentFile,parseResumeFile} from './ats-service';
import {autoScoreStoredApplication,recordAtsAnalysisFailure} from './candidate-fit-service';

const now=()=>new Date().toISOString(),sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const hrRoles=new Set(['super_admin','org_admin','hr_admin','hr_partner']);
const sensitive=/\b(?:age|date\s+of\s+birth|gender|male|female|race|racial|ethnicity|ethnic|religion|religious|disability|disabled|medical\s+history|marital|married|pregnan(?:t|cy)|sexual\s+orientation|nationality|citizenship|family\s+status)\b/i;
const q=z.object({id:z.string().min(1).max(80),label:z.string().min(3).max(600),type:z.enum(['yes_no','text','number','select']),required:z.boolean().default(false),options:z.array(z.string().min(1).max(120)).max(20).default([])});
const create=z.object({requisitionId:z.string().min(1),coverLetterRequired:z.boolean().default(false),allowTalentPoolConsent:z.boolean().default(true),closingAt:z.string().datetime().optional(),screeningQuestions:z.array(q).max(20).default([])});
const patch=z.object({status:z.enum(['active','paused','closed']).optional(),coverLetterRequired:z.boolean().optional(),allowTalentPoolConsent:z.boolean().optional(),closingAt:z.string().datetime().nullable().optional(),screeningQuestions:z.array(q).max(20).optional()});
const customResumeSection=z.object({title:z.string().trim().min(1).max(120),content:z.string().max(20000)});
const submission=z.object({firstName:z.string().trim().min(1).max(100),lastName:z.string().trim().min(1).max(100),email:z.string().email(),phone:z.string().max(50).optional(),location:z.string().max(160).optional(),linkedinUrl:z.string().max(500).optional(),portfolioUrl:z.string().max(500).optional(),githubUrl:z.string().max(500).optional(),socialMediaUrl:z.string().max(500).optional(),headline:z.string().max(240).optional(),summary:z.string().max(5000).optional(),professionalExperience:z.string().max(30000).optional(),skills:z.array(z.string().max(160)).max(150).default([]),certifications:z.array(z.string().max(240)).max(80).default([]),education:z.array(z.string().max(500)).max(80).default([]),languages:z.string().max(10000).optional(),projects:z.string().max(20000).optional(),volunteerExperience:z.string().max(20000).optional(),awards:z.string().max(10000).optional(),publications:z.string().max(15000).optional(),additionalInformation:z.string().max(20000).optional(),customResumeSections:z.array(customResumeSection).max(20).default([]),yearsOfExperience:z.number().min(0).max(80).optional(),screeningAnswers:z.record(z.string(),z.union([z.string(),z.number(),z.boolean()])).default({}),coverLetterText:z.string().max(100000).optional(),candidateStatement:z.string().max(5000).optional(),consent:z.literal(true),accuracyConfirmed:z.literal(true),talentPoolConsent:z.boolean().default(false)});
const draft=submission.omit({consent:true,accuracyConfirmed:true}).partial().extend({screeningAnswers:z.record(z.string(),z.union([z.string(),z.number(),z.boolean()])).default({})});
function validateQuestions(a:RecruitingScreeningQuestion[]){for(const x of a){if(sensitive.test(x.label))throw new ApiError(400,`Screening question "${x.label}" references a protected or sensitive trait and cannot be published.`,'unsafe_screening_question');if(x.type==='select'&&!(x.options||[]).length)throw new ApiError(400,`Screening question "${x.label}" requires options.`,'invalid_screening_question')}}
function safeName(n:string){return n.replace(/[^A-Za-z0-9._ -]/g,'_').replace(/\s+/g,' ').trim().slice(-180)||'document'}
function url(v:unknown){const s=String(v||'').trim();if(!s)return undefined;try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol))throw 0;return u.toString().slice(0,500)}catch{throw new ApiError(400,'Professional/social links must be valid HTTP or HTTPS URLs.','invalid_professional_url')}}
function displayUrl(v:unknown){const s=String(v||'').trim();if(!s)return undefined;if(s.startsWith('/'))return s.slice(0,500);try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.toString().slice(0,500):undefined}catch{return undefined}}

const EDITABLE_SECTION_HEADINGS=[
 'professional summary','summary','profile','professional profile',
 'professional experience','work experience','experience','employment history','career history',
 'skills','technical skills','core competencies','competencies','expertise',
 'education','academic background','certifications','certificates','licences','licenses',
 'languages','language skills','projects','selected projects','key projects',
 'volunteer experience','volunteering','community experience','community involvement',
 'awards','honours','honors','achievements','publications','presentations',
 'additional information','professional affiliations','memberships','interests'
];
const cleanHeading=(v:string)=>v.toLowerCase().replace(/[:|]+$/,'').replace(/\s+/g,' ').trim();
function editableSectionText(source:string,aliases:string[]){
 const lines=String(source||'').replace(/\r\n/g,'\n').split('\n');
 const aliasSet=new Set(aliases.map(cleanHeading));
 let start=-1;
 for(let i=0;i<lines.length;i++){if(aliasSet.has(cleanHeading(lines[i]!))){start=i+1;break}}
 if(start<0)return '';
 const out:string[]=[];
 for(let i=start;i<lines.length;i++){const raw=lines[i]!,h=cleanHeading(raw);if(EDITABLE_SECTION_HEADINGS.includes(h))break;out.push(raw)}
 return out.join('\n').trim().slice(0,30000);
}
function editableResumeFromProfile(profile:any){
 const source=String(profile?.sourceText||'');
 const experience=editableSectionText(source,['Professional Experience','Work Experience','Experience','Employment History','Career History']);
 const fallbackExperience=(profile?.jobTitles||[]).map((title:string,index:number)=>[title,profile?.employers?.[index]].filter(Boolean).join(' · ')).join('\n');
 return{
  professionalExperience:(experience||fallbackExperience).slice(0,30000),
  languages:editableSectionText(source,['Languages','Language Skills']).slice(0,10000),
  projects:editableSectionText(source,['Projects','Selected Projects','Key Projects']).slice(0,20000),
  volunteerExperience:editableSectionText(source,['Volunteer Experience','Volunteering','Community Experience','Community Involvement']).slice(0,20000),
  awards:editableSectionText(source,['Awards','Honours','Honors','Achievements']).slice(0,10000),
  publications:editableSectionText(source,['Publications','Presentations']).slice(0,15000),
  additionalInformation:editableSectionText(source,['Additional Information','Professional Affiliations','Memberships','Interests']).slice(0,20000),
 };
}
function actor(orgId:string,linkId:string):ActorContext{return{uid:`system:candidate-portal:${linkId}`,orgId,role:'employee',permissions:['ai.use'],guest:true}}
async function reqScope(a:ActorContext,id:string){const s=await adminDb().doc(`organizations/${a.orgId}/requisitions/${id}`).get();if(!s.exists)throw new ApiError(404,'Requisition not found.','requisition_not_found');const r=s.data() as Requisition;if(!hrRoles.has(a.role)&&r.hiringManagerWorkerId!==a.workerId)throw new ApiError(403,'Requisition is outside your recruiting scope.','recruiting_scope');return r}

function linkExpired(link:CandidateApplicationLink){return Boolean(link.closingAt&&Date.parse(link.closingAt)<=Date.now())}
function sameQuestions(a:RecruitingScreeningQuestion[]=[],b:RecruitingScreeningQuestion[]=[]){return JSON.stringify(a||[])===JSON.stringify(b||[])}
function sameLinkConfig(link:CandidateApplicationLink,input:z.infer<typeof create>){return link.coverLetterRequired===input.coverLetterRequired&&link.allowTalentPoolConsent===input.allowTalentPoolConsent&&String(link.closingAt||'')===String(input.closingAt||'')&&sameQuestions(link.screeningQuestions||[],input.screeningQuestions||[])}

export async function createCandidateApplicationLink(a:ActorContext,raw:unknown){
 const i=create.parse(raw),r=await reqScope(a,i.requisitionId);if(r.status!=='open')throw new ApiError(409,'Public application links require an open requisition.','requisition_not_open');validateQuestions(i.screeningQuestions);
 if(i.closingAt&&Date.parse(i.closingAt)<=Date.now())throw new ApiError(400,'Closing date/time must be in the future.','application_link_deadline_invalid');
 const db=adminDb(),existingSnap=await db.collection(`organizations/${a.orgId}/candidateApplicationLinks`).where('requisitionId','==',r.id).limit(50).get(),active=existingSnap.docs.map(d=>d.data() as CandidateApplicationLink).filter(l=>l.status==='active'&&!linkExpired(l));
 const exact=active.find(l=>sameLinkConfig(l,i));if(exact)return{...exact,reused:true};
 if(active.length)throw new ApiError(409,'An active application link already exists with different settings. Pause or close it, or use the existing link.','application_link_configuration_conflict');
 const id=randomUUID(),publicToken=randomBytes(24).toString('base64url'),tokenHash=sha(publicToken),t=now(),link:CandidateApplicationLink={id,requisitionId:r.id,publicToken,tokenHash,status:'active',coverLetterRequired:i.coverLetterRequired,allowTalentPoolConsent:i.allowTalentPoolConsent,screeningQuestions:i.screeningQuestions,closingAt:i.closingAt,createdBy:a.uid,createdAt:t,updatedAt:t,applicationsCount:0};
 const audit=buildAudit(a,{action:'recruiting.application_link.create',entityType:'candidateApplicationLink',entityId:id,after:{...link,publicToken:'[redacted-share-token]'}});
 const b=db.batch();b.create(db.doc(`organizations/${a.orgId}/candidateApplicationLinks/${id}`),link);b.create(db.doc(`publicRecruitingLinkIndex/${tokenHash}`),{orgId:a.orgId,linkId:id,requisitionId:r.id,status:'active',createdAt:t,updatedAt:t});b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return{...link,reused:false};
}
export async function listCandidateApplicationLinks(a:ActorContext){
 const s=await adminDb().collection(`organizations/${a.orgId}/candidateApplicationLinks`).orderBy('createdAt','desc').limit(200).get(),all=s.docs.map(d=>d.data() as CandidateApplicationLink);if(hrRoles.has(a.role))return all;const out=[];for(const l of all)if(await reqScope(a,l.requisitionId).catch(()=>null))out.push(l);return out;
}
export async function updateCandidateApplicationLink(a:ActorContext,id:string,raw:unknown){
 const p=patch.parse(raw);if(p.screeningQuestions)validateQuestions(p.screeningQuestions);const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/candidateApplicationLinks/${id}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Application link not found.','application_link_not_found');const c=s.data() as CandidateApplicationLink,r=await reqScope(a,c.requisitionId);if(p.status==='active'&&r.status!=='open')throw new ApiError(409,'Cannot activate a link for a non-open requisition.','requisition_not_open');
 if(p.closingAt&&Date.parse(p.closingAt)<=Date.now())throw new ApiError(400,'Closing date/time must be in the future.','application_link_deadline_invalid');const effectiveClosing=p.closingAt===null?undefined:p.closingAt??c.closingAt;if(p.status==='active'&&effectiveClosing&&Date.parse(effectiveClosing)<=Date.now())throw new ApiError(409,'Cannot activate an expired application link.','application_link_expired');
 const t=now(),n={...c,...p,closingAt:effectiveClosing,updatedAt:t} as CandidateApplicationLink,audit=buildAudit(a,{action:'recruiting.application_link.update',entityType:'candidateApplicationLink',entityId:id,before:{...c,publicToken:'[redacted-share-token]'},after:{...n,publicToken:'[redacted-share-token]'}}),b=db.batch();
 b.set(ref,n);b.set(db.doc(`publicRecruitingLinkIndex/${c.tokenHash}`),{status:n.status,updatedAt:t},{merge:true});b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return n;
}
export async function reconcileCandidateApplicationLinks(a:ActorContext){
 const db=adminDb(),snap=await db.collection(`organizations/${a.orgId}/candidateApplicationLinks`).orderBy('createdAt','desc').limit(500).get(),links=snap.docs.map(d=>d.data() as CandidateApplicationLink);
 let closed=0,expiredClosed=0,duplicateGroups=0;const kept:{requisitionId:string;linkId:string}[]=[];
 async function closeLink(link:CandidateApplicationLink,action:string,after:Record<string,unknown>){const t=now(),audit=buildAudit(a,{action,entityType:'candidateApplicationLink',entityId:link.id,before:{status:link.status,requisitionId:link.requisitionId,closingAt:link.closingAt},after}),b=db.batch();b.set(db.doc(`organizations/${a.orgId}/candidateApplicationLinks/${link.id}`),{status:'closed',updatedAt:t},{merge:true});b.set(db.doc(`publicRecruitingLinkIndex/${link.tokenHash}`),{status:'closed',updatedAt:t},{merge:true});b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit()}
 for(const link of links.filter(l=>l.status==='active'&&linkExpired(l))){await closeLink(link,'recruiting.application_link.reconcile_expired',{status:'closed',reason:'expired'});expiredClosed++}
 const groups=new Map<string,CandidateApplicationLink[]>();for(const link of links){if(link.status!=='active'||linkExpired(link))continue;const arr=groups.get(link.requisitionId)||[];arr.push(link);groups.set(link.requisitionId,arr)}
 for(const [requisitionId,items] of groups){if(items.length<2)continue;duplicateGroups++;items.sort((x,y)=>(Number(y.applicationsCount||0)-Number(x.applicationsCount||0))||String(y.lastApplicationAt||'').localeCompare(String(x.lastApplicationAt||''))||y.createdAt.localeCompare(x.createdAt));const keep=items[0]!;kept.push({requisitionId,linkId:keep.id});for(const duplicate of items.slice(1)){await closeLink(duplicate,'recruiting.application_link.reconcile_duplicate',{status:'closed',keptLinkId:keep.id});closed++}}
 return{duplicateGroups,closed,expiredClosed,kept};
}

async function resolve(token:string){
 const x=String(token||'').trim();if(x.length<20)throw new ApiError(404,'Application link not found.','application_link_not_found');const h=sha(x),db=adminDb(),idx=await db.doc(`publicRecruitingLinkIndex/${h}`).get();if(!idx.exists)throw new ApiError(404,'Application link not found.','application_link_not_found');const d=idx.data() as any;
 const[l,r,o]=await Promise.all([db.doc(`organizations/${d.orgId}/candidateApplicationLinks/${d.linkId}`).get(),db.doc(`organizations/${d.orgId}/requisitions/${d.requisitionId}`).get(),db.doc(`organizations/${d.orgId}`).get()]);if(!l.exists||!r.exists)throw new ApiError(404,'Application link not found.','application_link_not_found');
 const link=l.data() as CandidateApplicationLink,req=r.data() as Requisition;if(link.tokenHash!==h)throw new ApiError(404,'Application link not found.','application_link_not_found');if(link.status!=='active')throw new ApiError(410,'This application link is not accepting submissions.','application_link_inactive');if(req.status!=='open')throw new ApiError(410,'This position is no longer accepting applications.','requisition_not_open');if(link.closingAt&&Date.parse(link.closingAt)<=Date.now())throw new ApiError(410,'The application deadline has passed.','application_link_expired');
 return{orgId:d.orgId as string,link,req,org:o.exists?o.data() as any:{}};
}
export async function publicCandidateApplicationContext(token:string){const x=await resolve(token);return{organization:{name:String(x.org.displayName||x.org.name||'Organization').slice(0,200),logoUrl:displayUrl(x.org.logoUrl||x.org.logo),website:displayUrl(x.org.website)},requisition:{id:x.req.id,requisitionNumber:x.req.requisitionNumber,title:x.req.title,location:x.req.location,employmentType:x.req.employmentType,description:x.req.description||'',requirements:x.req.requirements||[]},application:{coverLetterRequired:x.link.coverLetterRequired,allowTalentPoolConsent:x.link.allowTalentPoolConsent,screeningQuestions:x.link.screeningQuestions||[],closingAt:x.link.closingAt}}}
export async function enforceCandidatePortalRateLimit(token:string,request:Request,action:'context'|'parse'|'draft'|'submit'){
 const p={context:[120,600000],parse:[12,600000],draft:[30,600000],submit:[6,3600000]}[action],ip=String(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0],bucket=Math.floor(Date.now()/p[1]),id=sha(`${token}|${ip}|${request.headers.get('user-agent')||''}|${action}|${bucket}`),ref=adminDb().doc(`publicRecruitingRateLimits/${id}`);
 await adminDb().runTransaction(async tx=>{const s=await tx.get(ref),count=Number(s.data()?.count||0);if(count>=p[0])throw new ApiError(429,'Too many application requests. Please wait and try again.','candidate_portal_rate_limited');tx.set(ref,{count:count+1,action,bucket,expiresAt:new Date((bucket+2)*p[1]),updatedAt:now()},{merge:true})});
}
export async function parsePublicCandidateResume(token:string,form:FormData){const x=await resolve(token),file=form.get('file');if(!(file instanceof File))throw new ApiError(400,'Resume file is required.','resume_required');const p=await parseResumeFile(actor(x.orgId,x.link.id),file),editableResume=editableResumeFromProfile(p.profile),{sourceText:_,...profile}=p.profile;return{profile,editableResume,sourceMeta:p.sourceMeta,parser:p.profile.parser,documentClassification:p.documentClassification,note:'Resume document type validated and parsed only to prefill this application. Review and correct every section before submitting.'}}
function answers(link:CandidateApplicationLink,a:Record<string,string|number|boolean>){for(const q of link.screeningQuestions||[]){const v=a[q.id],missing=v===undefined||v===null||String(v).trim()==='';if(q.required&&missing)throw new ApiError(400,`Please answer: ${q.label}`,'screening_answer_required');if(q.type==='select'&&!missing&&!(q.options||[]).includes(String(v)))throw new ApiError(400,`Invalid answer: ${q.label}`,'invalid_screening_answer')}}
async function save(path:string,bytes:Buffer,type:string){await adminBucket().file(path).save(bytes,{resumable:false,metadata:{contentType:type,cacheControl:'private, no-store, max-age=0'}})}
export async function savePublicApplicationDraft(token:string,raw:unknown,draftToken?:string){
 const x=await resolve(token),data=draft.parse(raw),t=now(),plain=String(draftToken||'').trim()||randomBytes(24).toString('base64url'),ref=adminDb().doc(`publicRecruitingDrafts/${sha(plain)}`),s=await ref.get();if(s.exists&&(s.data()?.orgId!==x.orgId||s.data()?.linkId!==x.link.id))throw new ApiError(403,'Draft token is invalid.','invalid_draft_token');
 await ref.set({orgId:x.orgId,linkId:x.link.id,requisitionId:x.req.id,data,createdAt:s.data()?.createdAt||t,updatedAt:t,expiresAt:new Date(Date.now()+14*86400000)},{merge:true});return{draftToken:plain,expiresInDays:14};
}
export async function loadPublicApplicationDraft(token:string,draftToken:string){const x=await resolve(token),s=await adminDb().doc(`publicRecruitingDrafts/${sha(String(draftToken||''))}`).get();if(!s.exists||s.data()?.orgId!==x.orgId||s.data()?.linkId!==x.link.id)throw new ApiError(404,'Saved application draft not found.','draft_not_found');const e=s.data()?.expiresAt?.toDate?.();if(e&&e.getTime()<=Date.now())throw new ApiError(410,'Saved application draft has expired.','draft_expired');return{data:s.data()?.data}}
export async function submitPublicCandidateApplication(token:string,form:FormData){
 const x=await resolve(token);let raw:any;try{raw=JSON.parse(String(form.get('application')||''))}catch{throw new ApiError(400,'Application information could not be read.','invalid_application_payload')}const i=submission.parse(raw);answers(x.link,i.screeningAnswers);
 const rf=form.get('resume');if(!(rf instanceof File)||rf.size<=0)throw new ApiError(400,'Resume file is required.','resume_required');
 const a=actor(x.orgId,x.link.id),parsed=await parseResumeFile(a,rf),rd=await extractRecruitingDocumentFile(rf);if(parsed.sourceMeta.sha256!==rd.sourceMeta.sha256)throw new ApiError(409,'Resume changed during processing.','resume_changed_during_processing');
 const cf=form.get('coverLetter'),coverText=String(i.coverLetterText||'').trim(),cd=cf instanceof File&&cf.size>0?await extractRecruitingDocumentFile(cf):null;
 if(cd?.documentClassification.kind==='resume'&&cd.documentClassification.confidence>=0.85)throw new ApiError(422,'This file looks like a resume, not a cover letter. Attach the cover letter in the Cover letter field.','cover_letter_document_mismatch');
 if(x.link.coverLetterRequired&&!cd&&!coverText)throw new ApiError(400,'A cover letter is required.','cover_letter_required');
 const linkedinUrl=url(i.linkedinUrl),portfolioUrl=url(i.portfolioUrl),githubUrl=url(i.githubUrl),socialMediaUrl=url(i.socialMediaUrl),professionalLinks=[linkedinUrl&&{type:'linkedin',url:linkedinUrl},portfolioUrl&&{type:'portfolio',url:portfolioUrl},githubUrl&&{type:'github',url:githubUrl},socialMediaUrl&&{type:'social',url:socialMediaUrl}].filter(Boolean) as {type:string;url:string}[];
 const submissionId=randomUUID(),resumeDocumentId=randomUUID(),coverDocumentId=cd||coverText?randomUUID():undefined,newCandidateId=randomUUID(),newApplicationId=randomUUID(),t=now(),resumePath=`candidate-applications/${x.orgId}/${x.req.id}/${submissionId}/${resumeDocumentId}_${safeName(rd.sourceMeta.fileName)}`;
 let coverBytes:Buffer|undefined,coverType:string|undefined,coverName:string|undefined,coverSha:string|undefined,coverPath:string|undefined,coverExtract=coverText;
 if(cd){coverBytes=cd.bytes;coverType=cd.sourceMeta.contentType;coverName=cd.sourceMeta.fileName;coverSha=cd.sourceMeta.sha256;if(!coverExtract)coverExtract=cd.text.trim().slice(0,100000)}else if(coverText){coverBytes=Buffer.from(coverText);coverType='text/plain';coverName='Cover_Letter.txt';coverSha=sha(coverBytes)}
 if(coverDocumentId&&coverBytes&&coverName)coverPath=`candidate-applications/${x.orgId}/${x.req.id}/${submissionId}/${coverDocumentId}_${safeName(coverName)}`;
 const saved:string[]=[];
 try{
  await save(resumePath,rd.bytes,rd.sourceMeta.contentType);saved.push(resumePath);
  if(coverPath&&coverBytes&&coverType){await save(coverPath,coverBytes,coverType);saved.push(coverPath)}
  const db=adminDb(),email=i.email.trim().toLowerCase(),emailKey=encodeURIComponent(email);
  let result!:{applicationId:string;candidateId:string;deduplicated:boolean;submissionVersion:number};

  await db.runTransaction(async tx=>{
   // Firestore transactions require all reads before any writes.
   const eiRef=db.doc(`organizations/${x.orgId}/candidateEmailIndex/${emailKey}`),ei=await tx.get(eiRef);
   let candidateId=String(ei.data()?.candidateId||'').trim(),candidateRef:DocumentReference,existingCandidate:Candidate|undefined;
   if(candidateId){
    candidateRef=db.doc(`organizations/${x.orgId}/candidates/${candidateId}`);
    const candidateSnap=await tx.get(candidateRef);
    if(!candidateSnap.exists)throw new ApiError(409,'Candidate email index is inconsistent.','candidate_index_inconsistent');
    existingCandidate=candidateSnap.data() as Candidate;
   }else{
    candidateId=newCandidateId;
    candidateRef=db.doc(`organizations/${x.orgId}/candidates/${candidateId}`);
   }

   const aiRef=db.doc(`organizations/${x.orgId}/candidateApplicationIndex/${encodeURIComponent(`${candidateId}_${x.req.id}`)}`),ai=await tx.get(aiRef);
   let applicationId:string,version:number,deduplicated=false,appRef:DocumentReference,existingApplication:Application|undefined;
   if(ai.exists){
    applicationId=String(ai.data()?.applicationId||'').trim();
    if(!applicationId)throw new ApiError(409,'Candidate application index is inconsistent.','candidate_application_index_inconsistent');
    appRef=db.doc(`organizations/${x.orgId}/applications/${applicationId}`);
    const appSnap=await tx.get(appRef);
    if(!appSnap.exists)throw new ApiError(409,'Candidate application index is inconsistent.','candidate_application_index_inconsistent');
    existingApplication=appSnap.data() as Application;
    version=Number(existingApplication.submissionVersion||0)+1;
    deduplicated=true;
   }else{
    applicationId=newApplicationId;
    version=1;
    appRef=db.doc(`organizations/${x.orgId}/applications/${applicationId}`);
   }

   // ALL TRANSACTION READS COMPLETE. Writes begin here.
   const {sourceText,...profile}=parsed.profile;
   const candidateReviewedResume={summary:i.summary||parsed.profile.summary,professionalExperience:i.professionalExperience,skills:i.skills.length?i.skills:parsed.profile.skills,certifications:i.certifications.length?i.certifications:parsed.profile.certifications,education:i.education.length?i.education:parsed.profile.education,languages:i.languages,projects:i.projects,volunteerExperience:i.volunteerExperience,awards:i.awards,publications:i.publications,additionalInformation:i.additionalInformation,customSections:i.customResumeSections,reviewedAt:t,editorVersion:'H50.5G'};
   const candidateData={firstName:i.firstName,lastName:i.lastName,displayName:`${i.firstName} ${i.lastName}`.trim(),email:i.email,emailLower:email,phone:i.phone,location:i.location,source:'Candidate application portal',linkedinUrl,portfolioUrl,githubUrl,socialMediaUrl,professionalLinks,headline:i.headline||parsed.profile.headline,summary:i.summary||parsed.profile.summary,skills:i.skills.length?i.skills:parsed.profile.skills,certifications:i.certifications.length?i.certifications:parsed.profile.certifications,education:i.education.length?i.education:parsed.profile.education,yearsOfExperience:i.yearsOfExperience??parsed.profile.yearsOfExperience,candidateReviewedResume,resumeText:sourceText,resumeProfile:profile,resumeSourceMeta:{...parsed.sourceMeta,storagePath:resumePath},consentAt:t,talentPoolConsentAt:i.talentPoolConsent?t:existingCandidate?.talentPoolConsentAt,updatedAt:t};
   if(existingCandidate)tx.set(candidateRef,{...existingCandidate,...candidateData},{merge:true});else{tx.create(candidateRef,{id:candidateId,...candidateData,createdAt:t});tx.create(eiRef,{candidateId,email,createdAt:t})}

   if(existingApplication)tx.set(appRef,{applicationLinkId:x.link.id,source:'Candidate application portal',screeningAnswers:i.screeningAnswers,candidateStatement:i.candidateStatement,professionalLinks,submissionVersion:version,resumeVersion:Number(existingApplication.resumeVersion||0)+1,coverLetterVersion:coverDocumentId?Number(existingApplication.coverLetterVersion||0)+1:Number(existingApplication.coverLetterVersion||0),talentPoolConsent:i.talentPoolConsent,atsAnalysisStatus:'pending',atsAnalysisMessage:null,atsLatestReviewId:FieldValue.delete(),atsLatestScore:FieldValue.delete(),atsLatestBand:FieldValue.delete(),atsLatestRequirementsCoverage:FieldValue.delete(),atsLatestEvidenceConfidence:FieldValue.delete(),atsLatestAssessmentCoverage:FieldValue.delete(),atsLatestGapCount:FieldValue.delete(),atsLatestJobTextHash:FieldValue.delete(),atsLatestResumeTextHash:FieldValue.delete(),atsReviewedAt:FieldValue.delete(),updatedAt:t},{merge:true});
   else{tx.create(appRef,{id:applicationId,requisitionId:x.req.id,candidateId,stage:'applied',source:'Candidate application portal',applicationLinkId:x.link.id,screeningAnswers:i.screeningAnswers,candidateStatement:i.candidateStatement,professionalLinks,submissionVersion:1,resumeVersion:1,coverLetterVersion:coverDocumentId?1:0,talentPoolConsent:i.talentPoolConsent,atsAnalysisStatus:'pending',appliedAt:t,consentAt:t,updatedAt:t});tx.create(aiRef,{applicationId,candidateId,requisitionId:x.req.id,createdAt:t})}

   const resumeDoc:CandidateApplicationDocument={id:resumeDocumentId,applicationId,candidateId,requisitionId:x.req.id,submissionId,type:'resume',version,fileName:rd.sourceMeta.fileName,contentType:rd.sourceMeta.contentType,size:rd.sourceMeta.size,sha256:rd.sourceMeta.sha256,storagePath:resumePath,createdAt:t};
   tx.create(db.doc(`organizations/${x.orgId}/candidateApplicationDocuments/${resumeDocumentId}`),resumeDoc);
   if(coverDocumentId&&coverPath&&coverBytes&&coverType&&coverName&&coverSha){const d:CandidateApplicationDocument={id:coverDocumentId,applicationId,candidateId,requisitionId:x.req.id,submissionId,type:'cover_letter',version,fileName:safeName(coverName),contentType:coverType,size:coverBytes.length,sha256:coverSha,storagePath:coverPath,text:coverExtract||undefined,createdAt:t};tx.create(db.doc(`organizations/${x.orgId}/candidateApplicationDocuments/${coverDocumentId}`),d)}
   tx.create(db.doc(`organizations/${x.orgId}/candidateApplicationSubmissions/${submissionId}`),{id:submissionId,applicationId,candidateId,requisitionId:x.req.id,applicationLinkId:x.link.id,submissionVersion:version,resumeDocumentId,coverLetterDocumentId:coverDocumentId,screeningAnswers:i.screeningAnswers,professionalLinks,candidateStatement:i.candidateStatement,candidateReviewedResume,consentAt:t,accuracyConfirmedAt:t,talentPoolConsent:i.talentPoolConsent,createdAt:t});
   const audit=buildAudit(a,{action:'recruiting.public_application.submit',entityType:'application',entityId:applicationId,after:{applicationId,candidateId,requisitionId:x.req.id,applicationLinkId:x.link.id,submissionVersion:version,resumeDocumentId,coverLetterDocumentId:coverDocumentId,humanReviewRequired:true}}),event=deduplicated?null:buildDomainEvent(a,'application.created','application',applicationId,{candidateId,requisitionId:x.req.id,applicationLinkId:x.link.id,submissionVersion:version,source:'candidate_portal'});
   tx.create(db.doc(`organizations/${x.orgId}/auditLogs/${audit.id}`),audit);if(event)tx.create(db.doc(`organizations/${x.orgId}/domainEvents/${event.id}`),event);
   tx.set(db.doc(`organizations/${x.orgId}/candidateApplicationLinks/${x.link.id}`),deduplicated?{lastApplicationAt:t,updatedAt:t}:{applicationsCount:FieldValue.increment(1),lastApplicationAt:t,updatedAt:t},{merge:true});
   result={applicationId,candidateId,deduplicated,submissionVersion:version};
  });

  let fitGenerated=false;try{fitGenerated=Boolean(await autoScoreStoredApplication(a,result.applicationId,'candidate_portal_submission'))}catch(e){await recordAtsAnalysisFailure(a,result.applicationId,e).catch(()=>undefined)}
  return{...result,submissionId,fitGenerated,atsStatus:fitGenerated?'ready':'failed',candidateMessage:'Application submitted successfully. Job-fit analysis is internal decision support and is not shown to candidates.'};
 }catch(e){
  await Promise.all(saved.map(p=>adminBucket().file(p).delete({ignoreNotFound:true}).catch(()=>undefined)));
  if(e instanceof ApiError)throw e;
  throw new ApiError(503,'We could not complete your application. No submission was recorded. Please try again.','candidate_submission_failed');
 }
}
