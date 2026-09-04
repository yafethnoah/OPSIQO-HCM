'use client';
import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import type { ManagerCopilotDashboard } from '@/domain/opsiqo-one-v7-11';
import { activeOrgId,apiFetch,isMfaRequiredError } from '@/lib/http/client';
import { mfaSetupHref } from '@/lib/auth/mfa-client';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';
export function ManagerCopilotWorkspace(){
 const translationRoot=useRef<HTMLDivElement>(null);useLegacySurfaceTranslation('manager_copilot',translationRoot);
 const[data,setData]=useState<ManagerCopilotDashboard|null>(null),[error,setError]=useState(''),[mfa,setMfa]=useState(false);
 useEffect(()=>{let alive=true;apiFetch<{data:ManagerCopilotDashboard}>(`/api/organizations/${activeOrgId()}/opsiqo-one/manager-copilot`).then(r=>alive&&setData(r.data)).catch(e=>{if(!alive)return;if(isMfaRequiredError(e))setMfa(true);else setError(e instanceof Error?e.message:'Unable to load Manager Copilot.')});return()=>{alive=false}},[]);
 if(mfa)return <section className="card stack"><h2 className="sectionTitle">Multi-factor authentication required</h2><Link className="button" href={mfaSetupHref('/manager-copilot')}>Set up MFA</Link></section>;
 if(!data)return <section className="card">{error?<div className="error">{error}</div>:<div className="loadingState"><div className="loadingDot"/><div><strong>Preparing Manager Copilot</strong><small>Loading manager-scoped team evidence only.</small></div></div>}</section>;
 return <div ref={translationRoot} className="stack" data-opsiqo-one="manager-copilot">
  <section className="card oneHero"><div><span className="eyebrow">OPSIQO Cortex · Manager Copilot</span><h1>Prepare, prioritize and lead without hunting through HR modules</h1><p className="muted">Operational summaries stay inside your authorized manager scope and never infer protected traits or hidden psychological/health attributes.</p></div><Link className="button" href="/home">Ask OPSIQO</Link></section>
  <section className="metricGrid"><div className="metricCard"><span>Direct reports</span><strong>{data.teamSize}</strong><small>Manager-scoped team</small></div><div className="metricCard"><span>Priority items</span><strong>{data.priorities.length}</strong><small>Verified operational attention</small></div><div className="metricCard"><span>Suggested actions</span><strong>{data.suggestedActions.length}</strong><small>Human-controlled next steps</small></div></section>
  <div className="grid2"><section className="card"><h2 className="sectionTitle">What needs my attention?</h2>{data.priorities.length?<div className="oneWorkList">{data.priorities.map((x,i)=><Link className={`oneWorkItem ${x.severity}`} href={x.href} key={`${x.title}-${i}`}><div><strong>{x.title}</strong><p className="muted">{x.summary}</p>{x.dueAt&&<small>Due {x.dueAt.slice(0,10)}</small>}</div><span>›</span></Link>)}</div>:<p className="muted">No manager action is currently flagged.</p>}</section><section className="card"><h2 className="sectionTitle">Prepare for a one-on-one</h2><ol className="copilotChecklist">{data.oneOnOnePreparation.map(x=><li key={x}>{x}</li>)}</ol><div className="warning">Manager Copilot supports preparation. It does not assign ratings, diagnose employees or make promotion, discipline, compensation or termination decisions.</div></section></div>
  <section className="card"><h2 className="sectionTitle">Recommended manager actions</h2><div className="hubGrid compactHub">{data.suggestedActions.map(x=><Link className="agentCard" href={x.href} key={x.label}><strong>{x.label}</strong><p>{x.reason}</p><span>→</span></Link>)}</div></section>
  <section className="card tableWrap"><h2 className="sectionTitle">My team</h2><table><thead><tr><th>Employee</th><th>Position</th><th>Org unit</th><th>Status</th></tr></thead><tbody>{data.team.map(x=><tr key={x.workerId}><td><strong>{x.displayName}</strong><div className="muted">{x.employeeNumber}</div></td><td>{x.positionTitle||'—'}</td><td>{x.orgUnitName||'—'}</td><td><span className="badge">{x.status}</span></td></tr>)}</tbody></table></section>
  <section className="card employeePortalPrivacy"><strong>Governed manager support.</strong><span>{data.governanceNotice}</span></section>
 </div>;
}
