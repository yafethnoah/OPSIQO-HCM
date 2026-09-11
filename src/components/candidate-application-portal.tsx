'use client';

import {FormEvent,useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {firebaseAppCheck} from '@/lib/firebase/client';
import {getToken as getAppCheckToken} from 'firebase/app-check';
import {LoadingState} from '@/components/data-states';
import type {
  StructuredResumeProfile,
  ResumeEmploymentEntry,
  ResumeEducationEntry,
  ResumeCertificationEntry,
  ResumeLanguageEntry,
  ResumeProjectEntry,
  ResumeVolunteerEntry,
  ResumeAwardEntry,
  ResumePublicationEntry,
} from '@/domain/structured-resume';
import {
  looksLikeResumeNarrativeFragment,
  looksLikeResumeSectionHeading,
  normalizeEducationLocationMeta,
} from '@/lib/recruiting/resume-style-intelligence';

type Q={id:string;label:string;type:'yes_no'|'text'|'number'|'select';required:boolean;options?:string[]};
type Context={
  organization:{name:string;logoUrl?:string};
  requisition:{requisitionNumber:string;title:string;location?:string;employmentType:string;description:string;requirements:string[]};
  application:{coverLetterRequired:boolean;allowTalentPoolConsent:boolean;screeningQuestions:Q[];closingAt?:string}
};
type CustomSection={id:string;title:string;content:string};
type ParseAssurance={machineTrust:number;aiVerified:boolean;fieldConfidence:Record<string,number>;unresolvedFields:string[];requiresCandidateReview:true;verifiedStatus:'high_confidence'|'review_required';structuredQuality:number;structuredCoverage:number;structuredRecordCount:number;structuredCriticalIssues:string[];structuredIssues:string[];repairOutcome?:{attempted:true;accepted:boolean;resolvedCritical:number;beforeCritical:number;afterCritical:number}};
type Profile={
  firstName:string;lastName:string;email:string;phone:string;location:string;
  linkedinUrl:string;portfolioUrl:string;githubUrl:string;socialMediaUrl:string;
  headline:string;summary:string;yearsOfExperience:string;
  candidateStatement:string;customResumeSections:CustomSection[];
};

const emptyStructured=():StructuredResumeProfile=>({
  employmentHistory:[],educationHistory:[],skills:[],certifications:[],languages:[],
  projects:[],volunteerExperience:[],awards:[],publications:[],additionalInformation:'',
});
const empty:Profile={
  firstName:'',lastName:'',email:'',phone:'',location:'',
  linkedinUrl:'',portfolioUrl:'',githubUrl:'',socialMediaUrl:'',
  headline:'',summary:'',yearsOfExperience:'',candidateStatement:'',customResumeSections:[]
};


const ACTION_ENTITY=/^(?:assessed|analyzed|analysed|built|co-founded|cofounded|founded|created|delivered|designed|developed|directed|drove|established|evaluated|expanded|implemented|improved|increased|launched|led|managed|negotiated|oversaw|prepared|reduced|restructured|supported|trained|transformed|updated|worked|coordinated|conducted|administered|achieved|maintained|monitored|introduced|streamlined|supervised|provided|partnered|facilitated)\b/i;
const canonicalReview=(value:unknown)=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
const entityLooksNarrative=(value:string)=>looksLikeResumeSectionHeading(value)||looksLikeResumeNarrativeFragment(value)||ACTION_ENTITY.test(value.trim());
const volunteerSimilar=(a:ResumeVolunteerEntry,b:ResumeVolunteerEntry)=>{
  const roleA=canonicalReview(a.role),roleB=canonicalReview(b.role),orgA=canonicalReview(a.organization),orgB=canonicalReview(b.organization);
  if(!roleA||!roleB||!orgA||!orgB)return false;
  const roleSame=roleA===roleB||roleA.includes(roleB)||roleB.includes(roleA);
  const orgSame=orgA===orgB||orgA.includes(orgB)||orgB.includes(orgA);
  const year=(v:unknown)=>String(v||'').match(/\b(?:19|20)\d{2}\b/)?.[0]||'';
  const yearA=year(a.startDate),yearB=year(b.startDate);
  return roleSame&&orgSame&&(!yearA||!yearB||yearA===yearB);
};

function candidateResumeReviewIssues(resume:StructuredResumeProfile):string[]{
  const issues:string[]=[];

  (resume.employmentHistory||[]).forEach((item,index)=>{
    const title=String(item.positionTitle||'').trim();
    const employer=String(item.employer||'').trim();
    if(!title)issues.push(`Employment ${index+1}: add the position title.`);
    if(!employer)issues.push(`Employment ${index+1}: add the employer/organization.`);
    if(title&&entityLooksNarrative(title))issues.push(`Employment ${index+1}: position title is responsibility/narrative text, not a reliable role entity.`);
    if(employer&&entityLooksNarrative(employer))issues.push(`Employment ${index+1}: employer is responsibility/narrative text, not a reliable organization entity.`);
  });

  for(let i=0;i<(resume.employmentHistory||[]).length;i+=1){
    for(let j=i+1;j<(resume.employmentHistory||[]).length;j+=1){
      const a=resume.employmentHistory[i]!,b=resume.employmentHistory[j]!;
      const titleA=canonicalReview(a.positionTitle),titleB=canonicalReview(b.positionTitle);
      const employerA=canonicalReview(a.employer),employerB=canonicalReview(b.employer);
      const year=(v:unknown)=>String(v||'').match(/\b(?:19|20)\d{2}\b/)?.[0]||'';
      const same=(titleA&&titleB&&titleA===titleB)||(employerA&&employerB&&employerA===employerB);
      if(same&&(!year(a.startDate)||!year(b.startDate)||year(a.startDate)===year(b.startDate)))issues.push(`Employment ${j+1}: probable duplicate/partial duplicate of Employment ${i+1}.`);
    }
  }

  (resume.volunteerExperience||[]).forEach((item,index)=>{
    const organization=String(item.organization||'').trim();
    if(organization&&entityLooksNarrative(organization))issues.push(`Volunteer ${index+1}: organization contains responsibility/narrative text.`);
    for(let j=index+1;j<(resume.volunteerExperience||[]).length;j+=1){
      if(volunteerSimilar(item,resume.volunteerExperience[j]!))issues.push(`Volunteer ${j+1}: probable duplicate/contaminated organization record of Volunteer ${index+1}.`);
    }
  });

  (resume.educationHistory||[]).forEach((item,index)=>{
    const degree=String(item.degree||'').trim();
    const institution=String(item.institution||'').trim();
    if(!degree)issues.push(`Education ${index+1}: add the degree/credential.`);
    if(!institution)issues.push(`Education ${index+1}: add the institution.`);
    if(degree&&(looksLikeResumeSectionHeading(degree)||looksLikeResumeNarrativeFragment(degree)))issues.push(`Education ${index+1}: degree looks like a heading or sentence fragment.`);
    if(institution&&(looksLikeResumeSectionHeading(institution)||looksLikeResumeNarrativeFragment(institution)))issues.push(`Education ${index+1}: institution looks like a heading or sentence fragment.`);
    const locationMeta=normalizeEducationLocationMeta(item.location||'');
    if(locationMeta.status||locationMeta.expectedDate)issues.push(`Education ${index+1}: move study status/expected graduation out of the location field.`);
  });

  return [...new Set(issues)].slice(0,40);
}

async function call<T>(path:string,init:RequestInit={},draftToken?:string){
  const h=new Headers(init.headers);
  if(!(init.body instanceof FormData))h.set('content-type','application/json');
  if(draftToken)h.set('x-application-draft-token',draftToken);
  if(process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE!=='true'){
    const ac=firebaseAppCheck();
    if(ac)h.set('x-firebase-appcheck',(await getAppCheckToken(ac,false)).token);
  }
  const r=await fetch(path,{...init,headers:h,cache:'no-store'});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(body.message||`Request failed (${r.status})`);
  return body as T;
}
const cleanCustom=(items:CustomSection[])=>items.map(({title,content})=>({title:title.trim(),content:content.trim()})).filter(x=>x.title&&x.content);
const uid=()=>crypto.randomUUID();

export function CandidateApplicationPortal({token}:{token:string}){
  const[ctx,setCtx]=useState<Context|null>(null);
  const[p,setP]=useState<Profile>(empty);
  const[structured,setStructured]=useState<StructuredResumeProfile>(emptyStructured());
  const[answers,setAnswers]=useState<Record<string,string>>({});
  const[resume,setResume]=useState<File|null>(null);
  const[cover,setCover]=useState<File|null>(null);
  const[coverText,setCoverText]=useState('');
  const[step,setStep]=useState(1);
  const[busy,setBusy]=useState('');
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[parseNote,setParseNote]=useState('');
  const[parseAssurance,setParseAssurance]=useState<ParseAssurance|null>(null);
  const[resumeReviewed,setResumeReviewed]=useState(false);
  const[consent,setConsent]=useState(false);
  const[accuracy,setAccuracy]=useState(false);
  const[talent,setTalent]=useState(false);
  const[submitted,setSubmitted]=useState<{applicationId:string;submissionVersion:number;deduplicated:boolean}|null>(null);

  const key=`opsiqo.candidateDraftToken.${token}`;
  const set=(k:Exclude<keyof Profile,'customResumeSections'>,v:string)=>setP(x=>({...x,[k]:v}));
  const localReviewIssues=candidateResumeReviewIssues(structured);
  const skillsExpected=Boolean(parseAssurance?.structuredCriticalIssues?.some(x=>/skills/i.test(x)));
  const serverCriticalIssues=parseAssurance?.structuredCriticalIssues||[];
  const reviewIssues=[...new Set([
    ...localReviewIssues,
    ...serverCriticalIssues,
    ...(skillsExpected&&!structured.skills.length?['Skills: add at least one source-supported skill or competency.']:[]),
  ])];
  const repairableIssues=[...new Set([
    ...reviewIssues,
    ...(parseAssurance?.structuredIssues||[]),
  ])].slice(0,40);
  const structurallyReady=reviewIssues.length===0;
  const candidateReviewComplete=resumeReviewed&&structurallyReady;

  useEffect(()=>{void(async()=>{
    try{
      const r=await call<{data:Context}>(`/api/public/recruiting/apply/${encodeURIComponent(token)}`);
      setCtx(r.data);
      const d=localStorage.getItem(key);
      if(d){
        try{
          const x=await call<{data:{data:any}}>(`/api/public/recruiting/apply/${encodeURIComponent(token)}/draft`,{},d);
          const s=x.data.data||{};
          setP(v=>({...v,...s,yearsOfExperience:s.yearsOfExperience==null?v.yearsOfExperience:String(s.yearsOfExperience),customResumeSections:Array.isArray(s.customResumeSections)?s.customResumeSections.map((z:any)=>({id:uid(),title:String(z.title||''),content:String(z.content||'')})):v.customResumeSections}));
          if(s.structuredResume)setStructured(s.structuredResume);
          if(s.screeningAnswers)setAnswers(s.screeningAnswers);
          if(s.coverLetterText)setCoverText(s.coverLetterText);
          if(typeof s.talentPoolConsent==='boolean')setTalent(s.talentPoolConsent);
          setNotice('Saved draft restored. Reattach resume/cover-letter files before final submission.');
        }catch{localStorage.removeItem(key)}
      }
    }catch(e){setError(e instanceof Error?e.message:'Unable to open application.')}
  })()},[token]);

  async function parse(f:File,targetStep=2,repair=false){
    setBusy('parse');setError('');setParseNote('');setParseAssurance(null);setResumeReviewed(false);
    try{
      const d=new FormData();d.set('file',f);if(repair){d.set('mode','repair');d.set('structuredResume',JSON.stringify(structured));d.set('repairIssues',JSON.stringify(repairableIssues));}
      const r=await call<{data:{profile:any;structuredResume:StructuredResumeProfile;assurance:ParseAssurance;note:string}}>(
        `/api/public/recruiting/apply/${encodeURIComponent(token)}/parse`,
        {method:'POST',body:d},
      );
      const x=r.data.profile;
      setP(v=>repair
        ?({...v,yearsOfExperience:x.yearsOfExperience==null?v.yearsOfExperience:String(x.yearsOfExperience)})
        :({...v,
          firstName:x.firstName||v.firstName,lastName:x.lastName||v.lastName,email:x.email||v.email,
          phone:x.phone||v.phone,location:x.location||v.location,linkedinUrl:x.linkedinUrl||v.linkedinUrl,
          headline:x.headline||v.headline,summary:x.summary||v.summary,
          yearsOfExperience:x.yearsOfExperience==null?v.yearsOfExperience:String(x.yearsOfExperience),
        }));
      setStructured({
        ...emptyStructured(),
        ...r.data.structuredResume,
        employmentHistory:(r.data.structuredResume?.employmentHistory||[]).map(x=>({...x,id:x.id||uid()})),
        educationHistory:(r.data.structuredResume?.educationHistory||[]).map(x=>({...x,id:x.id||uid()})),
        certifications:(r.data.structuredResume?.certifications||[]).map(x=>({...x,id:x.id||uid()})),
        languages:(r.data.structuredResume?.languages||[]).map(x=>({...x,id:x.id||uid()})),
        projects:(r.data.structuredResume?.projects||[]).map(x=>({...x,id:x.id||uid()})),
        volunteerExperience:(r.data.structuredResume?.volunteerExperience||[]).map(x=>({...x,id:x.id||uid()})),
        awards:(r.data.structuredResume?.awards||[]).map(x=>({...x,id:x.id||uid()})),
        publications:(r.data.structuredResume?.publications||[]).map(x=>({...x,id:x.id||uid()})),
      });
      setParseAssurance(r.data.assurance);
      setParseNote(r.data.note);
      if(r.data.assurance.repairOutcome){
        const o=r.data.assurance.repairOutcome;
        setNotice(o.accepted
          ?`AI repair accepted: ${o.resolvedCritical>0?`${o.resolvedCritical} critical issue(s) resolved; ${o.afterCritical} remain.`:'structural quality improved without introducing new critical issues.'}`
          :'AI repair made no safe structural improvement. Your previous source-grounded review draft was retained.');
      }
      setStep(targetStep);
    }catch(e){
      setResume(null);setParseNote('');setParseAssurance(null);setResumeReviewed(false);
      setError(e instanceof Error?e.message:'Resume parsing failed.');
    }finally{setBusy('')}
  }

  function payload(){
    return {
      ...p,
      yearsOfExperience:p.yearsOfExperience?Number(p.yearsOfExperience):undefined,
      structuredResume:structured,
      skills:structured.skills,
      certifications:structured.certifications.map(x=>[x.name,x.issuer].filter(Boolean).join(' · ')).filter(Boolean),
      education:structured.educationHistory.map(x=>[x.degree,x.fieldOfStudy,x.institution].filter(Boolean).join(' · ')).filter(Boolean),
      professionalExperience:structured.employmentHistory.map(x=>[x.positionTitle,x.employer,x.startDate&&x.endDate?`${x.startDate}–${x.endDate}`:x.startDate||x.endDate||'',x.responsibilities.join('; ')].filter(Boolean).join(' | ')).join('\n'),
      languages:structured.languages.map(x=>[x.language,x.proficiency].filter(Boolean).join(' · ')).join('\n'),
      projects:structured.projects.map(x=>[x.name,x.role,x.description].filter(Boolean).join(' | ')).join('\n'),
      volunteerExperience:structured.volunteerExperience.map(x=>[x.organization,x.role,x.description].filter(Boolean).join(' | ')).join('\n'),
      awards:structured.awards.map(x=>[x.title,x.issuer,x.date].filter(Boolean).join(' · ')).join('\n'),
      publications:structured.publications.map(x=>[x.title,x.publisher,x.date].filter(Boolean).join(' · ')).join('\n'),
      additionalInformation:structured.additionalInformation,
      customResumeSections:cleanCustom(p.customResumeSections),
      screeningAnswers:answers,coverLetterText:coverText,talentPoolConsent:talent,
    };
  }

  async function saveDraft(){
    setBusy('draft');setError('');
    try{
      const d=localStorage.getItem(key)||undefined;
      const r=await call<{data:{draftToken:string;expiresInDays:number}}>(
        `/api/public/recruiting/apply/${encodeURIComponent(token)}/draft`,
        {method:'POST',body:JSON.stringify(payload())},d,
      );
      localStorage.setItem(key,r.data.draftToken);
      setNotice(`Draft saved for ${r.data.expiresInDays} days. File attachments are not stored until submission.`);
    }catch(e){setError(e instanceof Error?e.message:'Unable to save draft.')}finally{setBusy('')}
  }

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!resume||!parseNote){setError('Attach and successfully validate your resume before submitting.');setStep(1);return}
    if(reviewIssues.length){setError(`Resolve the ${reviewIssues.length} critical resume structure issue(s) before submitting.`);setStep(3);return}
    if(!resumeReviewed){setError('Review every parsed resume section and confirm the resume review before submitting.');setStep(3);return}
    if(ctx?.application.coverLetterRequired&&!cover&&!coverText.trim()){setError('A cover letter is required.');setStep(5);return}
    if(!consent||!accuracy){setError('Confirm the declaration and privacy consent.');return}
    setBusy('submit');setError('');
    try{
      const d=new FormData();d.set('resume',resume);if(cover)d.set('coverLetter',cover);
      d.set('application',JSON.stringify({...payload(),consent:true,accuracyConfirmed:true}));
      const r=await call<{data:{applicationId:string;submissionVersion:number;deduplicated:boolean}}>(
        `/api/public/recruiting/apply/${encodeURIComponent(token)}/submit`,
        {method:'POST',body:d},
      );
      localStorage.removeItem(key);setSubmitted(r.data);
    }catch(e){setError(e instanceof Error?e.message:'Unable to submit application.')}finally{setBusy('')}
  }

  if(error&&!ctx)return <Shell><section className="prehireCard"><h1>Candidate application</h1><div className="error">{error}</div></section></Shell>;
  if(!ctx)return <Shell><section className="prehireCard"><LoadingState label="Loading candidate application…"/></section></Shell>;

  if(submitted)return <Shell><section className="prehireCard stack">
    <Brand ctx={ctx}/><h1>Application submitted successfully</h1>
    <p>Thank you for applying for <strong>{ctx.requisition.title}</strong>.</p>
    <div className="notice">Application reference: <strong>{submitted.applicationId}</strong><br/>Submission version: {submitted.submissionVersion}{submitted.deduplicated?' · Your existing application was updated.':''}</div>
    <p className="muted">OPSIQO may generate an internal job-fit evidence score for human recruiter review. It is not shown to candidates and does not automatically determine hiring, rejection or advancement.</p>
  </section></Shell>;

  const progress=Math.round(step/6*100);

  return <Shell>
    <header className="prehireHero">
      <div><Brand ctx={ctx}/><h1>{ctx.requisition.title}</h1><p>{ctx.organization.name} · {ctx.requisition.location||'Location not specified'} · {ctx.requisition.employmentType}</p></div>
      <div className="prehireProgress"><strong>{progress}%</strong><span>step {step} of 6</span></div>
    </header>

    <section className="prehireCard stack">
      <details><summary><strong>Position details</strong></summary><p style={{whiteSpace:'pre-wrap'}}>{ctx.requisition.description}</p>{ctx.requisition.requirements.length>0&&<ul>{ctx.requisition.requirements.map(x=><li key={x}>{x}</li>)}</ul>}</details>
      <div className="atsTrack"><div className="atsFill" style={{width:`${progress}%`}}/></div>
      {error&&<div className="error">{error}</div>}{notice&&<div className="success">{notice}</div>}
    </section>

    <form className="stack" onSubmit={submit}>
      {step===1&&<section className="prehireCard stack">
        <h2>1. Import Resume</h2>
        <p className="muted">Upload PDF, DOCX, TXT, RTF or Markdown. OPSIQO uses governed AI extraction, independent verification, and semantic reconstruction to recover complete skills, language proficiency, education, certifications, and employment relationships before presenting editable fields. It will not advance with an empty or unreliable parse.</p>
        <input className="input" type="file" accept=".pdf,.docx,.txt,.rtf,.md" required onChange={e=>{
          const f=e.target.files?.[0]||null;setParseNote('');
          if(f&&/cover[ _-]*letter/i.test(f.name)&&!/(?:resume|\bcv\b)/i.test(f.name)){setResume(null);setError('This file name looks like a cover letter. Please choose your resume.');e.currentTarget.value='';return}
          setResume(f);if(f)void parse(f);
        }}/>
        {resume&&<div className="notice">Attached: <strong>{resume.name}</strong></div>}
        {parseNote&&<div className="success">{parseNote}</div>}
        {parseAssurance&&<div className="notice" data-h50-5h-parse-assurance="true">
          <strong>{parseAssurance.aiVerified?'AI-verified parse':'Deterministic draft'} · Machine Parse Trust {parseAssurance.machineTrust}%</strong><br/>
          <strong>Structured Record Quality {parseAssurance.structuredQuality}% · Coverage {parseAssurance.structuredCoverage}% · {parseAssurance.structuredRecordCount} extracted record(s)</strong><br/>
          {parseAssurance.unresolvedFields.length?`Needs review: ${parseAssurance.unresolvedFields.join(', ')}`:'No machine-detected unresolved fields.'}<br/>
          {parseAssurance.structuredCriticalIssues.length?<><strong>Critical machine review: {parseAssurance.structuredCriticalIssues.slice(0,4).join(' · ')}</strong><br/></>:null}
          {parseAssurance.structuredIssues.length?<span className="muted">Structured review: {parseAssurance.structuredIssues.slice(0,4).join(' · ')}</span>:null}<br/>
          <span className="muted">Machine parse trust is an evidence-backed confidence indicator. Machine parsing is never represented as 100% certain. Candidate review is tracked separately, and final structural verification occurs during submission.</span>
        </div>}
        <button type="button" className="button" disabled={!resume||busy==='parse'} onClick={()=>resume&&void parse(resume)}>{busy==='parse'?'AI parsing, reconstructing & verifying...':parseNote?'Improve parsing with AI':'AI parse & enhance'}</button>
      </section>}

      {step===2&&<section className="prehireCard stack">
        <h2>2. Personal Information</h2>
        <p className="muted">These fields are extracted from the resume and remain fully editable.</p>
        <div className="formGrid">
          <F label="First name" value={p.firstName} onChange={v=>set('firstName',v)} required/>
          <F label="Last name" value={p.lastName} onChange={v=>set('lastName',v)} required/>
          <F label="Email" type="email" value={p.email} onChange={v=>set('email',v)} required/>
          <F label="Phone" value={p.phone} onChange={v=>set('phone',v)}/>
          <F label="Location / address" value={p.location} onChange={v=>set('location',v)}/>
          <F label="Professional headline" value={p.headline} onChange={v=>set('headline',v)}/>
        </div>
        <TA label="Professional summary" value={p.summary} onChange={v=>set('summary',v)} rows={6}/>
      </section>}

      {step===3&&<section className="prehireCard stack" data-h50-5g-resume-editor="true" data-h50-5i-structured-resume="true">
        <div className="toolbar"><div><h2>3. Resume review & edit</h2><p className="muted">OPSIQO extracted your resume into structured application records. Review every card; edit, add or remove records before submitting.</p></div><span className="badge">Structured resume</span></div>
        {reviewIssues.length
          ?<div className="error"><strong>{reviewIssues.length} critical resume structure/completeness issue(s) need correction.</strong><ul>{reviewIssues.slice(0,8).map(issue=><li key={issue}>{issue}</li>)}</ul>{resume&&<button type="button" className="button secondary" disabled={busy==='parse'} onClick={()=>void parse(resume,3,true)}>{busy==='parse'?'AI repairing affected records…':'Improve these records with AI'}</button>}</div>
          :<div className="success"><strong>Semantic and source-completeness readiness checks passed for the records currently shown.</strong> Final source-grounded verification will still run when you submit.{repairableIssues.length>0&&resume?<><br/><button type="button" className="button secondary" disabled={busy==='parse'} onClick={()=>void parse(resume,3,true)}>{busy==='parse'?'AI reviewing quality anomalies…':'Improve quality with AI'}</button></>:null}</div>}
        <F label="Estimated years of experience from resume · review" type="number" value={p.yearsOfExperience} onChange={v=>set('yearsOfExperience',v)}/>

        <SectionTitle title="Professional experience" hint="Employment History"/>
        <EmploymentEditor items={structured.employmentHistory} onChange={employmentHistory=>setStructured(x=>({...x,employmentHistory}))}/>

        <SectionTitle title="Skills / technical skills / tools" hint="AI-normalized competency phrases / compact editable skills"/>
        <SkillEditor items={structured.skills} onChange={skills=>setStructured(x=>({...x,skills}))}/>

        <SectionTitle title="Education · one item per line" hint="Structured Education History"/>
        <EducationEditor items={structured.educationHistory} onChange={educationHistory=>setStructured(x=>({...x,educationHistory}))}/>

        <SectionTitle title="Certifications / licences" hint="Structured certification records"/>
        <CertificationEditor items={structured.certifications} onChange={certifications=>setStructured(x=>({...x,certifications}))}/>

        <SectionTitle title="Languages" hint="Language and proficiency"/>
        <LanguageEditor items={structured.languages} onChange={languages=>setStructured(x=>({...x,languages}))}/>

        <SectionTitle title="Projects" hint="Structured project records"/>
        <ProjectEditor items={structured.projects} onChange={projects=>setStructured(x=>({...x,projects}))}/>

        <SectionTitle title="Volunteer / community experience" hint="Structured volunteer records"/>
        <VolunteerEditor items={structured.volunteerExperience} onChange={volunteerExperience=>setStructured(x=>({...x,volunteerExperience}))}/>

        <SectionTitle title="Awards / honours" hint="Structured award records"/>
        <AwardEditor items={structured.awards} onChange={awards=>setStructured(x=>({...x,awards}))}/>

        <SectionTitle title="Publications / presentations" hint="Structured publication records"/>
        <PublicationEditor items={structured.publications} onChange={publications=>setStructured(x=>({...x,publications}))}/>

        <TA label="Additional information / affiliations / interests" value={structured.additionalInformation||''} onChange={additionalInformation=>setStructured(x=>({...x,additionalInformation}))} rows={6}/>

        <div className="toolbar"><strong>Other resume sections</strong><button type="button" className="button secondary" onClick={()=>setP(v=>({...v,customResumeSections:[...v.customResumeSections,{id:uid(),title:'',content:''}]}))}>Add another resume section</button></div>
        {p.customResumeSections.map((s,i)=><div className="card insetCard stack" key={s.id}>
          <F label="Section title" value={s.title} onChange={title=>setP(v=>({...v,customResumeSections:v.customResumeSections.map((x,j)=>j===i?{...x,title}:x)}))}/>
          <TA label="Section content" value={s.content} onChange={content=>setP(v=>({...v,customResumeSections:v.customResumeSections.map((x,j)=>j===i?{...x,content}:x)}))} rows={6}/>
          <button type="button" className="button secondary" onClick={()=>setP(v=>({...v,customResumeSections:v.customResumeSections.filter((_,j)=>j!==i)}))}>Remove section</button>
        </div>)}

        <div className="notice"><strong>Evidence boundary:</strong> your reviewed profile is saved for recruiter review, but the internal Fit % remains grounded in the original uploaded resume evidence. Your edits do not silently rewrite the source document used for automated evidence matching.</div>
        <label className="notice"><input type="checkbox" checked={candidateReviewComplete} disabled={!structurallyReady} onChange={e=>setResumeReviewed(e.target.checked)}/> <strong>I reviewed every parsed resume section and corrected any inaccurate or missing information.</strong><br/><span className="muted">{structurallyReady?'Checking this records completion of your review. Final source-grounded structural verification still runs on submission.':'Resolve the critical structure issues above before confirming your review.'}</span></label>
      </section>}

      {step===4&&<section className="prehireCard stack"><h2>4. Screening questions</h2>{ctx.application.screeningQuestions.map(q=><Question key={q.id} q={q} value={answers[q.id]||''} onChange={v=>setAnswers(x=>({...x,[q.id]:v}))}/>)}{!ctx.application.screeningQuestions.length&&<div className="notice">No additional screening questions.</div>}</section>}

      {step===5&&<section className="prehireCard stack">
        <h2>5. Cover letter & professional/social links</h2>
        <label className="field"><span>Cover letter file {ctx.application.coverLetterRequired?'· required':'· optional'}</span><input className="input" type="file" accept=".pdf,.docx,.txt,.rtf,.md" onChange={e=>setCover(e.target.files?.[0]||null)}/></label>
        <label className="field"><span>Or paste / write cover letter</span><textarea className="input" rows={9} value={coverText} onChange={e=>setCoverText(e.target.value)}/></label>
        <div className="formGrid">
          <F label="LinkedIn" type="url" value={p.linkedinUrl} onChange={v=>set('linkedinUrl',v)}/>
          <F label="Portfolio / website" type="url" value={p.portfolioUrl} onChange={v=>set('portfolioUrl',v)}/>
          <F label="GitHub" type="url" value={p.githubUrl} onChange={v=>set('githubUrl',v)}/>
          <F label="Other social/professional profile" type="url" value={p.socialMediaUrl} onChange={v=>set('socialMediaUrl',v)}/>
        </div>
        <TA label="Optional note to recruiter" value={p.candidateStatement} onChange={v=>set('candidateStatement',v)} rows={5}/>
        <div className="notice">Professional/social links are optional and are not used by the ATS fit score.</div>
      </section>}

      {step===6&&<section className="prehireCard stack">
        <h2>6. Review & submit</h2>
        <div className="grid2">
          <Review l="Candidate" v={`${p.firstName} ${p.lastName}`}/><Review l="Email" v={p.email}/><Review l="Resume" v={resume?.name||'Not attached'}/>
          <Review l="Employment records" v={String(structured.employmentHistory.length)}/><Review l="Education records" v={String(structured.educationHistory.length)}/><Review l="Skills" v={String(structured.skills.length)}/>
          <Review l="Machine Parse Trust" v={parseAssurance?`${parseAssurance.machineTrust}% · ${parseAssurance.aiVerified?'AI verified':'deterministic draft'}`:'Not available'}/>
          <Review l="Candidate review" v={candidateReviewComplete?'Completed':'Review required'}/>
          <Review l="Structured resume verification" v={structurallyReady?'Ready for final server verification':`${reviewIssues.length} critical issue(s) remaining`}/>
        </div>
        <div className="row wrap"><button type="button" className="button secondary" onClick={()=>setStep(2)}>Edit personal information</button><button type="button" className="button secondary" onClick={()=>setStep(3)}>Edit resume sections</button></div>
        <label><input type="checkbox" checked={accuracy} onChange={e=>setAccuracy(e.target.checked)} required/> I confirm this application and supporting documents are accurate to the best of my knowledge.</label>
        <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/> I consent to processing my application information for recruitment purposes and acknowledge the privacy notice.</label>
        {ctx.application.allowTalentPoolConsent&&<label><input type="checkbox" checked={talent} onChange={e=>setTalent(e.target.checked)}/> I agree that my application may be considered for other suitable opportunities. Optional.</label>}
        <div className="notice">Protected characteristics and social-profile content are excluded from automated fit analysis. OPSIQO does not automatically hire, reject or advance candidates.</div>
        <button className="button" disabled={busy==='submit'||!resume||!parseNote||!candidateReviewComplete||!accuracy||!consent||(ctx.application.coverLetterRequired&&!cover&&!coverText.trim())}>{busy==='submit'?'Submitting…':'Submit application'}</button>
      </section>}

      <section className="prehireCard"><div className="row wrap"><button type="button" className="button secondary" disabled={step<=1} onClick={()=>setStep(x=>Math.max(1,x-1))}>Back</button>{step<6&&<button type="button" className="button" disabled={step===1&&(!resume||busy==='parse'||!parseNote)} onClick={()=>setStep(x=>Math.min(6,x+1))}>Continue</button>}<button type="button" className="button secondary" disabled={busy==='draft'} onClick={()=>void saveDraft()}>{busy==='draft'?'Saving…':'Save & continue later'}</button></div><p className="muted">Draft fields are retained securely for 14 days. File attachments are retained only after final submission.</p></section>
    </form>
    <div className="notice">Powered by OPSIQO · Evidence-first recruiting · Human review required</div>
  </Shell>;
}

