'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';
import type { ActorContext } from '@/domain/security';
import type { ExperienceDashboard } from '@/domain/experience';
import type { SuperAppDashboard } from '@/domain/superapp';
import { LoadingState } from '@/components/data-states';

type LeaveType={id:string;code:string;name:string;paid:boolean;statutory:boolean;enabled:boolean};
type Balance={leaveTypeId:string;accruedHours:number;usedHours:number;pendingHours:number;availableHours:number};
type LeaveRequest={id:string;leaveTypeId:string;startDate:string;endDate:string;requestedHours:number;status:string;note?:string};
type LeaveWorkspace={types:LeaveType[];balances:Balance[];requests:LeaveRequest[]};
type ServiceLink={label:string;description:string;href:string;permission?:string;icon:string};

const SERVICE_LINKS:ServiceLink[]=[
  {label:'My HR profile',description:'Personal details, assignment and employment history.',href:'/self-service',permission:'self.read',icon:'◉'},
  {label:'Time & leave',description:'Request vacation or leave, view balances, clock time and manage timesheets.',href:'/time',permission:'time.read',icon:'◷'},
  {label:'Documents & policies',description:'Access employee documents, policies and required acknowledgements.',href:'/compliance',permission:'documents.read',icon:'▣'},
  {label:'Learning',description:'Courses, assigned learning, skills and certificates.',href:'/learning',permission:'learning.read',icon:'△'},
  {label:'Performance',description:'Goals, check-ins, reviews and development actions.',href:'/performance',permission:'performance.read',icon:'◆'},
  {label:'Pay & rewards',description:'View compensation and total rewards information available to you.',href:'/compensation',permission:'compensation.read',icon:'$'},
  {label:'Career',description:'Career paths, development opportunities and growth planning.',href:'/career',permission:'career.read',icon:'↗'},
  {label:'HR help',description:'Submit and track HR service requests or search HR guidance.',href:'/experience',permission:'service.read',icon:'♡'},
  {label:'Recognition',description:'Recognize a colleague or review employee-experience activity.',href:'/experience',permission:'recognition.send',icon:'★'},
  {label:'Safety',description:'Report a workplace health or safety concern.',href:'/safety',permission:'safety.report',icon:'✚'},
  {label:'Notifications',description:'Review reminders, approvals, due dates and HR updates.',href:'/notifications',permission:'notifications.read',icon:'◉'},
];

const fmtDate=(v:string)=>{try{return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(new Date(`${v}T12:00:00`));}catch{return v}};
const statusClass=(status:string)=>['approved','completed','resolved','closed'].includes(status)?'successBadge':['rejected','cancelled','denied'].includes(status)?'dangerBadge':'badge';

