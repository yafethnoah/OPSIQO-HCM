'use client';

import {useEffect,useMemo,useState} from 'react';
import {activeOrgId,apiDownload,apiFetch} from '@/lib/http/client';

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
  customSections?:Array<{title:string;content:string}>;
  reviewedAt?:string;
  editorVersion?:string;
};
type App={
  id:string;
  candidate?:{
    displayName:string;
    email:string;
    linkedinUrl?:string;
    portfolioUrl?:string;
    githubUrl?:string;
    socialMediaUrl?:string;
    professionalLinks?:{type:string;url:string}[];
    candidateReviewedResume?:ReviewedResume;
  };
  requisition?:{requisitionNumber:string;title:string}
};
type Doc={id:string;type:'resume'|'cover_letter';version:number;fileName:string;contentType:string;size:number;createdAt:string;textPreview?:string};

export function CandidateSubmissionDocumentsPanel({applications}:{applications:App[]}){
  const[id,setId]=useState('');
  const[docs,setDocs]=useState<Doc[]>([]);
  const[error,setError]=useState('');
  const selected=useMemo(()=>applications.find(a=>a.id===id),[applications,id]);

  useEffect(()=>{
    if(!id){setDocs([]);return}
    void apiFetch<{data:Doc[]}>(`/api/organizations/${activeOrgId()}/recruiting/applications/${id}/documents`)
      .then(r=>setDocs(r.data))
      .catch(e=>setError(e instanceof Error?e.message:'Unable to load documents.'));
  },[id]);

  async function download(d:Doc){
    try{
      const r=await apiDownload(`/api/organizations/${activeOrgId()}/recruiting/applications/${id}/documents/${d.id}`);
      const u=URL.createObjectURL(r.blob),a=document.createElement('a');
      a.href=u;a.download=r.fileName||d.fileName;a.click();URL.revokeObjectURL(u);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to download.');
    }
  }

  const links=selected?.candidate?.professionalLinks?.length
    ?selected.candidate.professionalLinks
    :[selected?.candidate?.linkedinUrl&&{type:'linkedin',url:selected.candidate.linkedinUrl},selected?.candidate?.portfolioUrl&&{type:'portfolio',url:selected.candidate.portfolioUrl},selected?.candidate?.githubUrl&&{type:'github',url:selected.candidate.githubUrl},selected?.candidate?.socialMediaUrl&&{type:'social',url:selected.candidate.socialMediaUrl}].filter(Boolean) as {type:string;url:string}[];

  const reviewed=selected?.candidate?.candidateReviewedResume;
  const Section=({title,value}:{title:string;value?:string|string[]})=>{
    const text=Array.isArray(value)?value.join('\n'):String(value||'').trim();
    if(!text)return null;
    return <div className="notice"><strong>{title}</strong><p style={{whiteSpace:'pre-wrap'}}>{text}</p></div>;
  };

  return <section className="card stack" data-h50-5-candidate-documents="true" data-h50-5g-reviewed-profile="true">
    <div className="toolbar">
      <div>
        <h2 className="sectionTitle">Candidate Submission Evidence</h2>
        <p className="muted">Resume and cover-letter versions are private recruiting evidence. Candidate-reviewed parsed fields are shown separately from the immutable uploaded resume evidence used for ATS fit analysis. Professional/social profile links are available for human review and are not used by the ATS fit score.</p>
      </div>
      <span className="badge">Private documents</span>
    </div>

    <label className="field"><span>Application</span><select className="input" value={id} onChange={e=>setId(e.target.value)}><option value="">Select application</option>{applications.map(a=><option key={a.id} value={a.id}>{a.candidate?.displayName||a.id} · {a.requisition?.requisitionNumber} · {a.requisition?.title}</option>)}</select></label>
    {error&&<div className="error">{error}</div>}

    {selected&&<>
      <div>
        <strong>Professional / social links</strong>
        <div className="chipWrap">{links.length?links.map(l=><a key={`${l.type}-${l.url}`} className="chip" href={l.url} target="_blank" rel="noreferrer">{l.type}</a>):<span className="muted">None submitted.</span>}</div>
      </div>

      {reviewed&&<details className="card insetCard" open>
        <summary><strong>Candidate-reviewed resume profile</strong></summary>
        <p className="muted">These fields were parsed from the resume and then reviewed/edited by the candidate. They are recruiter context, not a replacement for the original source document or the ATS evidence record.</p>
        <div className="stack">
          <Section title="Professional summary" value={reviewed.summary}/>
          <Section title="Professional experience" value={reviewed.professionalExperience}/>
          <Section title="Skills / technical skills" value={reviewed.skills}/>
          <Section title="Education" value={reviewed.education}/>
          <Section title="Certifications / licences" value={reviewed.certifications}/>
          <Section title="Languages" value={reviewed.languages}/>
          <Section title="Projects" value={reviewed.projects}/>
          <Section title="Volunteer / community experience" value={reviewed.volunteerExperience}/>
          <Section title="Awards / honours" value={reviewed.awards}/>
          <Section title="Publications / presentations" value={reviewed.publications}/>
          <Section title="Additional information" value={reviewed.additionalInformation}/>
          {(reviewed.customSections||[]).map((s,i)=><Section key={`${s.title}-${i}`} title={s.title} value={s.content}/>)}
          {reviewed.reviewedAt&&<div className="muted">Candidate reviewed: {new Date(reviewed.reviewedAt).toLocaleString()} · {reviewed.editorVersion||'resume editor'}</div>}
        </div>
      </details>}

      <div className="tableWrap"><table>
        <thead><tr><th>Document</th><th>Version</th><th>Submitted</th><th>Size</th><th>Action</th></tr></thead>
        <tbody>{docs.map(d=><tr key={d.id}>
          <td><strong>{d.fileName}</strong><div className="muted">{d.type.replaceAll('_',' ')}</div>{d.textPreview&&<details><summary>Text preview</summary><p className="muted">{d.textPreview}</p></details>}</td>
          <td>v{d.version}</td><td>{new Date(d.createdAt).toLocaleString()}</td><td>{Math.ceil(d.size/1024)} KB</td>
          <td><button type="button" className="button secondary" onClick={()=>void download(d)}>Download</button></td>
        </tr>)}{!docs.length&&<tr><td colSpan={5} className="muted">No portal-submitted documents for this application.</td></tr>}</tbody>
      </table></div>
    </>}
  </section>;
}
