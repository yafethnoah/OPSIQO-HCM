'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type Position = { id:string; title:string; orgUnitId:string; availableHeadcount:number; availableFte:number; capacityState:string };
type Unit = { id:string; name:string };
type Worker = { id:string; displayName:string; employeeNumber:string; workEmail:string; status:string; hireDate?:string };
type AssignmentDetail = {id:string;primary:boolean;assignmentType?:string;allocationFte?:number;startDate:string;endDate?:string;current:boolean;position?:{id:string;title:string};orgUnit?:{id:string;name:string};manager?:{displayName:string}};
type Detail = {
  worker: Worker;
  person: {legalFirstName:string;legalLastName:string;preferredName?:string;personalEmail?:string;phone?:string}|null;
  employments: {id:string;employmentType:string;startDate:string;status:string;fte:number}[];
  assignments: AssignmentDetail[];
  changes: {id:string;changeType:string;effectiveDate:string;status:string;note?:string;lastExecutionError?:string}[];
  secondaryPlans: {id:string;action:'start'|'end';effectiveDate:string;status:string;assignmentId?:string;positionId?:string}[];
  timeline: {id:string;eventType:string;title:string;description?:string;effectiveDate:string;status?:string}[];
};

export function EmployeeProfile({ workerId }: { workerId: string }) {
  const [detail,setDetail]=useState<Detail|null>(null);
  const [positions,setPositions]=useState<Position[]>([]);
  const [units,setUnits]=useState<Unit[]>([]);
  const [workers,setWorkers]=useState<Worker[]>([]);
  const [changeType,setChangeType]=useState('transfer');
  const [selectedUnit,setSelectedUnit]=useState('');
  const [secondaryUnit,setSecondaryUnit]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [canManage,setCanManage]=useState(false);

  const load=async()=>{
    try {
      const [d,p,u,w,me]=await Promise.all([
        apiFetch<{data:Detail}>(`/api/organizations/${activeOrgId()}/employees/${workerId}`),
        apiFetch<{data:Position[]}>(`/api/organizations/${activeOrgId()}/positions`),
        apiFetch<{data:Unit[]}>(`/api/organizations/${activeOrgId()}/org-units`),
        apiFetch<{data:Worker[]}>(`/api/organizations/${activeOrgId()}/employees`),
        apiFetch<{actor:{permissions:string[]}}>('/api/me'),
      ]);
      setDetail(d.data);setPositions(p.data);setUnits(u.data);setWorkers(w.data);setCanManage(me.actor.permissions.includes('people.manage'));
    } catch(e){setError(e instanceof Error?e.message:'Unable to load employee.');}
  };
  useEffect(()=>{load();},[workerId]);

  const currentAssignment=detail?.assignments.find(a=>a.current&&(a.primary||a.assignmentType==='primary'));
  const secondaryAssignments=detail?.assignments.filter(a=>a.current&&!a.primary&&a.assignmentType!=='primary')||[];
  const availablePositions=useMemo(()=>positions.filter(p=>(!selectedUnit||p.orgUnitId===selectedUnit)&&(p.availableHeadcount>0||p.id===currentAssignment?.position?.id)),[positions,selectedUnit,currentAssignment]);
  const secondaryPositions=useMemo(()=>positions.filter(p=>(!secondaryUnit||p.orgUnitId===secondaryUnit)&&p.availableHeadcount>0&&!detail?.assignments.some(a=>a.current&&a.position?.id===p.id)),[positions,secondaryUnit,detail]);

  async function submitChange(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');setMessage('');
    const f=new FormData(e.currentTarget);
    const body:any={changeType,effectiveDate:f.get('effectiveDate'),note:f.get('note')||undefined};
    if(changeType==='transfer'||changeType==='promotion'){
      body.orgUnitId=f.get('orgUnitId');body.positionId=f.get('positionId');body.managerWorkerId=f.get('managerWorkerId')||undefined;
    } else if(changeType==='manager_change') body.managerWorkerId=f.get('managerWorkerId');
    else if(changeType==='status_change') body.workerStatus=f.get('workerStatus');
    try{
      const r=await apiFetch<{data:{status:string;effectiveDate:string}}>(`/api/organizations/${activeOrgId()}/employees/${workerId}/changes`,{method:'POST',body:JSON.stringify(body)});
      setMessage(r.data.status==='scheduled'?`Change scheduled for ${r.data.effectiveDate}. The automation executor will apply it when due.`:`Change applied effective ${r.data.effectiveDate}.`);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to save employee change.');}
  }

  async function addSecondary(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');setMessage('');const f=new FormData(e.currentTarget);
    try{
      const r=await apiFetch<{data:{status?:string;effectiveDate?:string;id:string}}>(`/api/organizations/${activeOrgId()}/employees/${workerId}/assignments`,{method:'POST',body:JSON.stringify({positionId:f.get('positionId'),orgUnitId:f.get('orgUnitId'),managerWorkerId:f.get('managerWorkerId')||undefined,allocationFte:Number(f.get('allocationFte')||0.25),startDate:f.get('startDate')})});
      setMessage(r.data.status==='scheduled'?`Secondary assignment scheduled for ${r.data.effectiveDate}.`:'Secondary assignment added and position occupancy updated.');e.currentTarget.reset();setSecondaryUnit('');await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to create secondary assignment.');}
  }


  async function scheduleSecondaryEnd(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');setMessage('');const f=new FormData(e.currentTarget);const assignmentId=String(f.get('assignmentId')||'');
    try{const r=await apiFetch<{data:{status?:string;effectiveDate?:string}}>(`/api/organizations/${activeOrgId()}/employees/${workerId}/assignments/${assignmentId}`,{method:'POST',body:JSON.stringify({endDate:f.get('endDate'),note:f.get('note')||undefined})});setMessage(r.data.status==='scheduled'?`Secondary assignment end scheduled for ${r.data.effectiveDate}.`:'Secondary assignment ended.');e.currentTarget.reset();await load();}
    catch(e){setError(e instanceof Error?e.message:'Unable to schedule secondary assignment end.');}
  }

  async function endSecondary(assignmentId:string){
    setError('');setMessage('');
    try{await apiFetch(`/api/organizations/${activeOrgId()}/employees/${workerId}/assignments/${assignmentId}`,{method:'POST',body:JSON.stringify({endDate:new Date().toISOString().slice(0,10)})});setMessage('Secondary assignment ended and occupancy released.');await load();}
    catch(e){setError(e instanceof Error?e.message:'Unable to end secondary assignment.');}
  }

  async function actOnSecondaryPlan(planId:string, action:'cancel'|'retry'){
    setError('');setMessage('');
    try{await apiFetch(`/api/organizations/${activeOrgId()}/employees/${workerId}/secondary-assignment-plans/${planId}`,{method:'POST',body:JSON.stringify({action})});setMessage(action==='cancel'?'Scheduled secondary assignment change cancelled.':'Failed secondary assignment plan queued for retry.');await load();}
    catch(e){setError(e instanceof Error?e.message:'Unable to update scheduled secondary assignment change.');}
  }

  if(!detail)return <div className="card">{error?<span className="error">{error}</span>:<span className="muted">Loading employee profile…</span>}</div>;
  return <div className="stack">
    {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
    <div className="grid4">
      <div className="card"><div className="metricLabel">Employee</div><div className="profileName">{detail.worker.displayName}</div><div className="muted">{detail.worker.employeeNumber}</div></div>
      <div className="card"><div className="metricLabel">Primary position</div><div className="profileValue">{currentAssignment?.position?.title||'Unassigned'}</div><div className="muted">{currentAssignment?.orgUnit?.name||'—'}</div></div>
      <div className="card"><div className="metricLabel">Manager</div><div className="profileValue">{currentAssignment?.manager?.displayName||'No manager'}</div><div className="muted">{secondaryAssignments.length} secondary assignment(s)</div></div>
      <div className="card"><div className="metricLabel">Employment status</div><div><span className="badge">{detail.worker.status}</span></div><div className="muted">Hired {detail.worker.hireDate||'—'}</div></div>
    </div>

    <div className="grid2">
      <section className="card stack"><h2 className="sectionTitle">Employee record</h2><div className="definitionGrid"><span>Work email</span><strong>{detail.worker.workEmail}</strong><span>Legal name</span><strong>{detail.person?`${detail.person.legalFirstName} ${detail.person.legalLastName}`:'—'}</strong><span>Personal email</span><strong>{detail.person?.personalEmail||'—'}</strong><span>Phone</span><strong>{detail.person?.phone||'—'}</strong><span>Employment type</span><strong>{detail.employments[0]?.employmentType||'—'}</strong><span>Employment FTE</span><strong>{detail.employments[0]?.fte??'—'}</strong></div></section>
      {canManage ? <form className="card stack" onSubmit={submitChange}>
        <div><h2 className="sectionTitle">Effective-dated change</h2><div className="muted">Future changes are durable records executed when effective.</div></div>
        <label className="field"><span>Change type</span><select className="input" value={changeType} onChange={e=>setChangeType(e.target.value)}><option value="transfer">Transfer</option><option value="promotion">Promotion</option><option value="manager_change">Manager change</option><option value="status_change">Status change</option></select></label>
        <label className="field"><span>Effective date</span><input required className="input" name="effectiveDate" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label>
        {(changeType==='transfer'||changeType==='promotion')&&<><label className="field"><span>Organization unit</span><select required className="input" name="orgUnitId" value={selectedUnit} onChange={e=>setSelectedUnit(e.target.value)}><option value="">Select unit</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label className="field"><span>Position</span><select required className="input" name="positionId" defaultValue=""><option value="">Select available position</option>{availablePositions.map(p=><option key={p.id} value={p.id}>{p.title} · {p.availableHeadcount} seat(s)</option>)}</select></label></>}
        {(changeType!=='status_change')&&<label className="field"><span>Manager</span><select required={changeType==='manager_change'} className="input" name="managerWorkerId" defaultValue=""><option value="">Keep/no manager</option>{workers.filter(w=>w.id!==workerId).map(w=><option key={w.id} value={w.id}>{w.displayName}</option>)}</select></label>}
        {changeType==='status_change'&&<label className="field"><span>New status</span><select className="input" name="workerStatus"><option>active</option><option>leave</option><option>inactive</option><option>terminated</option></select></label>}
        <label className="field"><span>Business reason / note</span><textarea className="input" name="note" rows={3} /></label><button className="button">Apply or schedule change</button>
      </form> : <section className="card stack"><h2 className="sectionTitle">Access scope</h2><div className="notice">This profile is read-only for your current role. Employment changes require the people.manage permission.</div></section>}
    </div>

    <section className="card stack">
      <div className="toolbar"><div><h2 className="sectionTitle">Additional assignments</h2><div className="muted">Secondary responsibilities remain independent from the primary assignment.</div></div></div>
      <div className="tableWrap"><table><thead><tr><th>Type</th><th>Position</th><th>Unit</th><th>Manager</th><th>Allocation</th><th>Start</th><th>Status</th><th></th></tr></thead><tbody>{detail.assignments.filter(a=>a.current).map(a=><tr key={a.id}><td>{a.primary?'Primary':'Secondary'}</td><td>{a.position?.title||'—'}</td><td>{a.orgUnit?.name||'—'}</td><td>{a.manager?.displayName||'—'}</td><td>{a.allocationFte??(a.primary?1:0.25)} FTE</td><td>{a.startDate}</td><td><span className="badge">current</span></td><td>{canManage&&!a.primary&&<button className="button secondary" onClick={()=>endSecondary(a.id)}>End</button>}</td></tr>)}{!detail.assignments.some(a=>a.current)&&<tr><td colSpan={8} className="muted">No current assignments.</td></tr>}</tbody></table></div>
      {canManage&&<form className="formGrid" onSubmit={addSecondary}><label className="field"><span>Secondary unit</span><select required className="input" name="orgUnitId" value={secondaryUnit} onChange={e=>setSecondaryUnit(e.target.value)}><option value="">Select unit</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label className="field"><span>Secondary position</span><select required className="input" name="positionId" defaultValue=""><option value="">Select available position</option>{secondaryPositions.map(p=><option key={p.id} value={p.id}>{p.title} · {p.availableHeadcount} seat(s)</option>)}</select></label><label className="field"><span>Allocation FTE</span><input className="input" name="allocationFte" type="number" min="0.05" max="1" step="0.05" defaultValue="0.25" /></label><label className="field"><span>Start date</span><input className="input" name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)} /></label><label className="field"><span>Manager</span><select className="input" name="managerWorkerId" defaultValue=""><option value="">No separate manager</option>{workers.filter(w=>w.id!==workerId).map(w=><option key={w.id} value={w.id}>{w.displayName}</option>)}</select></label><div className="field"><span>&nbsp;</span><button className="button">Add secondary assignment</button></div></form>}
      {canManage&&secondaryAssignments.length>0&&<form className="formGrid" onSubmit={scheduleSecondaryEnd}><label className="field"><span>Assignment to end</span><select required className="input" name="assignmentId"><option value="">Select secondary assignment</option>{secondaryAssignments.map(a=><option key={a.id} value={a.id}>{a.position?.title||a.id}</option>)}</select></label><label className="field"><span>Effective end date</span><input required className="input" name="endDate" type="date" min={new Date().toISOString().slice(0,10)} /></label><label className="field"><span>Reason</span><input className="input" name="note" /></label><div className="field"><span>&nbsp;</span><button className="button secondary">Apply or schedule end</button></div></form>}
      {detail.secondaryPlans?.length>0&&<div className="tableWrap"><h3 className="sectionTitle">Scheduled secondary assignment changes</h3><table><thead><tr><th>Action</th><th>Effective</th><th>Status</th><th>Assignment</th><th>Control</th></tr></thead><tbody>{detail.secondaryPlans.map(p=><tr key={p.id}><td>{p.action}</td><td>{p.effectiveDate}</td><td><span className="badge">{p.status}</span></td><td>{p.assignmentId||p.positionId||'Pending creation'}</td><td>{canManage&&p.status==='scheduled'?<button className="button secondary" onClick={()=>actOnSecondaryPlan(p.id,'cancel')}>Cancel</button>:canManage&&p.status==='failed'?<button className="button secondary" onClick={()=>actOnSecondaryPlan(p.id,'retry')}>Retry</button>:'—'}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="card"><h2 className="sectionTitle">Employee timeline</h2><div className="eventTimeline">{detail.timeline.map(event=><div className="eventRow" key={event.id}><div className="eventDate">{event.effectiveDate}</div><div className="eventDot"/><div><strong className="capitalize">{event.title}</strong>{event.description&&<div className="muted">{event.description}</div>}</div><div>{event.status&&<span className="badge">{event.status}</span>}</div></div>)}</div></section>
  </div>;
}
