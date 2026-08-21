'use client';
import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import type { EmployeeConciergeDashboard } from '@/domain/opsiqo-one-v7-11';
import { activeOrgId,apiFetch,isMfaRequiredError } from '@/lib/http/client';
import { mfaSetupHref } from '@/lib/auth/mfa-client';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';

export function EmployeeConciergeWorkspace(){
 const translationRoot=useRef<HTMLDivElement>(null);useLegacySurfaceTranslation('employee_concierge',translationRoot);
 const[data,setData]=useState<EmployeeConciergeDashboard|null>(null),[error,setError]=useState(''),[mfa,setMfa]=useState(false);
 useEffect(()=>{let alive=true;apiFetch<{data:EmployeeConciergeDashboard}>(`/api/organizations/${activeOrgId()}/opsiqo-one/concierge`).then(r=>alive&&setData(r.data)).catch(e=>{if(!alive)return;if(isMfaRequiredError(e))setMfa(true);else setError(e instanceof Error?e.message:'Unable to load Employee Concierge.')});return()=>{alive=false}},[]);
 if(mfa)return <section className="card stack"><h2 className="sectionTitle">Multi-factor authentication required</h2><p className="muted">Privileged employee services are withheld until MFA is satisfied.</p><div><Link className="button" href={mfaSetupHref('/concierge')}>Set up MFA</Link></div></section>;
 if(!data)return <section className="card">{error?<div className="error">{error}</div>:<div className="loadingState"><div className="loadingDot"/><div><strong>Preparing Employee Concierge</strong><small>Loading only your permission-scoped HR context and published services.</small></div></div>}</section>;
 return <div ref={translationRoot} className="stack" data-opsiqo-one="employee-concierge">
  <section className="card oneHero"><div><span className="eyebrow">OPSIQO Cortex · Employee Concierge</span><h1>How can OPSIQO help you today?</h1><p className="muted">{data.employee.displayName}{data.employee.position?` · ${data.employee.position}`:''}{data.employee.orgUnit?` · ${data.employee.orgUnit}`:''}</p></div><Link className="button" href="/home">Ask OPSIQO</Link></section>
  {!data.employee.linked&&<section className="card notice"><strong>Employee record link required.</strong><p>Your account must be linked to an employee record before personal HR transactions can be prepared.</p></section>}
  <section className="metricGrid"><Metric label="Leave available" value={`${data.leaveAvailableHours.toFixed(1)} h`} helper={`${data.pendingLeaveRequests} pending request(s)`}/><Metric label="Open HR requests" value={data.openHrRequests} helper="Trackable service requests"/><Metric label="Published services" value={data.services.length} helper="Available to your membership"/><Metric label="Knowledge articles" value={data.knowledge.length} helper="Published HR guidance"/></section>
  <section className="card"><div className="toolbar"><div><h2 className="sectionTitle">Common outcomes</h2><p className="muted">Start with the result you want instead of finding a module.</p></div></div><div className="hubGrid compactHub">{data.quickActions.map(x=><Link className="agentCard" href={x.href} key={x.label}><strong>{x.label}</strong><p>{x.description}</p><span aria-hidden="true">→</span></Link>)}</div></section>
  <div className="grid2"><section className="card"><h2 className="sectionTitle">HR Service Center</h2>{data.services.length?<div className="oneWorkList">{data.services.map(x=><Link className="oneWorkItem info" href="/experience" key={x.id}><div><strong>{x.name}</strong><p className="muted">{x.description}</p><small>{x.category}</small></div><span>›</span></Link>)}</div>:<p className="muted">No HR service catalog items are currently published.</p>}</section><section className="card"><h2 className="sectionTitle">Organizational knowledge</h2>{data.knowledge.length?<div className="oneWorkList">{data.knowledge.map(x=><Link className="oneWorkItem info" href="/experience" key={x.id}><div><strong>{x.title}</strong><p className="muted">{x.summary}</p><small>{x.category}</small></div><span>›</span></Link>)}</div>:<p className="muted">No published HR knowledge articles are currently available.</p>}</section></div>
  <section className="card employeePortalPrivacy"><strong>Private by design.</strong><span>{data.privacyNotice}</span></section>
 </div>;
}
function Metric({label,value,helper}:{label:string;value:string|number;helper:string}){return <div className="metricCard"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>}
