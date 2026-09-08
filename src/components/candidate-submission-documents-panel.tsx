'use client';

import {useEffect,useMemo,useState} from 'react';
import {activeOrgId,apiDownload,apiFetch} from '@/lib/http/client';
import type {StructuredResumeProfile} from '@/domain/structured-resume';

type ReviewedResume={
  summary?:string;
  professionalExperience?:string;
  skills?:string[];
  certifications?:string[];
  education?:string[];
  languages?:string;
  projects?:string;
  volunteerExperience?:string;
  awards?:string;
  publications?:string;
  additionalInformation?:string;
  structuredResume?:StructuredResumeProfile;
  customSections?:Array<{title:string;content:string}>;
  reviewedAt?:string;
  editorVersion?:string;
  structuredEditorVersion?:string;
};
type App={id:string;candidate?:{displayName:string;email:string;linkedinUrl?:string;portfolioUrl?:string;githubUrl?:string;socialMediaUrl?:string;professionalLinks?:{type:string;url:string}[];candidateReviewedResume?:ReviewedResume};requisition?:{requisitionNumber:string;title:string}};
type Doc={id:string;type:'resume'|'cover_letter';version:number;fileName:string;contentType:string;size:number;createdAt:string;textPreview?:string};

export function CandidateSubmissionDocumentsPanel({applications}:{applications:App[]}){
  const[id,setId]=useState('');const[docs,setDocs]=useState<Doc[]>([]);const[error,setError]=useState('');
  const selected=useMemo(()=>applications.find(a=>a.id===id),[applications,id]);
  useEffect(()=>{if(!id){setDocs([]);return}void apiFetch<{data:Doc[]}>(`/api/organizations/${activeOrgId()}/recruiting/applications/${id}/documents`).then(r=>setDocs(r.data)).catch(e=>setError(e instanceof Error?e.message:'Unable to load documents.'))},[id]);
  async function download(d:Doc){try{const r=await apiDownload(`/api/organizations/${activeOrgId()}/recruiting/applications/${id}/documents/${d.id}`),u=URL.createObjectURL(r.blob),a=document.createElement('a');a.href=u;a.download=r.fileName||d.fileName;a.click();URL.revokeObjectURL(u)}catch(e){setError(e instanceof Error?e.message:'Unable to download.')}}
  const links=selected?.candidate?.professionalLinks?.length?selected.candidate.professionalLinks:[selected?.candidate?.linkedinUrl&&{type:'linkedin',url:selected.candidate.linkedinUrl},selected?.candidate?.portfolioUrl&&{type:'portfolio',url:selected.candidate.portfolioUrl},selected?.candidate?.githubUrl&&{type:'github',url:selected.candidate.githubUrl},selected?.candidate?.socialMediaUrl&&{type:'social',url:selected.candidate.socialMediaUrl}].filter(Boolean) as {type:string;url:string}[];
  const reviewed=selected?.candidate?.candidateReviewedResume,sr=reviewed?.structuredResume;
  return <section className="card stack" data-h50-5-candidate-documents="true" data-h50-5i-reviewed-structured-resume="true">
    <div className="toolbar"><div><h2 className="sectionTitle">Candidate Submission Evidence</h2><p className="muted">Resume and cover-letter versions are private recruiting evidence. Candidate-reviewed parsed fields are shown separately from the immutable uploaded resume evidence used for ATS fit analysis. Professional/social links are available for human review and are not used by the ATS fit score.</p></div><span className="badge">Private documents</span></div>
    <label className="field"><span>Application</span><select className="input" value={id} onChange={e=>setId(e.target.value)}><option value="">Select application</option>{applications.map(a=><option key={a.id} value={a.id}>{a.candidate?.displayName||a.id} · {a.requisition?.requisitionNumber} · {a.requisition?.title}</option>)}</select></label>
    {error&&<div className="error">{error}</div>}
    {selected&&<><div><strong>Professional / social links</strong><div className="chipWrap">{links.length?links.map(l=><a key={`${l.type}-${l.url}`} className="chip" href={l.url} target="_blank" rel="noreferrer">{l.type}</a>):<span className="muted">None submitted.</span>}</div></div>
      {reviewed&&<details className="card insetCard" open><summary><strong>Candidate-reviewed resume profile</strong></summary><p className="muted">These fields were parsed from the resume and then reviewed/edited by the candidate. They are recruiter context, not a replacement for the original source document or the ATS evidence record.</p><div className="stack">
        {reviewed.summary&&<Block t="Professional summary" v={reviewed.summary}/>}
        {sr?.employmentHistory?.length?<div><h3>Professional experience</h3>{sr.employmentHistory.map((x,i)=><div className="notice" key={x.id||i}><strong>{x.positionTitle||'Role'}{x.employer?` · ${x.employer}`:''}</strong><br/><span className="muted">{[x.startDate,x.current?'Present':x.endDate,x.location].filter(Boolean).join(' · ')}</span>{x.responsibilities?.length?<ul>{x.responsibilities.map((r,j)=><li key={j}>{r}</li>)}</ul>:null}</div>)}</div>:reviewed.professionalExperience&&<Block t="Professional experience" v={reviewed.professionalExperience}/>}
        {sr?.skills?.length?<Block t="Skills / technical skills" v={sr.skills.join('\n')}/>:reviewed.skills?.length?<Block t="Skills / technical skills" v={reviewed.skills.join('\n')}/>:null}
        {sr?.educationHistory?.length?<div><h3>Education</h3>{sr.educationHistory.map((x,i)=><div className="notice" key={x.id||i}><strong>{[x.degree,x.fieldOfStudy].filter(Boolean).join(' · ')||'Education'}</strong><br/>{x.institution}<br/><span className="muted">{[x.startDate,x.graduationDate||x.endDate,x.location].filter(Boolean).join(' · ')}</span></div>)}</div>:reviewed.education?.length?<Block t="Education" v={reviewed.education.join('\n')}/>:null}
        {sr?.certifications?.length?<Block t="Certifications / licences" v={sr.certifications.map(x=>[x.name,x.issuer,x.issuedAt].filter(Boolean).join(' · ')).join('\n')}/>:null}
        {sr?.languages?.length?<Block t="Languages" v={sr.languages.map(x=>[x.language,x.proficiency].filter(Boolean).join(' · ')).join('\n')}/>:null}
        {sr?.projects?.length?<Block t="Projects" v={sr.projects.map(x=>[x.name,x.role,x.description].filter(Boolean).join(' | ')).join('\n')}/>:null}
        {sr?.volunteerExperience?.length?<Block t="Volunteer / community experience" v={sr.volunteerExperience.map(x=>[x.organization,x.role,x.description].filter(Boolean).join(' | ')).join('\n')}/>:null}
        {sr?.awards?.length?<Block t="Awards / honours" v={sr.awards.map(x=>[x.title,x.issuer,x.date].filter(Boolean).join(' · ')).join('\n')}/>:null}
        {sr?.publications?.length?<Block t="Publications / presentations" v={sr.publications.map(x=>[x.title,x.publisher,x.date].filter(Boolean).join(' · ')).join('\n')}/>:null}
        {sr?.additionalInformation&&<Block t="Additional information" v={sr.additionalInformation}/>}
        {(reviewed.customSections||[]).map((s,i)=><Block key={`${s.title}-${i}`} t={s.title} v={s.content}/>)}
        {reviewed.reviewedAt&&<div className="muted">Candidate reviewed: {new Date(reviewed.reviewedAt).toLocaleString()} · {reviewed.structuredEditorVersion||reviewed.editorVersion||'resume editor'}</div>}
      </div></details>}
      <div className="tableWrap"><table><thead><tr><th>Document</th><th>Version</th><th>Submitted</th><th>Size</th><th>Action</th></tr></thead><tbody>{docs.map(d=><tr key={d.id}><td><strong>{d.fileName}</strong><div className="muted">{d.type.replaceAll('_',' ')}</div>{d.textPreview&&<details><summary>Text preview</summary><p className="muted">{d.textPreview}</p></details>}</td><td>v{d.version}</td><td>{new Date(d.createdAt).toLocaleString()}</td><td>{Math.ceil(d.size/1024)} KB</td><td><button type="button" className="button secondary" onClick={()=>void download(d)}>Download</button></td></tr>)}{!docs.length&&<tr><td colSpan={5} className="muted">No portal-submitted documents for this application.</td></tr>}</tbody></table></div>
    </>}
  </section>;
}
function Block({t,v}:{t:string;v:string}){return <div className="notice"><strong>{t}</strong><p style={{whiteSpace:'pre-wrap'}}>{v}</p></div>}
