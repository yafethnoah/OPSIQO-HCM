'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/http/client';

export function EmployeeRelationsWorkspace(){
  const [orgId,setOrgId]=useState('');
  const [actor,setActor]=useState<any>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [metrics,setMetrics]=useState<any>({});
  const [selected,setSelected]=useState<any>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({type:'workplace_harassment',title:'',summary:'',riskLevel:'medium',confidentiality:'restricted'});
  const [extension,setExtension]=useState({date:'',reason:''});

  const permissions=new Set<string>(actor?.permissions||[]);
  const canManage=permissions.has('er.manage');
  const canFindings=permissions.has('er.findings');
  const canLegalHold=permissions.has('er.legal_hold');

  async function resolveContext(){
    const me=await apiFetch<any>('/api/me');
    setActor(me.actor);
    return me.actor.orgId||localStorage.getItem('opsiqo.activeOrgId')||'';
  }
  async function load(){
    try{
      setError('');
      const id=orgId||await resolveContext(); if(!id)return; setOrgId(id);
      const cases=await apiFetch<any>(`/api/organizations/${id}/employee-relations/cases`); setRows(cases.data||[]);
      try{const d=await apiFetch<any>(`/api/organizations/${id}/employee-relations/dashboard`);setMetrics(d.data.metrics||{});}catch{setMetrics({});}
    }catch(e:any){setError(e.message||String(e));}
  }
  useEffect(()=>{load();},[]);

  async function create(){
    setBusy(true);setError('');
    try{
      await apiFetch(`/api/organizations/${orgId}/employee-relations/cases`,{method:'POST',body:JSON.stringify({...form,affectedWorkerIds:[],respondentWorkerIds:[]})});
      setForm({...form,title:'',summary:''}); await load();
    }catch(e:any){setError(e.message||String(e));}finally{setBusy(false);}
  }
  async function openCase(id:string){try{const r=await apiFetch<any>(`/api/organizations/${orgId}/employee-relations/cases/${id}`);setSelected(r.data);}catch(e:any){setError(e.message||String(e));}}
  async function caseAction(action:string,extra:any={}){
    if(!selected?.case?.id)return; setBusy(true);setError('');
    try{await apiFetch(`/api/organizations/${orgId}/employee-relations/cases/${selected.case.id}`,{method:'PATCH',body:JSON.stringify({action,...extra})});await openCase(selected.case.id);await load();}catch(e:any){setError(e.message||String(e));}finally{setBusy(false);}
  }
  async function declareConflict(status:'cleared'|'conflict'){
    if(!selected?.case?.id)return; const note=window.prompt(status==='cleared'?'Document why you can investigate objectively:':'Document the conflict requiring reassignment:','')||''; if(note.length<5)return;
    setBusy(true);try{await apiFetch(`/api/organizations/${orgId}/employee-relations/cases/${selected.case.id}/conflict`,{method:'POST',body:JSON.stringify({status,note})});await openCase(selected.case.id);}catch(e:any){setError(e.message||String(e));}finally{setBusy(false);}
  }
  async function legalHold(action:'apply'|'release'){
    if(!selected?.case?.id)return; const reason=window.prompt(action==='apply'?'Legal-hold reason:':'Reason for releasing the ER case hold:','')||''; if(reason.length<10)return;
    setBusy(true);try{await apiFetch(`/api/organizations/${orgId}/employee-relations/cases/${selected.case.id}/legal-hold`,{method:'POST',body:JSON.stringify({action,reason})});await openCase(selected.case.id);}catch(e:any){setError(e.message||String(e));}finally{setBusy(false);}
  }
  async function extendTarget(){if(!extension.date||extension.reason.length<10)return;await caseAction('extend_investigation_target',{investigationTargetDate:extension.date,note:extension.reason});setExtension({date:'',reason:''});}

  const cards=useMemo(()=>[['Open cases',metrics.openCases||0],['High risk',metrics.highRisk||0],['Investigations',metrics.investigations||0],['Overdue actions',metrics.overdueActions||0],['Accommodation reviews',metrics.accommodationsDue||0],['Outcome notices due',metrics.outcomeNoticesDue||0],['Closed YTD',metrics.closedYtd||0]], [metrics]);
  const violenceWarning=form.type==='workplace_violence'||form.riskLevel==='critical';

  return <div className="stack">
    {Object.keys(metrics).length>0&&<div className="metricGrid">{cards.map(([k,v])=><div className="metricCard" key={String(k)}><span>{k}</span><strong>{v}</strong></div>)}</div>}
    {error&&<div className="notice error">{error}</div>}
    <section className="panel">
      <h2>Confidential intake</h2>
      <p className="muted">Record facts, dates, and observable concerns. Do not include unnecessary diagnosis or treatment details in accommodation-related intake.</p>
      {violenceWarning&&<div className="notice">If there is an immediate safety threat, follow the organization's emergency/workplace-safety procedure. OPSIQO case intake is not an emergency-response service.</div>}
      <div className="formGrid">
        <label>Case type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="workplace_harassment">Workplace harassment</option><option value="workplace_violence">Workplace violence</option><option value="discrimination_human_rights">Discrimination / human rights</option><option value="grievance">Grievance</option><option value="discipline">Discipline</option><option value="accommodation">Accommodation</option><option value="attendance">Attendance concern</option><option value="conflict">Conflict</option><option value="whistleblower">Whistleblower</option><option value="other">Other</option></select></label>
        <label>Risk<select value={form.riskLevel} onChange={e=>setForm({...form,riskLevel:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label>Confidentiality<select value={form.confidentiality} onChange={e=>setForm({...form,confidentiality:e.target.value})}><option value="restricted">Restricted</option><option value="highly_confidential">Highly confidential</option><option value="legal_privileged">Legal privileged</option></select></label>
        <label className="span2">Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label className="span2">Summary<textarea rows={5} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></label>
      </div>
      <button disabled={busy||!form.title||form.summary.length<20} onClick={create}>Create confidential case</button>
    </section>

    <section className="panel"><h2>Case register</h2><div className="tableWrap"><table><thead><tr><th>Reference</th><th>Type</th><th>Title</th><th>Status</th><th>Risk</th><th>Updated</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} onClick={()=>openCase(r.id)} style={{cursor:'pointer'}}><td>{r.referenceNumber}</td><td>{String(r.type).replaceAll('_',' ')}</td><td>{r.title}</td><td>{r.status}</td><td>{r.riskLevel}</td><td>{r.updatedAt?.slice(0,10)}</td></tr>)}</tbody></table></div></section>

    {selected&&<section className="panel">
      <div className="row between"><div><h2>{selected.case?.referenceNumber} · {selected.case?.title}</h2><p className="muted">{selected.restricted?'Reporter view — investigation evidence is restricted to authorized case-team members.':`${selected.case?.status} · ${selected.case?.riskLevel} · ${selected.case?.confidentiality}`}</p></div><button className="secondary" onClick={()=>setSelected(null)}>Close detail</button></div>
      {!selected.restricted&&<>
        <div className="metricGrid"><div className="metricCard"><span>Case team</span><strong>{selected.team?.length||0}</strong></div><div className="metricCard"><span>Evidence</span><strong>{selected.evidence?.length||0}</strong></div><div className="metricCard"><span>Interviews</span><strong>{selected.interviews?.length||0}</strong></div><div className="metricCard"><span>Findings</span><strong>{selected.findings?.length||0}</strong></div><div className="metricCard"><span>Actions</span><strong>{selected.actions?.length||0}</strong></div></div>
        <p><strong>Investigation target:</strong> {selected.case?.investigationTargetDate||'—'} {selected.case?.investigationTargetSource&&<span className="muted">({selected.case.investigationTargetSource})</span>}</p>
        <p><strong>Legal hold:</strong> {selected.case?.legalHoldActive?'ACTIVE':'No'}</p>
        {canManage&&<div className="stack"><h3>Case controls</h3><div className="row" style={{flexWrap:'wrap',gap:8}}><button disabled={busy} onClick={()=>declareConflict('cleared')}>Declare no conflict</button><button className="secondary" disabled={busy} onClick={()=>declareConflict('conflict')}>Declare conflict</button>{selected.case?.investigationRequired&&selected.case?.status==='triage'&&<button disabled={busy} onClick={()=>caseAction('start_investigation')}>Start investigation</button>}{selected.case?.status==='investigating'&&<button disabled={busy} onClick={()=>caseAction('move_to_findings')}>Move to findings</button>}{selected.case?.status==='findings_review'&&<button disabled={busy} onClick={()=>caseAction('move_to_actions')}>Move to actions</button>}{selected.case?.status==='action_plan'&&<button disabled={busy} onClick={()=>caseAction('start_monitoring')}>Start monitoring</button>}</div>{selected.case?.investigationRequired&&!['closed','cancelled'].includes(selected.case?.status)&&<div className="formGrid"><label>Revised investigation target<input type="date" value={extension.date} onChange={e=>setExtension({...extension,date:e.target.value})}/></label><label className="span2">Extension reason<input value={extension.reason} onChange={e=>setExtension({...extension,reason:e.target.value})}/></label><button disabled={busy||!extension.date||extension.reason.length<10} onClick={extendTarget}>Document target extension</button></div>}{selected.case?.outcomeNoticeRequired&&<div className="row" style={{gap:8}}><button disabled={busy} onClick={()=>caseAction('record_outcome_notice',{complainantNoticeSent:true})}>Record affected-worker notice</button><button disabled={busy} onClick={()=>caseAction('record_outcome_notice',{respondentNoticeSent:true})}>Record respondent notice</button></div>}{canFindings&&<button disabled={busy||['closed','cancelled'].includes(selected.case?.status)} onClick={()=>caseAction('close',{note:window.prompt('Closure summary:','')||undefined})}>Close case</button>}</div>}
        {canLegalHold&&<div className="row" style={{gap:8,marginTop:12}}>{selected.case?.legalHoldActive?<button disabled={busy} onClick={()=>legalHold('release')}>Release ER case hold</button>:<button disabled={busy} onClick={()=>legalHold('apply')}>Apply legal hold</button>}</div>}
      </>}
    </section>}
  </div>;
}
