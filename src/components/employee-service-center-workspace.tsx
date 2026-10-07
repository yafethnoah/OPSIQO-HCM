'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import type { ExperienceDashboard } from '@/domain/experience';
import { activeOrgId,apiFetch } from '@/lib/http/client';
import { LoadingState } from './data-states';
import { IntelligentHrRequestComposer } from './intelligent-hr-request-composer';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';

export function EmployeeServiceCenterWorkspace(){
  const translationRoot=useRef<HTMLDivElement>(null);
  useLegacySurfaceTranslation('employee_service',translationRoot);
  const[data,setData]=useState<ExperienceDashboard|null>(null),[error,setError]=useState(''),[q,setQ]=useState('');
  const load=()=>apiFetch<{data:ExperienceDashboard}>(`/api/organizations/${activeOrgId()}/experience/dashboard`).then(r=>setData(r.data)).catch(e=>setError(e instanceof Error?e.message:'Unable to load Employee Service Center.'));
  useEffect(()=>{load();const h=()=>load();window.addEventListener('opsiqo:organization-changed',h);return()=>window.removeEventListener('opsiqo:organization-changed',h);},[]);
  const knowledge=useMemo(()=>data?.knowledge.filter(a=>(a.title+' '+a.summary+' '+a.keywords.join(' ')).toLowerCase().includes(q.toLowerCase()))||[],[data,q]);
  if(!data)return <div className="stack" ref={translationRoot}>{error&&<div className="error">{error}</div>}<LoadingState label="Opening Employee Service Center…"/></div>;
  return <div className="stack" ref={translationRoot}>
    {error&&<div className="error">{error}</div>}
    <section className="card oneHero"><div><span className="eyebrow">OPSIQO ONE · Employee Service Center</span><h1>Get help without repeating your story</h1><p className="muted">OPSIQO searches governed HR knowledge first, prepares routing and SLA triage automatically, and creates an HR request only when individualized help is still needed.</p></div></section>
    <div className="grid2">
      <IntelligentHrRequestComposer catalog={data.catalog} onSubmitted={load}/>
      <section className="card stack"><h2 className="sectionTitle">My requests</h2>{data.tickets.slice(0,10).map(t=><div className="experienceRow" key={t.id}><div><strong>{t.referenceNumber} · {t.subject}</strong><span>{t.status.replaceAll('_',' ')} · {t.priority} · target {t.resolutionDueAt.slice(0,10)}</span></div></div>)}{!data.tickets.length&&<p className="muted">You have no HR service requests in your current scope.</p>}</section>
    </div>
    <section className="card stack"><h2 className="sectionTitle">HR knowledge</h2><input aria-label="Search HR knowledge" className="input" placeholder="Search policies and how-to guidance" value={q} onChange={e=>setQ(e.target.value)}/><div className="knowledgeGrid">{knowledge.slice(0,12).map(a=><article className="card" key={a.id}><span className="badge">{a.category}</span><h3>{a.title}</h3><p>{a.summary}</p><details><summary>Read guidance</summary><div className="articleBody">{a.body}</div></details></article>)}</div></section>
  </div>;
}
