'use client';
import { useEffect,useState } from 'react';
import { activeOrgId,apiFetch } from '@/lib/http/client';

const cad=(n?:number,c='CAD')=>typeof n==='number'?new Intl.NumberFormat('en-CA',{style:'currency',currency:c,maximumFractionDigits:2}).format(n):'—';
const askAi=(prompt:string)=>window.dispatchEvent(new CustomEvent('opsiqo:ai-assist',{detail:{prompt}}));

export function CompensationOperationsCommandCenter(){
  const[d,setD]=useState<any>(null),[err,setErr]=useState('');
  const load=async()=>{try{setErr('');setD((await apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/compensation/intelligence`)).data)}catch(e){setErr(e instanceof Error?e.message:'Unable to load compensation operations intelligence.')}};
  useEffect(()=>{void load()},[]);
  if(!d)return <section className="card"><h2 className="sectionTitle">Compensation Intelligence Command Center</h2><p className="muted">{err||'Analyzing compensation…'}</p></section>;
  return <section className="card stack">
    <div className="rowBetween"><div><h2 className="sectionTitle">Compensation Intelligence Command Center</h2><p className="muted">Positioning, salary-band exceptions, pending changes, cycle progress, pay-equity diagnostics, total rewards and Compensation → Payroll synchronization.</p></div><button className="button secondary compact" onClick={()=>askAi('Review the Compensation Intelligence Command Center. Explain employees outside salary bands, market gaps, pending compensation changes, cycle bottlenecks, pay-equity review flags and compensation/payroll mismatches. Recommend governed next steps only. Do not approve or change compensation.')}>✦ Compensation Copilot</button></div>
    {err&&<div className="error">{err}</div>}
    <div className="grid4">
      <div className="metricCard"><div className="metricLabel">Missing setup</div><div className="metricValue">{d.metrics.missingCompensation+d.metrics.missingBand}</div><div className="metricFoot">{d.metrics.missingCompensation} comp · {d.metrics.missingBand} band</div></div>
      <div className="metricCard"><div className="metricLabel">Outside band</div><div className="metricValue">{d.metrics.belowBand+d.metrics.aboveBand}</div><div className="metricFoot">{d.metrics.belowBand} below · {d.metrics.aboveBand} above</div></div>
      <div className="metricCard"><div className="metricLabel">Pending changes</div><div className="metricValue">{d.metrics.pendingChanges}</div><div className="metricFoot">effective-dated / governed</div></div>
      <div className="metricCard"><div className="metricLabel">Payroll sync attention</div><div className="metricValue">{d.metrics.payrollSyncAttention}</div><div className="metricFoot">{d.metrics.payEquityAlerts} pay-equity review flags</div></div>
    </div>
    <div className="tableWrap"><h3 className="sectionTitle">Compensation positioning & compression review</h3><table><thead><tr><th>Employee</th><th>Position</th><th>Annual pay</th><th>Band</th><th>Compa ratio</th><th>Market gap</th><th>Status</th></tr></thead><tbody>{d.flags.map((f:any)=><tr key={f.workerId}><td><strong>{f.displayName}</strong></td><td>{f.positionTitle||'—'}</td><td>{cad(f.annualPay)}</td><td>{f.bandMinAnnual!==undefined?`${cad(f.bandMinAnnual)} – ${cad(f.bandMaxAnnual)}`:'Unmapped'}</td><td>{f.compaRatioPct?`${f.compaRatioPct}%`:'—'}</td><td>{f.marketGap!==undefined?cad(f.marketGap):'—'}</td><td><span className="badge">{f.state.replaceAll('_',' ')}</span></td></tr>)}</tbody></table></div>
    {d.pendingChanges.length>0&&<div className="tableWrap"><h3 className="sectionTitle">Intelligent compensation change workflow</h3><table><thead><tr><th>Worker</th><th>Current</th><th>Proposed</th><th>Annual impact</th><th>Remaining-year impact</th><th>First payroll</th><th>Band</th><th>Status</th></tr></thead><tbody>{d.pendingChanges.map((x:any)=><tr key={x.id}><td>{d.workerDirectory.find((w:any)=>w.id===x.workerId)?.displayName||x.workerId}</td><td>{cad(x.currentAnnualPay,x.currency)}</td><td>{cad(x.proposedAnnualPay,x.currency)}</td><td>{cad(x.budgetImpactAnnual,x.currency)}</td><td>{cad(x.budgetImpactRemainingYear,x.currency)}</td><td>{x.firstAffectedPayrollDate||'Requires payroll profile'}</td><td>{x.bandStatus}{x.proposedCompaRatioPct?` · ${x.proposedCompaRatioPct}% CR`:''}</td><td><span className="badge">{x.status.replaceAll('_',' ')}</span></td></tr>)}</tbody></table></div>}
    <div className="grid2">
      <div className="notice"><strong>Compensation cycles</strong><br/>{d.cycles.length} cycles tracked across Draft → Manager review → HR review → Approved → Applied → Closed. Existing budget and maker-checker controls remain authoritative.</div>
      <div className="notice"><strong>Total rewards statements</strong><br/>{d.metrics.totalRewardsReady} workers currently have total-rewards data ready for governed statement presentation.</div>
    </div>
    <div className="notice"><strong>Pay equity intelligence:</strong> {d.metrics.payEquityAlerts} warning/high diagnostics require human HR/legal review. OPSIQO identifies positioning, compression and evidence gaps but does not make discrimination conclusions.</div>
    {d.payrollSyncAttention.length>0&&<div className="error"><strong>Compensation → Payroll synchronization attention:</strong> {d.payrollSyncAttention.length} worker(s) have a missing/stale sync review. No silent payroll synchronization is performed.</div>}
  </section>
}