'use client';

import {FormEvent,useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {firebaseAppCheck} from '@/lib/firebase/client';
import {getToken as getAppCheckToken} from 'firebase/app-check';
import {LoadingState} from '@/components/data-states';

type Q={id:string;label:string;type:'yes_no'|'text'|'number'|'select';required:boolean;options?:string[]};
type Context={
  organization:{name:string;logoUrl?:string};
  requisition:{requisitionNumber:string;title:string;location?:string;employmentType:string;description:string;requirements:string[]};
  application:{coverLetterRequired:boolean;allowTalentPoolConsent:boolean;screeningQuestions:Q[];closingAt?:string}
};
type CustomSection={id:string;title:string;content:string};
type Profile={
  firstName:string;lastName:string;email:string;phone:string;location:string;
  linkedinUrl:string;portfolioUrl:string;githubUrl:string;socialMediaUrl:string;
  headline:string;summary:string;yearsOfExperience:string;
  professionalExperience:string;skills:string;certifications:string;education:string;
  languages:string;projects:string;volunteerExperience:string;awards:string;publications:string;
  additionalInformation:string;candidateStatement:string;customResumeSections:CustomSection[];
};
type ParseAssurance={machineTrust:number;aiVerified:boolean;fieldConfidence:Record<string,number>;unresolvedFields:string[];requiresCandidateReview:true;verifiedStatus:'high_confidence'|'review_required'};
type EditableResume={
  professionalExperience?:string;
  languages?:string;
  projects?:string;
  volunteerExperience?:string;
  awards?:string;
  publications?:string;
  additionalInformation?:string;
};

const empty:Profile={
  firstName:'',lastName:'',email:'',phone:'',location:'',
  linkedinUrl:'',portfolioUrl:'',githubUrl:'',socialMediaUrl:'',
  headline:'',summary:'',yearsOfExperience:'',
  professionalExperience:'',skills:'',certifications:'',education:'',
  languages:'',projects:'',volunteerExperience:'',awards:'',publications:'',
  additionalInformation:'',candidateStatement:'',customResumeSections:[]
};

async function call<T>(path:string,init:RequestInit={},draftToken?:string){
  const h=new Headers(init.headers);
  if(!(init.body instanceof FormData))h.set('content-type','application/json');
  if(draftToken)h.set('x-application-draft-token',draftToken);
  if(process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE!=='true'){
    const ac=firebaseAppCheck();
    if(ac)h.set('x-firebase-appcheck',(await getAppCheckToken(ac,false)).token);
  }
  const r=await fetch(path,{...init,headers:h,cache:'no-store'});
  const p=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(p.message||`Request failed (${r.status})`);
  return p as T;
}
const list=(s:string)=>s.split(/\n|;/).map(x=>x.trim()).filter(Boolean);
const safeCustom=(items:CustomSection[])=>items.map(({title,content})=>({title:title.trim(),content:content.trim()})).filter(x=>x.title&&x.content);

export function CandidateApplicationPortal({token}:{token:string}){
  const[ctx,setCtx]=useState<Context|null>(null);
  const[p,setP]=useState<Profile>(empty);
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

  useEffect(()=>{void(async()=>{
    try{
      const r=await call<{data:Context}>(`/api/public/recruiting/apply/${encodeURIComponent(token)}`);
      setCtx(r.data);
      const d=localStorage.getItem(key);
      if(d){
        try{
          const x=await call<{data:{data:any}}>(`/api/public/recruiting/apply/${encodeURIComponent(token)}/draft`,{},d);
          const s=x.data.data||{};
          setP(v=>({
            ...v,...s,
            skills:Array.isArray(s.skills)?s.skills.join('\n'):s.skills||v.skills,
            certifications:Array.isArray(s.certifications)?s.certifications.join('\n'):s.certifications||v.certifications,
            education:Array.isArray(s.education)?s.education.join('\n'):s.education||v.education,
            yearsOfExperience:s.yearsOfExperience==null?v.yearsOfExperience:String(s.yearsOfExperience),
            customResumeSections:Array.isArray(s.customResumeSections)
              ?s.customResumeSections.map((z:any)=>({id:crypto.randomUUID(),title:String(z.title||''),content:String(z.content||'')}))
              :v.customResumeSections,
          }));
          if(s.screeningAnswers)setAnswers(s.screeningAnswers);
          if(s.coverLetterText)setCoverText(s.coverLetterText);
          if(typeof s.talentPoolConsent==='boolean')setTalent(s.talentPoolConsent);
          setNotice('Saved draft restored. Reattach resume/cover-letter files before final submission.');
        }catch{
          localStorage.removeItem(key);
        }
      }
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to open application.');
    }
  })()},[token]);

  async function parse(f:File){
    setBusy('parse');setError('');setParseNote('');
    try{
      const d=new FormData();d.set('file',f);
      const r=await call<{data:{profile:any;editableResume?:EditableResume;assurance:ParseAssurance;note:string}}>(
        `/api/public/recruiting/apply/${encodeURIComponent(token)}/parse`,
        {method:'POST',body:d},
      );
      const x=r.data.profile,e=r.data.editableResume||{};
      setParseAssurance(r.data.assurance);setResumeReviewed(false);
      setP(v=>({
        ...v,
        firstName:x.firstName||v.firstName,
        lastName:x.lastName||v.lastName,
        email:x.email||v.email,
        phone:x.phone||v.phone,
        location:x.location||v.location,
        linkedinUrl:x.linkedinUrl||v.linkedinUrl,
        headline:x.headline||v.headline,
        summary:x.summary||v.summary,
        professionalExperience:e.professionalExperience||v.professionalExperience,
        skills:x.skills?.length?x.skills.join('\n'):v.skills,
        certifications:x.certifications?.length?x.certifications.join('\n'):v.certifications,
        education:x.education?.length?x.education.join('\n'):v.education,
        languages:e.languages||v.languages,
        projects:e.projects||v.projects,
        volunteerExperience:e.volunteerExperience||v.volunteerExperience,
        awards:e.awards||v.awards,
        publications:e.publications||v.publications,
        additionalInformation:e.additionalInformation||v.additionalInformation,
        yearsOfExperience:x.yearsOfExperience==null?v.yearsOfExperience:String(x.yearsOfExperience),
      }));
      setParseNote(`${r.data.note}${x.parseQuality==null?'':` Extraction quality: ${x.parseQuality}%.`}`);
      setStep(2);
    }catch(e){
      setResume(null);setParseNote('');setParseAssurance(null);setResumeReviewed(false);
      setError(e instanceof Error?e.message:'Resume parsing failed.');
    }finally{
      setBusy('');
    }
  }

  function payload(){
    return {
      ...p,
      skills:list(p.skills),
      certifications:list(p.certifications),
      education:list(p.education),
      yearsOfExperience:p.yearsOfExperience?Number(p.yearsOfExperience):undefined,
      customResumeSections:safeCustom(p.customResumeSections),
      screeningAnswers:answers,
      coverLetterText:coverText,
      talentPoolConsent:talent,
    };
  }

  async function saveDraft(){
    setBusy('draft');setError('');
    try{
      const d=localStorage.getItem(key)||undefined;
      const r=await call<{data:{draftToken:string;expiresInDays:number}}>(
        `/api/public/recruiting/apply/${encodeURIComponent(token)}/draft`,
        {method:'POST',body:JSON.stringify(payload())},
        d,
      );
      localStorage.setItem(key,r.data.draftToken);
      setNotice(`Draft saved for ${r.data.expiresInDays} days. File attachments are not stored until submission.`);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to save draft.');
    }finally{
      setBusy('');
    }
  }

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!resume||!parseNote){setError('Attach and successfully validate your resume before submitting.');setStep(1);return}
    if(!resumeReviewed){setError('Review every parsed resume section and confirm the resume review before submitting.');setStep(3);return}
    if(ctx?.application.coverLetterRequired&&!cover&&!coverText.trim()){setError('A cover letter is required.');setStep(5);return}
    if(!consent||!accuracy){setError('Confirm the declaration and privacy consent.');return}
    setBusy('submit');setError('');
    try{
      const d=new FormData();
      d.set('resume',resume);
      if(cover)d.set('coverLetter',cover);
      d.set('application',JSON.stringify({...payload(),consent:true,accuracyConfirmed:true}));
      const r=await call<{data:{applicationId:string;submissionVersion:number;deduplicated:boolean}}>(
        `/api/public/recruiting/apply/${encodeURIComponent(token)}/submit`,
        {method:'POST',body:d},
      );
      localStorage.removeItem(key);
      setSubmitted(r.data);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to submit application.');
    }finally{
      setBusy('');
    }
  }

  if(error&&!ctx)return <Shell><section className="prehireCard"><h1>Candidate application</h1><div className="error">{error}</div></section></Shell>;
  if(!ctx)return <Shell><section className="prehireCard"><LoadingState label="Loading candidate application…"/></section></Shell>;

  if(submitted)return <Shell><section className="prehireCard stack">
    <Brand ctx={ctx}/>
    <h1>Application submitted successfully</h1>
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
      {error&&<div className="error">{error}</div>}
      {notice&&<div className="success">{notice}</div>}
    </section>

    <form className="stack" onSubmit={submit}>
      {step===1&&<section className="prehireCard stack">
        <h2>1. Resume</h2>
        <p className="muted">Upload PDF, DOCX, TXT, RTF or Markdown. OPSIQO parses it to prefill your application; you review and correct every section before submitting.</p>
        <input className="input" type="file" accept=".pdf,.docx,.txt,.rtf,.md" required onChange={e=>{
          const f=e.target.files?.[0]||null;setParseNote('');
          if(f&&/cover[ _-]*letter/i.test(f.name)&&!/(?:resume|\bcv\b)/i.test(f.name)){
            setResume(null);setError('This file name looks like a cover letter. Please choose your resume.');e.currentTarget.value='';return;
          }
          setResume(f);if(f)void parse(f);
        }}/>
        {resume&&<div className="notice">Attached: <strong>{resume.name}</strong></div>}
        {parseNote&&<div className="success">{parseNote}</div>}
        {parseAssurance&&<div className="notice" data-h50-5h-parse-assurance="true"><strong>{parseAssurance.aiVerified?'AI-verified parse':'Deterministic draft'} · Machine trust {parseAssurance.machineTrust}%</strong><br/>{parseAssurance.unresolvedFields.length?`Needs review: ${parseAssurance.unresolvedFields.join(', ')}`:'No machine-detected unresolved fields.'}<br/><span className="muted">Machine parsing is never represented as 100% certain. The application becomes 100% candidate-verified only after you review and confirm the parsed information.</span></div>}
        <button type="button" className="button" disabled={!resume||busy==='parse'} onClick={()=>resume&&void parse(resume)}>{busy==='parse'?'Parsing…':'Parse / refresh fields'}</button>
      </section>}

      {step===2&&<section className="prehireCard stack">
        <h2>2. Your information</h2>
        <p className="muted">Everything below is editable. Correct any parsing error before continuing.</p>
        <div className="formGrid">
          <F label="First name" value={p.firstName} onChange={v=>set('firstName',v)} required/>
          <F label="Last name" value={p.lastName} onChange={v=>set('lastName',v)} required/>
          <F label="Email" type="email" value={p.email} onChange={v=>set('email',v)} required/>
          <F label="Phone" value={p.phone} onChange={v=>set('phone',v)}/>
          <F label="Location" value={p.location} onChange={v=>set('location',v)}/>
          <F label="Professional headline" value={p.headline} onChange={v=>set('headline',v)}/>
        </div>
        <TA label="Professional summary" value={p.summary} onChange={v=>set('summary',v)} rows={6}/>
      </section>}

      {step===3&&<section className="prehireCard stack" data-h50-5g-resume-editor="true">
        <div className="toolbar">
          <div>
            <h2>3. Resume review & edit</h2>
            <p className="muted">Review and edit the parsed professional experience, skills, education, certifications and every other resume section. Add a custom section if your resume contains something not listed.</p>
          </div>
          <span className="badge">Candidate reviewed</span>
        </div>

        <F label="Estimated years of experience from resume · review" type="number" value={p.yearsOfExperience} onChange={v=>set('yearsOfExperience',v)}/>
        <TA label="Professional experience" value={p.professionalExperience} onChange={v=>set('professionalExperience',v)} rows={14}/>
        <TA label="Skills / technical skills / tools · one per line" value={p.skills} onChange={v=>set('skills',v)} rows={8}/>
        <TA label="Education · one item per line" value={p.education} onChange={v=>set('education',v)} rows={8}/>
        <TA label="Certifications / licences · one per line" value={p.certifications} onChange={v=>set('certifications',v)} rows={6}/>
        <TA label="Languages" value={p.languages} onChange={v=>set('languages',v)} rows={5}/>
        <TA label="Projects" value={p.projects} onChange={v=>set('projects',v)} rows={7}/>
        <TA label="Volunteer / community experience" value={p.volunteerExperience} onChange={v=>set('volunteerExperience',v)} rows={7}/>
        <TA label="Awards / honours" value={p.awards} onChange={v=>set('awards',v)} rows={5}/>
        <TA label="Publications / presentations" value={p.publications} onChange={v=>set('publications',v)} rows={5}/>
        <TA label="Additional information / affiliations / interests" value={p.additionalInformation} onChange={v=>set('additionalInformation',v)} rows={7}/>

        <div className="toolbar">
          <strong>Other resume sections</strong>
          <button type="button" className="button secondary" onClick={()=>setP(v=>({...v,customResumeSections:[...v.customResumeSections,{id:crypto.randomUUID(),title:'',content:''}]}))}>Add another resume section</button>
        </div>

        {p.customResumeSections.map((section,index)=><div className="card insetCard stack" key={section.id}>
          <F label="Section title" value={section.title} onChange={value=>setP(v=>({...v,customResumeSections:v.customResumeSections.map((s,i)=>i===index?{...s,title:value}:s)}))}/>
          <TA label="Section content" value={section.content} onChange={value=>setP(v=>({...v,customResumeSections:v.customResumeSections.map((s,i)=>i===index?{...s,content:value}:s)}))} rows={6}/>
          <button type="button" className="button secondary" onClick={()=>setP(v=>({...v,customResumeSections:v.customResumeSections.filter((_,i)=>i!==index)}))}>Remove section</button>
        </div>)}

        <div className="notice">
          <strong>Evidence boundary:</strong> your reviewed profile is saved for recruiter review, but the internal Fit % remains grounded in the original uploaded resume evidence. Your edits do not silently rewrite the source document used for automated evidence matching.
        </div>
        <label className="notice"><input type="checkbox" checked={resumeReviewed} onChange={e=>setResumeReviewed(e.target.checked)}/> <strong>I reviewed every parsed resume section and corrected any inaccurate or missing information.</strong><br/><span className="muted">Checking this makes the submitted profile candidate-verified; it does not claim that AI extraction itself is infallible.</span></label>
      </section>}

      {step===4&&<section className="prehireCard stack">
        <h2>4. Screening questions</h2>
        {ctx.application.screeningQuestions.map(q=><Question key={q.id} q={q} value={answers[q.id]||''} onChange={v=>setAnswers(x=>({...x,[q.id]:v}))}/>)}
        {!ctx.application.screeningQuestions.length&&<div className="notice">No additional screening questions.</div>}
      </section>}

      {step===5&&<section className="prehireCard stack">
        <h2>5. Cover letter & professional/social links</h2>
        <label className="field"><span>Cover letter file {ctx.application.coverLetterRequired?'· required':'· optional'}</span>
          <input className="input" type="file" accept=".pdf,.docx,.txt,.rtf,.md" onChange={e=>{
            const f=e.target.files?.[0]||null;
            if(f&&/(?:resume|\bcv\b)/i.test(f.name)&&!/cover[ _-]*letter/i.test(f.name)){
              setCover(null);setError('This file name looks like a resume. Please choose your cover letter.');e.currentTarget.value='';return;
            }
            setError('');setCover(f);
          }}/>
        </label>
        <label className="field"><span>Or paste / write cover letter</span><textarea className="input" rows={9} value={coverText} onChange={e=>setCoverText(e.target.value)}/></label>
        <div className="formGrid">
          <F label="LinkedIn" type="url" value={p.linkedinUrl} onChange={v=>set('linkedinUrl',v)}/>
          <F label="Portfolio / website" type="url" value={p.portfolioUrl} onChange={v=>set('portfolioUrl',v)}/>
          <F label="GitHub" type="url" value={p.githubUrl} onChange={v=>set('githubUrl',v)}/>
          <F label="Other social/professional profile" type="url" value={p.socialMediaUrl} onChange={v=>set('socialMediaUrl',v)}/>
        </div>
        <TA label="Optional note to recruiter" value={p.candidateStatement} onChange={v=>set('candidateStatement',v)} rows={5}/>
        <div className="notice">Professional/social links are optional and excluded from automated job-fit scoring.</div>
      </section>}

      {step===6&&<section className="prehireCard stack">
        <h2>6. Review & submit</h2>
        <div className="grid2">
          <Review l="Candidate" v={`${p.firstName} ${p.lastName}`}/>
          <Review l="Email" v={p.email}/>
          <Review l="Resume" v={resume?.name||'Not attached'}/>
          <Review l="Cover letter" v={cover?.name||(coverText.trim()?'Pasted text':'Not provided')}/>
          <Review l="Professional experience" v={p.professionalExperience.trim()?'Reviewed':'Not provided'}/>
          <Review l="Resume sections" v={`${5+p.customResumeSections.filter(x=>x.title.trim()&&x.content.trim()).length}+ reviewed/editable sections`}/>
          <Review l="Machine parse trust" v={parseAssurance?`${parseAssurance.machineTrust}% · ${parseAssurance.aiVerified?'AI verified':'deterministic draft'}`:'Not available'}/>
          <Review l="Candidate verification" v={resumeReviewed?'100% candidate-verified':'Review required'}/>
        </div>
        <div className="row wrap">
          <button type="button" className="button secondary" onClick={()=>setStep(2)}>Edit personal information</button>
          <button type="button" className="button secondary" onClick={()=>setStep(3)}>Edit resume sections</button>
        </div>
        <label><input type="checkbox" checked={accuracy} onChange={e=>setAccuracy(e.target.checked)} required/> I confirm this application and supporting documents are accurate to the best of my knowledge.</label>
        <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/> I consent to processing my application information for recruitment purposes and acknowledge the privacy notice.</label>
        {ctx.application.allowTalentPoolConsent&&<label><input type="checkbox" checked={talent} onChange={e=>setTalent(e.target.checked)}/> I agree that my application may be considered for other suitable opportunities. Optional.</label>}
        <div className="notice">Protected characteristics and social-profile content are excluded from automated fit analysis. OPSIQO does not automatically hire, reject or advance candidates.</div>
        <button className="button" disabled={busy==='submit'}>{busy==='submit'?'Submitting…':'Submit application'}</button>
      </section>}

      <section className="prehireCard">
        <div className="row wrap">
          <button type="button" className="button secondary" disabled={step<=1} onClick={()=>setStep(x=>Math.max(1,x-1))}>Back</button>
          {step<6&&<button type="button" className="button" disabled={step===1&&(!resume||busy==='parse'||!parseNote)} onClick={()=>setStep(x=>Math.min(6,x+1))}>Continue</button>}
          <button type="button" className="button secondary" disabled={busy==='draft'} onClick={()=>void saveDraft()}>{busy==='draft'?'Saving…':'Save & continue later'}</button>
        </div>
        <p className="muted">Draft fields are retained securely for 14 days. File attachments are retained only after final submission.</p>
      </section>
    </form>

    <div className="notice">Powered by OPSIQO · Evidence-first recruiting · Human review required</div>
  </Shell>;
}

