'use client';

import { useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { CompensationOperationalClosure } from '@/components/compensation-operational-closure';

const askAi=(prompt:string)=>window.dispatchEvent(new CustomEvent('opsiqo:ai-assist',{detail:{prompt}}));

export function CompensationOperationsCommandCenter(){
  const[d,setD]=useState<any>(null),[err,setErr]=useState('');
  const load=async()=>{try{setErr('');setD((await apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/compensation/intelligence`)).data)}catch(e){setErr(e instanceof Error?e.message:'Unable to load compensation operations intelligence.')}};
  useEffect(()=>{void load()},[]);

  if(!d)return <section className="card"><h2 className="sectionTitle">Compensation Intelligence Command Center</h2><p className="muted">{err||'Analyzing compensation…'}</p></section>;

  return <section className="card stack">
    <div className="rowBetween"><div><h2 className="sectionTitle">Compensation Intelligence Command Center</h2><p className="muted">One authoritative view of employee mapping gaps, architecture health, governed changes and Compensation → Payroll synchronization.</p></div><button className="button secondary compact" onClick={()=>askAi('Review Compensation authority convergence. Explain canonical employee band-mapping gaps, architecture dimensions, pending compensation changes, pay-equity review flags and Compensation → Payroll synchronization. Recommend governed next steps only. Do not approve or change compensation.')}>✦ Compensation Copilot</button></div>
    {err&&<div className="error">{err}</div>}
    <div className="grid4">
      <div className="metricCard"><div className="metricLabel">Employee mapping gaps</div><div className="metricValue">{d.metrics.missingCompensation+d.metrics.missingBand}</div><div className="metricFoot">{d.metrics.missingCompensation} missing compensation · {d.metrics.missingBand} canonical band mappings</div></div>
      <div className="metricCard"><div className="metricLabel">Architecture health</div><div className="metricValue">{d.metrics.architecturePct}%</div><div className="metricFoot">Job Family → Level → Band → Position → Employee</div></div>
      <div className="metricCard"><div className="metricLabel">Pending changes</div><div className="metricValue">{d.metrics.pendingChanges}</div><div className="metricFoot">effective-dated / governed</div></div>
      <div className="metricCard"><div className="metricLabel">Payroll sync attention</div><div className="metricValue">{d.metrics.payrollSyncAttention}</div><div className="metricFoot">{d.metrics.payEquityAlerts} pay-equity review flags</div></div>
    </div>
    <div className="notice"><strong>Compensation → Payroll synchronization:</strong> command center and operational workspace consume the same canonical synchronization and band-mapping authorities.</div>
    <CompensationOperationalClosure />
  </section>;
}