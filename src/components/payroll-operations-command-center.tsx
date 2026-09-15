'use client';

import { useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { PayrollOperationalClosure } from '@/components/payroll-operational-closure';

const askAi=(prompt:string)=>window.dispatchEvent(new CustomEvent('opsiqo:ai-assist',{detail:{prompt}}));

export function PayrollOperationsCommandCenter(){
  const[d,setD]=useState<any>(null),[err,setErr]=useState('');
  const load=async()=>{try{setErr('');setD((await apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/payroll/intelligence`)).data)}catch(e){setErr(e instanceof Error?e.message:'Unable to load payroll operations intelligence.')}};
  useEffect(()=>{void load()},[]);

  if(!d)return <section className="card"><h2 className="sectionTitle">Payroll Intelligence Command Center</h2><p className="muted">{err||'Analyzing payroll operations…'}</p></section>;

  return <section className="card stack">
    <div className="rowBetween"><div><h2 className="sectionTitle">Payroll Intelligence Command Center</h2><p className="muted">Canonical readiness, release-date authority, adjustments, controlled runs and reconciliation without duplicate operational workflows.</p></div><button className="button secondary compact" onClick={()=>askAi('Review the current Payroll Intelligence Command Center. Explain canonical Compensation → Payroll states, readiness blockers, payroll variance & anomaly intelligence, release-date hierarchy, retro/variable-pay items and reconciliation. Recommend actions only. Do not release payroll or override controls.')}>✦ Payroll Copilot</button></div>
    {err&&<div className="error">{err}</div>}
    <div className="grid4">
      <div className="metricCard"><div className="metricLabel">Ready workers</div><div className="metricValue">{d.metrics.ready}/{d.metrics.workers}</div><div className="metricFoot">{d.metrics.blocked} blocked</div></div>
      <div className="metricCard"><div className="metricLabel">Comp → Payroll</div><div className="metricValue">{d.metrics.syncPending}</div><div className="metricFoot">canonical review attention</div></div>
      <div className="metricCard"><div className="metricLabel">Variance alerts</div><div className="metricValue">{d.metrics.anomalies}</div><div className="metricFoot">Payroll variance & anomaly intelligence is managed under Adjustments</div></div>
      <div className="metricCard"><div className="metricLabel">Reconciliation</div><div className="metricValue">{d.metrics.unreconciledRuns}</div><div className="metricFoot">runs awaiting closure controls</div></div>
    </div>
    <div className="notice"><strong>Canonical synchronization states:</strong> Not Applicable · Missing Sync Evidence · Stale Compensation Record · Payroll Review Required · Reviewed.</div>
    <PayrollOperationalClosure />
  </section>;
}