function Shell({children}:{children:ReactNode}){return <div className="prehireShell"><main className="prehireMain">{children}</main></div>}
function Brand({ctx}:{ctx:Context}){return <div className="prehireBrand"><img className="prehireBrandLogo" src={ctx.organization.logoUrl||'/brand/opsiqo-wordmark.png'} alt={ctx.organization.name}/><span>CANDIDATE APPLICATION</span></div>}
function F({label,value,onChange,type='text',required}:{label:string;value:string;onChange:(v:string)=>void;type?:string;required?:boolean}){return <label className="field"><span>{label}</span><input className="input" type={type} value={value} required={required} onChange={e=>onChange(e.target.value)}/></label>}
function TA({label,value,onChange,rows=5}:{label:string;value:string;onChange:(v:string)=>void;rows?:number}){return <label className="field"><span>{label}</span><textarea className="input" rows={rows} value={value} onChange={e=>onChange(e.target.value)}/></label>}
function Review({l,v}:{l:string;v:string}){return <div className="notice"><span className="muted">{l}</span><br/><strong>{v||'—'}</strong></div>}
function SectionTitle({title,hint}:{title:string;hint:string}){return <div><h3>{title}</h3><p className="muted">{hint}</p></div>}
function Question({q,value,onChange}:{q:Q;value:string;onChange:(v:string)=>void}){return <label className="field"><span>{q.label}{q.required?' · required':''}</span>{q.type==='yes_no'?<select className="input" required={q.required} value={value} onChange={e=>onChange(e.target.value)}><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select>:q.type==='select'?<select className="input" required={q.required} value={value} onChange={e=>onChange(e.target.value)}><option value="">Select</option>{(q.options||[]).map(o=><option key={o}>{o}</option>)}</select>:<input className="input" required={q.required} type={q.type==='number'?'number':'text'} value={value} onChange={e=>onChange(e.target.value)}/>}</label>}

