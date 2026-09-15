'use client';
import { useEffect,useState } from 'react';
import { activeOrgId,apiFetch } from '@/lib/http/client';

const cad=(n?:number,c='CAD')=>typeof n==='number'?new Intl.NumberFormat('en-CA',{style:'currency',currency:c,maximumFractionDigits:2}).format(n):'—';
const askAi=(prompt:string)=>window.dispatchEvent(new CustomEvent('opsiqo:ai-assist',{detail:{prompt}}));

export function PayrollOperationsCommandCenter(){
  const[d,setD]=useState<any>(null),[err,setErr]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
  const load=async()=>{try{setErr('');setD((await apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/payroll/intelligence`)).data)}catch(e){setErr(e instanceof Error?e.message:'Unable to load payroll operations intelligence.')}};
  useEffect(()=>{void load()},[]);
  const action=async(body:any)=>{setBusy(true);setErr('');setMsg('');try{await apiFetch(`/api/organizations/${activeOrgId()}/payroll/intelligence`,{method:'POST',body:JSON.stringify(body)});setMsg('Governed payroll action saved.');await load()}catch(e){setErr(e instanceof Error?e.message:'Payroll intelligence action failed.')}finally{setBusy(false)}};
  if(!d)return <section className="card"><h2 className="sectionTitle">Payroll Intelligence Command Center</h2><p className="muted">{err||'Analyzing payroll operations…'}</p></section>;
  return <section className="card stack">
    <div className="rowBetween"><div><h2 className="sectionTitle">Payroll Intelligence Command Center</h2><p className="muted">Readiness, release dates, compensation sync, retro/variable pay, anomalies, off-cycle runs and reconciliation in one governed view.</p></div><button className="button secondary compact" onClick={()=>askAi('Review the current Payroll Intelligence Command Center. Explain blockers, material variances, compensation/payroll mismatches, upcoming member-specific release dates, retro cases, variable-pay items and unreconciled runs. Recommend actions only. Do not release payroll, change pay, approve adjustments or override controls.')}>✦ Payroll Copilot</button></div>
    {err&&<div className="error">{err}</div>}{msg&&<div className="success">{msg}</div>}
    <div className="grid4">
      <div className="metricCard"><div className="metricLabel">Ready workers</div><div className="metricValue">{d.metrics.ready}/{d.metrics.workers}</div><div className="metricFoot">{d.metrics.blocked} blocked</div></div>
      <div className="metricCard"><div className="metricLabel">Comp → Payroll</div><div className="metricValue">{d.metrics.syncPending}</div><div className="metricFoot">need review</div></div>
      <div className="metricCard"><div className="metricLabel">Variance alerts</div><div className="metricValue">{d.metrics.anomalies}</div><div className="metricFoot">{d.metrics.pendingAdjustments} pending adjustments</div></div>
      <div className="metricCard"><div className="metricLabel">Reconciliation</div><div className="metricValue">{d.metrics.unreconciledRuns}</div><div className="metricFoot">runs awaiting closure controls</div></div>
    </div>
    <div className="tableWrap"><table><thead><tr><th>Employee</th><th>Hourly</th><th>Monthly</th><th>Annual</th><th>Next release</th><th>Source</th><th>Sync</th><th>Readiness</th></tr></thead>
      <tbody>{d.workers.map((w:any)=><tr key={w.workerId}><td><strong>{w.displayName}</strong><div className="muted">#{w.employeeNumber}</div></td><td>{cad(w.hourlyRate,w.currency)}</td><td>{cad(w.monthlyPay,w.currency)}</td><td>{cad(w.annualPay,w.currency)}</td><td>{w.nextReleaseDate}</td><td>{w.releaseSource}</td><td>{w.mismatch?<span className="badge">Mismatch</span>:w.syncStatus?<span className="badge">{String(w.syncStatus).replaceAll('_',' ')}</span>:'—'}</td><td>{w.ready?<span className="badge">Ready</span>:w.issues.join('; ')}</td></tr>)}</tbody>
    </table></div>
    {d.anomalies.length>0&&<div className="stack"><h3 className="sectionTitle">Payroll variance & anomaly intelligence</h3>{d.anomalies.slice(0,8).map((a:any)=><div className="notice" key={a.id}><strong>{a.displayName} · {a.metric.toUpperCase()} {a.deltaPct>0?'+':''}{a.deltaPct}%</strong><br/>{cad(a.previousAmount)} → {cad(a.currentAmount)} · {a.explanation}</div>)}</div>}
    <div className="grid2">
      <div className="notice"><strong>Retro / correction engine</strong><br/>{d.metrics.pendingRetro} active retro cases. Retro calculations remain maker-checker controlled and prepare a payroll adjustment rather than silently changing payroll.</div>
      <div className="notice"><strong>Variable compensation</strong><br/>{d.metrics.pendingVariablePay} active bonus/commission/allowance items. Approved items prepare governed payroll adjustments.</div>
    </div>
    <div className="tableWrap"><h3 className="sectionTitle">Payroll run workflow</h3><table><thead><tr><th>Run</th><th>Type</th><th>Operational stage</th><th>Pay date</th><th>Workers</th><th>Reconciliation</th></tr></thead><tbody>{d.runs.map((r:any)=><tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.kind||'regular'}</td><td>{r.operationalStage}</td><td>{r.payDate}</td><td>{r.totals?.workers||r.workerIds?.length||'—'}</td><td>{r.reconciliation?.status||'pending'}</td></tr>)}</tbody></table></div>
    <div className="notice"><strong>Off-cycle support:</strong> regular, off-cycle, correction, termination, bonus, commission, emergency and retro run types are available through the governed payroll intelligence API. Production execution remains subject to the existing payroll regulatory/provider gates.</div>
    <button className="button secondary compact" disabled={busy} onClick={()=>action({action:'save_calendar',input:{scope:'organization',rule:'run_default',weekendAdjustment:'none',effectiveDate:new Date().toISOString().slice(0,10),reason:'Confirm organization payroll calendar baseline'}})}>Confirm organization calendar baseline</button>
  </section>
}