export function EmployeePortalWorkspace(){
  const translationRoot=useRef<HTMLDivElement>(null);
  useLegacySurfaceTranslation('employee_portal',translationRoot);
  const[actor,setActor]=useState<ActorContext|null>(null);
  const[dashboard,setDashboard]=useState<SuperAppDashboard|null>(null);
  const[leave,setLeave]=useState<LeaveWorkspace|null>(null);
  const[experience,setExperience]=useState<ExperienceDashboard|null>(null);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[busy,setBusy]=useState(false);
  const[selectedServiceId,setSelectedServiceId]=useState('');

  const load=async()=>{
    setError('');
    try{
      const me=await apiFetch<{actor:ActorContext}>('/api/me');
      setActor(me.actor);
      if(!me.actor.permissions.includes('self.read'))throw new Error('Employee self-service access is not enabled for this membership.');
      const org=activeOrgId();
      const [homeResult,leaveResult,experienceResult]=await Promise.allSettled([
        apiFetch<{data:SuperAppDashboard}>(`/api/organizations/${org}/superapp/dashboard`),
        me.actor.workerId&&me.actor.permissions.includes('leave.read')
          ?apiFetch<{data:LeaveWorkspace}>(`/api/organizations/${org}/leave/requests?workerId=${encodeURIComponent(me.actor.workerId)}`)
          :Promise.resolve({data:null as unknown as LeaveWorkspace}),
        me.actor.permissions.includes('service.read')||me.actor.permissions.includes('experience.read')
          ?apiFetch<{data:ExperienceDashboard}>(`/api/organizations/${org}/experience/dashboard`)
          :Promise.resolve({data:null as unknown as ExperienceDashboard}),
      ]);
      if(homeResult.status==='fulfilled')setDashboard(homeResult.value.data);else throw homeResult.reason;
      setLeave(leaveResult.status==='fulfilled'?leaveResult.value.data:null);
      setExperience(experienceResult.status==='fulfilled'?experienceResult.value.data:null);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load the Employee Portal.');}
  };

  useEffect(()=>{void load();const h=()=>void load();window.addEventListener('opsiqo:organization-changed',h);return()=>window.removeEventListener('opsiqo:organization-changed',h);},[]);

  const availableServices=useMemo(()=>SERVICE_LINKS.filter(s=>!s.permission||actor?.permissions.includes(s.permission as any)),[actor]);
  const typeMap=useMemo(()=>Object.fromEntries((leave?.types||[]).map(t=>[t.id,t])),[leave]);
  const totalAvailable=useMemo(()=>(leave?.balances||[]).reduce((n,b)=>n+Number(b.availableHours||0),0),[leave]);
  const pendingLeave=useMemo(()=>(leave?.requests||[]).filter(r=>r.status==='pending').length,[leave]);
  const serviceByCode=useMemo(()=>Object.fromEntries((experience?.catalog||[]).map(c=>[c.code,c])),[experience]);
  const quickServices=[
    ['PERSONAL_INFO_CHANGE','Update my information','Address, phone, preferred name or emergency contact'],
    ['EMPLOYMENT_LETTER','Employment letter','Request an employment or verification letter'],
    ['BENEFITS_SUPPORT','Benefits support','Benefits question or governed change request'],
    ['PAYROLL_QUESTION','Payroll question','Ask about pay or report a payroll concern'],
    ['EXPENSE_REIMBURSEMENT','Expense / reimbursement','Submit an expense or reimbursement request'],
    ['SCHEDULE_CHANGE','Schedule change','Request a schedule adjustment'],
    ['REMOTE_WORK_REQUEST','Remote / hybrid work','Request a working-arrangement change'],
    ['EQUIPMENT_ACCESS','Equipment / access','Request equipment, software or system access'],
  ] as const;

  async function submitLeave(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!actor?.workerId)return setError('Your membership must be linked to an employee record before leave can be requested.');
    const f=new FormData(e.currentTarget);
    setBusy(true);setError('');setNotice('');
    try{
      await apiFetch(`/api/organizations/${activeOrgId()}/leave/requests`,{method:'POST',body:JSON.stringify({workerId:actor.workerId,leaveTypeId:String(f.get('leaveTypeId')||''),startDate:String(f.get('startDate')||''),endDate:String(f.get('endDate')||''),requestedHours:Number(f.get('requestedHours')||0)||undefined,note:String(f.get('note')||'')||undefined})});
      setNotice('Your leave request was submitted and is now in the approval workflow.');
      e.currentTarget.reset();
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Leave request could not be submitted.');}
    finally{setBusy(false);}
  }

  async function submitService(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!actor?.workerId)return setError('Your membership must be linked to an employee record before an HR service request can be submitted.');
    const f=new FormData(e.currentTarget);
    setBusy(true);setError('');setNotice('');
    try{
      await apiFetch(`/api/organizations/${activeOrgId()}/service/tickets`,{method:'POST',body:JSON.stringify({catalogItemId:String(f.get('catalogItemId')||''),subject:String(f.get('subject')||''),description:String(f.get('description')||''),confidentiality:'standard'})});
      setNotice('Your HR service request was submitted. You can track it below or in HR Help.');
      e.currentTarget.reset();
      setSelectedServiceId('');
      await load();
    }catch(err){setError(err instanceof Error?err.message:'HR service request could not be submitted.');}
    finally{setBusy(false);}
  }

  if(!actor||!dashboard)return <div ref={translationRoot} className="stack">{error&&<div className="error" role="alert">{error}</div>}<LoadingState label="Loading your employee services…"/></div>;
  const employee=dashboard.employee;
  const worker=employee.worker;

  return <div ref={translationRoot} className="stack employeePortal">
    {error&&<div className="error" role="alert">{error}</div>}
    {notice&&<div className="success" role="status">{notice}</div>}

    <section className="employeePortalHero card"><div><span className="eyebrow">Employee self-service</span><h2>{worker?.displayName||'My Employee Portal'}</h2><p className="muted">{dashboard.employee.assignment?.positionTitle||'Employee'}{dashboard.employee.assignment?.orgUnitName?` · ${dashboard.employee.assignment.orgUnitName}`:''}</p></div><div className="employeePortalHeroActions"><Link className="button" href="/concierge">Employee Concierge</Link><Link className="button secondary" href="/time">Request time off</Link><Link className="button secondary" href="/experience">Ask HR</Link></div></section>

    {!actor.workerId&&<section className="card notice"><strong>Employee record link required.</strong><p>Your account is active, but it is not yet linked to an employee record. HR must link your membership before personal HR transactions such as leave requests can be submitted.</p></section>}

    <section className="metricGrid employeePortalMetrics">
      <Metric label="Leave available" value={leave?`${totalAvailable.toFixed(1)} h`:dashboard.health.leave.state==='available'?`${employee.leave.availableHours.toFixed(1)} h`:'Unavailable'} hint={`${pendingLeave||employee.leave.pendingRequests} pending request(s)`}/>
      <Metric label="Open HR requests" value={experience?.metrics.openTickets??employee.service.openTickets} hint="Track HR support requests"/>
      <Metric label="Learning" value={employee.learning.active} hint={`${employee.learning.overdue} overdue`}/>
      <Metric label="Goals" value={employee.performance.activeGoals} hint={`${employee.performance.awaitingSelfReview} self-review(s) waiting`}/>
      <Metric label="Documents" value={employee.documents.visibleCount} hint="Documents available to you"/>
      <Metric label="Notifications" value={employee.notifications.unread} hint={`${employee.notifications.highPriority} high priority`}/>
    </section>

    {dashboard.attention.length>0&&<section className="card stack"><div className="rowBetween"><div><span className="eyebrow">Needs your attention</span><h2 className="sectionTitle">My tasks and reminders</h2></div><Link href="/notifications" className="textLink">All notifications →</Link></div><div className="employeeAttentionList">{dashboard.attention.slice(0,6).map(a=><Link href={a.href} className="employeeAttentionRow" key={a.id}><div><strong>{a.title}</strong><span>{a.summary}</span></div><span className={`portalSeverity ${a.severity}`}>{a.severity}</span></Link>)}</div></section>}

    <section className="card stack"><div><span className="eyebrow">Everyday HR</span><h2 className="sectionTitle">Quick employee requests</h2><p className="muted">Start common HR services without searching through modules. Requests remain subject to HR policy, evidence and approval requirements.</p></div><div className="employeeQuickServiceGrid">{quickServices.map(([code,label,description])=>{const item=serviceByCode[code];return <button type="button" key={code} className="employeeQuickService" disabled={!item||busy} onClick={()=>{if(item){setSelectedServiceId(item.id);document.getElementById('employee-service-request')?.scrollIntoView({behavior:'smooth',block:'center'})}}}><strong>{label}</strong><span>{description}</span><small>{item?'Available':'Not published by HR'}</small></button>})}</div></section>

    <section className="card stack"><div><span className="eyebrow">Employee services</span><h2 className="sectionTitle">What would you like to do?</h2><p className="muted">Only services allowed for your role are shown.</p></div><div className="employeeServiceGrid">{availableServices.map(s=><Link href={s.href} className="employeeServiceCard" key={s.href}><span className="employeeServiceIcon" aria-hidden="true">{s.icon}</span><div><strong>{s.label}</strong><span>{s.description}</span></div><span aria-hidden="true">→</span></Link>)}</div></section>

    <div className="grid2 employeePortalForms">
      <section className="card stack"><div><span className="eyebrow">Time off</span><h2 className="sectionTitle">Request vacation or leave</h2></div>{!actor.permissions.includes('leave.request')?<div className="notice">Leave requests are not enabled for this membership.</div>:!actor.workerId?<div className="notice">Link your account to an employee record before requesting leave.</div>:!leave?<div className="notice">Leave information is currently unavailable. Open Time & Leave for details.</div>:<form className="stack" onSubmit={submitLeave}><label className="field"><span>Leave type</span><select className="input" name="leaveTypeId" required defaultValue=""><option value="" disabled>Select leave type</option>{leave.types.filter(t=>t.enabled).map(t=><option key={t.id} value={t.id}>{t.name}{t.paid?' · paid':''}</option>)}</select></label><div className="formGrid"><label className="field"><span>Start date</span><input className="input" type="date" name="startDate" required/></label><label className="field"><span>End date</span><input className="input" type="date" name="endDate" required/></label></div><label className="field"><span>Hours (optional)</span><input className="input" type="number" name="requestedHours" min="0.25" step="0.25" placeholder="Calculated automatically when blank"/></label><label className="field"><span>Note (optional)</span><textarea className="input textArea" name="note" placeholder="Add information your approver may need."/></label><button className="button" disabled={busy}>Submit leave request</button></form>}</section>

      <section className="card stack" id="employee-service-request"><div><span className="eyebrow">HR Service Center</span><h2 className="sectionTitle">Request HR support</h2></div>{!actor.permissions.includes('service.request')?<div className="notice">HR service requests are not enabled for this membership.</div>:!actor.workerId?<div className="notice">Link your account to an employee record before submitting HR service requests.</div>:!experience?.catalog?.length?<div className="notice">No employee HR services are currently published. You can still open HR Help for knowledge articles.</div>:<form className="stack" onSubmit={submitService}><label className="field"><span>Service</span><select className="input" name="catalogItemId" required value={selectedServiceId} onChange={e=>setSelectedServiceId(e.target.value)}><option value="" disabled>Select HR service</option>{experience.catalog.filter(c=>c.enabled).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field"><span>Subject</span><input className="input" name="subject" required maxLength={200} placeholder="What do you need help with?"/></label><label className="field"><span>Description</span><textarea className="input textArea" name="description" required maxLength={5000} placeholder="Provide the information HR needs to respond."/></label><button className="button" disabled={busy}>Submit HR request</button></form>}</section>
    </div>

    <div className="grid2"><section className="card tableWrap"><div className="rowBetween"><h2 className="sectionTitle">My leave requests</h2><Link className="textLink" href="/time">Open Time & Leave →</Link></div>{!leave?.requests?.length?<p className="muted">No leave requests to show.</p>:<table><thead><tr><th>Type</th><th>Dates</th><th>Hours</th><th>Status</th></tr></thead><tbody>{leave.requests.slice(0,8).map(r=><tr key={r.id}><td>{typeMap[r.leaveTypeId]?.name||'Leave'}</td><td>{fmtDate(r.startDate)} – {fmtDate(r.endDate)}</td><td>{r.requestedHours}</td><td><span className={statusClass(r.status)}>{r.status.replaceAll('_',' ')}</span></td></tr>)}</tbody></table>}</section><section className="card tableWrap"><div className="rowBetween"><h2 className="sectionTitle">My HR requests</h2><Link className="textLink" href="/experience">Open HR Help →</Link></div>{!experience?.tickets?.length?<p className="muted">No HR service requests to show.</p>:<table><thead><tr><th>Reference</th><th>Subject</th><th>Status</th></tr></thead><tbody>{experience.tickets.slice(0,8).map(t=><tr key={t.id}><td>{t.referenceNumber}</td><td>{t.subject}</td><td><span className={statusClass(t.status)}>{t.status.replaceAll('_',' ')}</span></td></tr>)}</tbody></table>}</section></div>

    <section className="card employeePortalPrivacy"><strong>Private by design.</strong><span>This portal uses your authenticated organization membership and worker link. Employee actions are scoped to your own record unless your role separately grants manager or HR permissions.</span></section>
  </div>;
}

function Metric({label,value,hint}:{label:string;value:string|number;hint:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