function SkillEditor({items,onChange}:{items:string[];onChange:(x:string[])=>void}){
  const[draft,setDraft]=useState('');
  const add=()=>{
    const value=draft.replace(/\s+/g,' ').trim();
    if(!value)return;
    const key=value.toLocaleLowerCase();
    if(!items.some(x=>x.trim().toLocaleLowerCase()===key))onChange([...items,value]);
    setDraft('');
  };
  return <div className="stack" data-h51-21-skill-editor="true">
    <div className="row wrap">
      {items.map((v,i)=><div className="row" key={`${i}-${v}`} style={{flex:'0 1 auto',gap:'.35rem',alignItems:'center',maxWidth:'100%'}}>
        <input
          aria-label={`Skill ${i+1}`}
          className="input"
          style={{width:`${Math.max(14,Math.min(38,(v||'').length+3))}ch`,maxWidth:'72vw'}}
          value={v}
          onChange={e=>onChange(items.map((x,j)=>j===i?e.target.value:x))}
        />
        <button type="button" className="button secondary" style={{padding:'.4rem .55rem'}} aria-label={`Remove ${v||`skill ${i+1}`}`} title="Remove skill" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>x</button>
      </div>)}
    </div>
    <div className="row wrap">
      <input
        className="input"
        style={{maxWidth:'32rem'}}
        placeholder="Add another complete skill or competency"
        value={draft}
        onChange={e=>setDraft(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}
      />
      <button type="button" className="button secondary" onClick={add}>+ Add skill</button>
    </div>
    <div className="muted">OPSIQO AI preserves complete multi-word competencies and shows skills compactly instead of one full-width row per skill.</div>
  </div>
}

function EmploymentEditor({items,onChange}:{items:ResumeEmploymentEntry[];onChange:(x:ResumeEmploymentEntry[])=>void}){const set=(i:number,p:Partial<ResumeEmploymentEntry>)=>onChange(items.map((x,j)=>j===i?{...x,...p}:x));return <div className="stack">{items.map((x,i)=><details className="card insetCard" open key={x.id||i}><summary><strong>{x.positionTitle||'Employment'}{x.employer?` · ${x.employer}`:''}</strong></summary><div className="stack"><div className="formGrid"><F label="Position Title" value={x.positionTitle} onChange={v=>set(i,{positionTitle:v})}/><F label="Employer" value={x.employer} onChange={v=>set(i,{employer:v})}/><F label="Start Date" value={x.startDate||''} onChange={v=>set(i,{startDate:v})}/><F label="End Date" value={x.endDate||''} onChange={v=>set(i,{endDate:v})}/><F label="Location" value={x.location||''} onChange={v=>set(i,{location:v})}/><F label="Country" value={x.country||''} onChange={v=>set(i,{country:v})}/></div><label><input type="checkbox" checked={Boolean(x.current)} onChange={e=>set(i,{current:e.target.checked,endDate:e.target.checked?'':x.endDate})}/> Current job</label><TA label="Duties and Responsibilities" value={(x.responsibilities||[]).join('\n')} onChange={v=>set(i,{responsibilities:v.split('\n').map(s=>s.trim()).filter(Boolean)})} rows={8}/><F label="Reason for leaving · optional candidate-entered" value={x.reasonForLeaving||''} onChange={v=>set(i,{reasonForLeaving:v})}/><button type="button" className="button secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remove Employment History</button></div></details>)}<button type="button" className="button secondary" onClick={()=>onChange([...items,{id:uid(),positionTitle:'',employer:'',responsibilities:[]}])}>+ Add Employment History</button></div>}

function EducationEditor({items,onChange}:{items:ResumeEducationEntry[];onChange:(x:ResumeEducationEntry[])=>void}){const set=(i:number,p:Partial<ResumeEducationEntry>)=>onChange(items.map((x,j)=>j===i?{...x,...p}:x));return <div className="stack">{items.map((x,i)=><details className="card insetCard" open key={x.id||i}><summary><strong>{x.degree||'Education'}{x.institution?` · ${x.institution}`:''}</strong></summary><div className="formGrid"><F label="Degree" value={x.degree} onChange={v=>set(i,{degree:v})}/><F label="Major / Field of Study" value={x.fieldOfStudy||''} onChange={v=>set(i,{fieldOfStudy:v})}/><F label="School / Institution" value={x.institution} onChange={v=>set(i,{institution:v})}/><F label="Location" value={x.location||''} onChange={v=>set(i,{location:v})}/><F label="Start Date" value={x.startDate||''} onChange={v=>set(i,{startDate:v})}/><F label="End / Graduation Date" value={x.graduationDate||x.endDate||''} onChange={v=>set(i,{graduationDate:v})}/></div><label><input type="checkbox" checked={Boolean(x.completed)} onChange={e=>set(i,{completed:e.target.checked})}/> Completed</label><button type="button" className="button secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remove Education History</button></details>)}<button type="button" className="button secondary" onClick={()=>onChange([...items,{id:uid(),degree:'',institution:''}])}>+ Add Education History</button></div>}

function CertificationEditor({items,onChange}:{items:ResumeCertificationEntry[];onChange:(x:ResumeCertificationEntry[])=>void}){const set=(i:number,p:Partial<ResumeCertificationEntry>)=>onChange(items.map((x,j)=>j===i?{...x,...p}:x));return <div className="stack">{items.map((x,i)=><div className="card insetCard stack" key={x.id||i}><div className="formGrid"><F label="Certification / Licence" value={x.name} onChange={v=>set(i,{name:v})}/><F label="Issuer" value={x.issuer||''} onChange={v=>set(i,{issuer:v})}/><F label="Issued Date" value={x.issuedAt||''} onChange={v=>set(i,{issuedAt:v})}/><F label="Expiry Date" value={x.expiresAt||''} onChange={v=>set(i,{expiresAt:v})}/><F label="Credential ID" value={x.credentialId||''} onChange={v=>set(i,{credentialId:v})}/></div><button type="button" className="button secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remove</button></div>)}<button type="button" className="button secondary" onClick={()=>onChange([...items,{id:uid(),name:''}])}>+ Add Certification</button></div>}

function LanguageEditor({items,onChange}:{items:ResumeLanguageEntry[];onChange:(x:ResumeLanguageEntry[])=>void}){const set=(i:number,p:Partial<ResumeLanguageEntry>)=>onChange(items.map((x,j)=>j===i?{...x,...p}:x));return <div className="stack">{items.map((x,i)=><div className="row wrap" key={x.id||i}><input className="input" placeholder="Language" value={x.language} onChange={e=>set(i,{language:e.target.value})}/><input className="input" placeholder="Proficiency" value={x.proficiency||''} onChange={e=>set(i,{proficiency:e.target.value})}/><button type="button" className="button secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remove</button></div>)}<button type="button" className="button secondary" onClick={()=>onChange([...items,{id:uid(),language:''}])}>+ Add Language</button></div>}

function ProjectEditor({items,onChange}:{items:ResumeProjectEntry[];onChange:(x:ResumeProjectEntry[])=>void}){const set=(i:number,p:Partial<ResumeProjectEntry>)=>onChange(items.map((x,j)=>j===i?{...x,...p}:x));return <div className="stack">{items.map((x,i)=><div className="card insetCard stack" key={x.id||i}><div className="formGrid"><F label="Project" value={x.name} onChange={v=>set(i,{name:v})}/><F label="Role" value={x.role||''} onChange={v=>set(i,{role:v})}/><F label="Start Date" value={x.startDate||''} onChange={v=>set(i,{startDate:v})}/><F label="End Date" value={x.endDate||''} onChange={v=>set(i,{endDate:v})}/></div><TA label="Description" value={x.description||''} onChange={v=>set(i,{description:v})}/><button type="button" className="button secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remove</button></div>)}<button type="button" className="button secondary" onClick={()=>onChange([...items,{id:uid(),name:''}])}>+ Add Project</button></div>}

function VolunteerEditor({items,onChange}:{items:ResumeVolunteerEntry[];onChange:(x:ResumeVolunteerEntry[])=>void}){const set=(i:number,p:Partial<ResumeVolunteerEntry>)=>onChange(items.map((x,j)=>j===i?{...x,...p}:x));return <div className="stack">{items.map((x,i)=><div className="card insetCard stack" key={x.id||i}><div className="formGrid"><F label="Organization" value={x.organization} onChange={v=>set(i,{organization:v})}/><F label="Role" value={x.role||''} onChange={v=>set(i,{role:v})}/><F label="Start Date" value={x.startDate||''} onChange={v=>set(i,{startDate:v})}/><F label="End Date" value={x.endDate||''} onChange={v=>set(i,{endDate:v})}/></div><TA label="Description" value={x.description||''} onChange={v=>set(i,{description:v})}/><button type="button" className="button secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remove</button></div>)}<button type="button" className="button secondary" onClick={()=>onChange([...items,{id:uid(),organization:''}])}>+ Add Volunteer Experience</button></div>}

function AwardEditor({items,onChange}:{items:ResumeAwardEntry[];onChange:(x:ResumeAwardEntry[])=>void}){const set=(i:number,p:Partial<ResumeAwardEntry>)=>onChange(items.map((x,j)=>j===i?{...x,...p}:x));return <div className="stack">{items.map((x,i)=><div className="card insetCard stack" key={x.id||i}><div className="formGrid"><F label="Award / Honour" value={x.title} onChange={v=>set(i,{title:v})}/><F label="Issuer" value={x.issuer||''} onChange={v=>set(i,{issuer:v})}/><F label="Date" value={x.date||''} onChange={v=>set(i,{date:v})}/></div><TA label="Description" value={x.description||''} onChange={v=>set(i,{description:v})}/><button type="button" className="button secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remove</button></div>)}<button type="button" className="button secondary" onClick={()=>onChange([...items,{id:uid(),title:''}])}>+ Add Award / Honour</button></div>}

function PublicationEditor({items,onChange}:{items:ResumePublicationEntry[];onChange:(x:ResumePublicationEntry[])=>void}){const set=(i:number,p:Partial<ResumePublicationEntry>)=>onChange(items.map((x,j)=>j===i?{...x,...p}:x));return <div className="stack">{items.map((x,i)=><div className="card insetCard stack" key={x.id||i}><div className="formGrid"><F label="Publication / Presentation" value={x.title} onChange={v=>set(i,{title:v})}/><F label="Publisher / Venue" value={x.publisher||''} onChange={v=>set(i,{publisher:v})}/><F label="Date" value={x.date||''} onChange={v=>set(i,{date:v})}/><F label="URL" type="url" value={x.url||''} onChange={v=>set(i,{url:v})}/></div><TA label="Description" value={x.description||''} onChange={v=>set(i,{description:v})}/><button type="button" className="button secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remove</button></div>)}<button type="button" className="button secondary" onClick={()=>onChange([...items,{id:uid(),title:''}])}>+ Add Publication / Presentation</button></div>}
