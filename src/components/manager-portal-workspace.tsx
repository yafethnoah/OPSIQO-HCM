'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ActorContext } from '@/domain/security';
import type { SuperAppDashboard } from '@/domain/superapp';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { LoadingState } from '@/components/data-states';

type TeamRow={worker:{id:string;displayName:string;employeeNumber:string;workEmail:string;status:string};assignment:{startDate:string};position?:{title:string};orgUnit?:{name:string}};

type ManagerAction={label:string;description:string;href:string;permission:string;kind:'approval'|'team'|'support'};
const MANAGER_ACTIONS:ManagerAction[]=[
 {label:'Leave approvals',description:'Review pending team vacation and leave requests.',href:'/time',permission:'leave.approve',kind:'approval'},
 {label:'Timesheet approvals',description:'Review submitted timesheets and time exceptions.',href:'/time',permission:'time.approve',kind:'approval'},
 {label:'Performance reviews',description:'Complete manager reviews, goals and check-ins.',href:'/performance',permission:'performance.review',kind:'approval'},
 {label:'Team learning',description:'Assign learning and review overdue team requirements.',href:'/learning',permission:'learning.assign',kind:'team'},
 {label:'Onboarding',description:'Track new-hire onboarding work assigned to you.',href:'/onboarding',permission:'onboarding.read',kind:'team'},
 {label:'Recruiting',description:'Requisitions, interviews and hiring-manager work.',href:'/recruiting',permission:'recruiting.read',kind:'team'},
 {label:'Team compensation',description:'Review compensation information available to your manager role.',href:'/compensation',permission:'compensation.read',kind:'team'},
 {label:'HR support',description:'Request help from HR for a team or management matter.',href:'/experience',permission:'service.request',kind:'support'},
];

export function ManagerPortalWorkspace(){
 const[actor,setActor]=useState<ActorContext|null>(null),[dashboard,setDashboard]=useState<SuperAppDashboard|null>(null),[team,setTeam]=useState<TeamRow[]>([]),[error,setError]=useState('');
 const load=async()=>{setError('');try{const org=activeOrgId();const me=await apiFetch<{actor:ActorContext}>('/api/me');if(me.actor.role!=='manager'&&!['super_admin','org_admin','hr_admin','hr_partner'].includes(me.actor.role))throw new Error('Manager self-service access is not enabled for this membership.');setActor(me.actor);const[d,t]=await Promise.all([apiFetch<{data:SuperAppDashboard}>(`/api/organizations/${org}/superapp/dashboard`),apiFetch<{data:TeamRow[]}>(`/api/organizations/${org}/manager/team`)]);setDashboard(d.data);setTeam(t.data);}catch(e){setError(e instanceof Error?e.message:'Unable to load Manager Self-Service.')}};
 useEffect(()=>{void load();const h=()=>void load();window.addEventListener('opsiqo:organization-changed',h);return()=>window.removeEventListener('opsiqo:organization-changed',h)},[]);
 const actions=useMemo(()=>MANAGER_ACTIONS.filter(a=>actor?.permissions.includes(a.permission as any)),[actor]);
 if(!actor||!dashboard)return <div className="stack">{error&&<div className="error" role="alert">{error}</div>}<LoadingState label="Loading your manager workspace…"/></div>;
 const m=dashboard.manager;
 return <div className="stack managerPortal">
  {error&&<div className="error" role="alert">{error}</div>}
  <section className="card managerPortalHero"><div><span className="eyebrow">Manager self-service</span><h2>My Team Command Center</h2><p className="muted">Prioritized approvals, team risks and people actions from your governed manager scope.</p></div><div className="row wrap"><Link className="button" href="/home">Ask OPSIQO</Link><Link className="button secondary" href="/experience">Ask HR</Link></div></section>
  <section className="metricGrid"><Metric label="Direct reports" value={m?.teamSize??team.length} hint={`${m?.active??team.filter(x=>x.worker.status==='active').length} active`}/><Metric label="Leave approvals" value={m?.pendingLeaveApprovals??0} hint="Awaiting manager action"/><Metric label="Timesheets" value={m?.submittedTimesheets??0} hint="Submitted for review"/><Metric label="Performance" value={m?.awaitingManagerReviews??0} hint="Manager reviews waiting"/><Metric label="Learning overdue" value={m?.overdueLearning??0} hint="Team assignments overdue"/><Metric label="Compliance gaps" value={m?.teamComplianceGaps??0} hint={m?.teamComplianceRate==null?'Not fully assessed':`${m.teamComplianceRate}% assessed compliance`}/></section>
  <div className="grid2">
   <section className="card stack"><div className="rowBetween"><div><span className="eyebrow">Priority queue</span><h2 className="sectionTitle">What needs my attention?</h2></div><Link className="textLink" href="/notifications">All alerts →</Link></div>{dashboard.attention.length?<div className="managerAttentionList">{dashboard.attention.slice(0,10).map(a=><Link key={a.id} href={a.href} className="managerAttentionRow"><div><strong>{a.title}</strong><span>{a.summary}</span>{a.dueAt&&<small>Due {new Date(a.dueAt).toLocaleString()}</small>}</div><span className={`portalSeverity ${a.severity}`}>{a.count??a.severity}</span></Link>)}</div>:<p className="muted">No manager actions are currently flagged.</p>}</section>
   <section className="card stack"><div><span className="eyebrow">Manager services</span><h2 className="sectionTitle">Quick actions</h2></div><div className="managerActionGrid">{actions.map(a=><Link key={a.label} href={a.href} className={`managerActionCard ${a.kind}`}><strong>{a.label}</strong><span>{a.description}</span><span aria-hidden="true">→</span></Link>)}</div></section>
  </div>
  <section className="card tableWrap"><div className="rowBetween"><div><span className="eyebrow">My reporting line</span><h2 className="sectionTitle">Direct reports</h2></div><Link className="textLink" href="/organization">Organization chart →</Link></div><table><thead><tr><th>Employee</th><th>Position</th><th>Org unit</th><th>Status</th><th></th></tr></thead><tbody>{team.map(row=><tr key={row.worker.id}><td><strong>{row.worker.displayName}</strong><div className="muted">{row.worker.employeeNumber}</div></td><td>{row.position?.title||'—'}</td><td>{row.orgUnit?.name||'—'}</td><td><span className="badge">{row.worker.status}</span></td><td><Link className="textLink" href={`/people/${row.worker.id}`}>View →</Link></td></tr>)}{!team.length&&<tr><td colSpan={5} className="muted">No current direct reports were found for this manager membership.</td></tr>}</tbody></table></section>
  <section className="card managerPortalBoundary"><strong>Manager scope is enforced server-side.</strong><span>Manager Self-Service does not grant unrestricted HR access. Team data and actions remain limited by your role, reporting relationship and explicit permissions.</span></section>
 </div>;
}
function Metric({label,value,hint}:{label:string;value:string|number;hint:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
