'use client';
import{useEffect,useMemo,useState}from'react';
import{activeOrgId,apiFetch}from'@/lib/http/client';
import type{PayrollDashboard,PayrollRun}from'@/domain/payroll';
import{LoadingState}from'@/components/data-states';

const localDate=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return`${y}-${m}-${day}`};
export function PayrollWorkspace(){
  const[d,setD]=useState<PayrollDashboard|null>(null),[err,setErr]=useState(''),[busy,setBusy]=useState(''),[name,setName]=useState('Regular payroll'),[payDate,setPayDate]=useState(localDate()),[periodStart,setPeriodStart]=useState(localDate()),[periodEnd,setPeriodEnd]=useState(localDate());
  const load=async()=>{try{setErr('');setD((await apiFetch<{data:PayrollDashboard}>(`/api/organizations/${activeOrgId()}/payroll/dashboard`)).data)}catch(e){setErr(e instanceof Error?e.message:'Unable to load payroll.')}};
  useEffect(()=>{load()},[]);
  const providers=useMemo(()=>d?.providers.filter(p=>(p.environment||'uat')==='uat')||[],[d]);
  if(!d)return <LoadingState label="Loading governed payroll…"/>;
  async function createRun(){setBusy('create');try{await apiFetch(`/api/organizations/${activeOrgId()}/payroll/runs`,{method:'POST',body:JSON.stringify({name,payDate,periodStart,periodEnd,kind:'regular',mode:'uat',providerId:providers[0]?.id,idempotencyKey:globalThis.crypto?.randomUUID?.()||`${Date.now()}-uat`})});await load()}catch(e){setErr(e instanceof Error?e.message:'Unable to create payroll run.')}finally{setBusy('')}}
  async function act(run:PayrollRun,action:string){setBusy(`${run.id}:${action}`);try{await apiFetch(`/api/organizations/${activeOrgId()}/payroll/runs/${run.id}`,{method:'POST',body:JSON.stringify({action,providerId:run.providerId||providers[0]?.id,note:action==='reverse'?'UAT reversal test':''})});await load()}catch(e){setErr(e instanceof Error?e.message:`Unable to ${action} payroll.`)}finally{setBusy('')}}
  const next=(r:PayrollRun)=>r.status==='draft'?'calculate':r.status==='calculated'?'review':r.status==='review'?'approve':r.status==='approved'?'export':r.status==='exported'?'reconcile':r.status==='reconciled'?'complete':'';
  return <div className="stack">
    {err&&<div className="error">{err}</div>}
    <div className="grid4">{d.metrics.map(m=><div className="card metricCard" key={m.key}><div className="metricLabel">{m.label}</div><div className="metricValue">{m.value}</div><div className="metricFoot">{m.helper}</div></div>)}</div>
    <section className="card">
      <h2 className="sectionTitle">Controlled UAT payroll run</h2>
      <p className="muted">Uses real OPSIQO compensation, approved time, payroll profiles and approved adjustments. Production approval remains blocked until the statutory reference pack and production provider are independently certified.</p>
      <div className="grid4">
        <label>Run name<input value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Period start<input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)}/></label>
        <label>Period end<input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/></label>
        <label>Pay date<input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}/></label>
      </div>
      <button className="button" disabled={Boolean(busy)||!providers.length} onClick={createRun}>{busy==='create'?'Creating…':'Create UAT payroll run'}</button>
      {!providers.length&&<div className="notice">Configure an evidence-sandbox UAT payroll provider before creating a run.</div>}
    </section>
    <section className="card tableWrap">
      <h2 className="sectionTitle">Payroll runs</h2>
      <table><thead><tr><th>Run</th><th>Period</th><th>Pay date</th><th>Mode</th><th>Status</th><th>Workers</th><th>Gross</th><th>Net</th><th>Action</th></tr></thead>
      <tbody>{d.payrollRuns.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(r=>{const action=next(r);return <tr key={r.id}><td>{r.name}</td><td>{r.periodStart} → {r.periodEnd}</td><td>{r.payDate}</td><td>{r.mode||'uat'}</td><td>{r.status}</td><td>{r.totals?.workers||'—'}</td><td>{r.totals?.gross?.toFixed?.(2)||'—'}</td><td>{r.totals?.net?.toFixed?.(2)||'—'}</td><td>{action?<button className="button secondary" disabled={Boolean(busy)} onClick={()=>act(r,action)}>{busy===`${r.id}:${action}`?'Working…':action}</button>:'—'}</td></tr>})}</tbody></table>
    </section>
    <section className="card tableWrap"><h2 className="sectionTitle">Payroll providers</h2><table><thead><tr><th>Provider</th><th>Adapter</th><th>Environment</th><th>Status</th><th>Mapping</th></tr></thead><tbody>{d.providers.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.adapterCode}</td><td>{p.environment||'uat'}</td><td>{p.status}</td><td>{p.mappingVersion}</td></tr>)}</tbody></table></section>
    <div className="notice"><strong>Regulatory gate:</strong> {d.regulatoryStatus.state} · {d.regulatoryStatus.ruleVersion}<br/>{d.disclaimer}</div>
  </div>
}