function Shell({children}:{children:ReactNode}){return <div className="prehireShell"><main className="prehireMain">{children}</main></div>}
function Brand({ctx}:{ctx:Context}){return <div className="prehireBrand"><img className="prehireBrandLogo" src={ctx.organization.logoUrl||'/brand/opsiqo-wordmark.png'} alt={ctx.organization.name}/><span>CANDIDATE APPLICATION</span></div>}
function F({label,value,onChange,type='text',required}:{label:string;value:string;onChange:(v:string)=>void;type?:string;required?:boolean}){return <label className="field"><span>{label}</span><input className="input" type={type} value={value} required={required} onChange={e=>onChange(e.target.value)}/></label>}
function TA({label,value,onChange,rows=5}:{label:string;value:string;onChange:(v:string)=>void;rows?:number}){return <label className="field"><span>{label}</span><textarea className="input" rows={rows} value={value} onChange={e=>onChange(e.target.value)}/></label>}
function Review({l,v}:{l:string;v:string}){return <div className="notice"><span className="muted">{l}</span><br/><strong>{v||'—'}</strong></div>}
function Question({q,value,onChange}:{q:Q;value:string;onChange:(v:string)=>void}){return <label className="field"><span>{q.label}{q.required?' · required':''}</span>{q.type==='yes_no'?<select className="input" required={q.required} value={value} onChange={e=>onChange(e.target.value)}><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select>:q.type==='select'?<select className="input" required={q.required} value={value} onChange={e=>onChange(e.target.value)}><option value="">Select</option>{(q.options||[]).map(o=><option key={o}>{o}</option>)}</select>:<input className="input" required={q.required} type={q.type==='number'?'number':'text'} value={value} onChange={e=>onChange(e.target.value)}/>}</label>}
