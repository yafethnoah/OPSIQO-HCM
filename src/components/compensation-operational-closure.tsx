
'use client';

import { useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';

const today=()=>new Date().toISOString().slice(0,10);
const cad=(n?:number,c='CAD')=>typeof n==='number'?new Intl.NumberFormat('en-CA',{style:'currency',currency:c,maximumFractionDigits:2}).format(n):'—';
const askAi=(prompt:string)=>window.dispatchEvent(new CustomEvent('opsiqo:ai-assist',{detail:{prompt}}));
type Tab='readiness'|'employees'|'changes'|'sync';

export function CompensationOperationalClosure(){
  const[tab,setTab]=useState<Tab>('readiness');
  const[intel,setIntel]=useState<any>(null),[readiness,setReadiness]=useState<any>(null),[syncReview,setSyncReview]=useState<any>(null);
  const[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(''),[reviewNote,setReviewNote]=useState('');
  const[change,setChange]=useState({workerId:'',proposedPayBasis:'annual_salary',proposedBasePay:'',currency:'CAD',effectiveDate:today(),reason:'market',rationale:'',standardHoursPerWeek:'40',standardWeeksPerYear:'52',evidenceRefs:''});

  const load=async()=>{
    try{
      setError('');
      const[i,r]=await Promise.all([
        apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/compensation/intelligence`),
        apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/compensation/readiness`),
      ]);
      setIntel(i.data);setReadiness(r.data);
      const first=i.data.flags?.find((x:any)=>Number(x.annualPay||0)>0);
      setChange(x=>x.workerId?x:{...x,workerId:first?.workerId||'',proposedBasePay:first?.annualPay?String(first.annualPay):''});
    }catch(e){setError(e instanceof Error?e.message:'Unable to load Compensation Transaction Integrity.')}
  };
  useEffect(()=>{void load();const p=new URLSearchParams(window.location.search),w=p.get('syncWorker');if(w)setTimeout(()=>void openSyncReview(w),50)},[]);

  const intelligenceAction=async(body:any,success:string)=>{
    setBusy(body.action||'action');setError('');setMessage('');
    try{await apiFetch(`/api/organizations/${activeOrgId()}/compensation/intelligence`,{method:'POST',body:JSON.stringify(body)});setMessage(success);await load()}
    catch(e){setError(e instanceof Error?e.message:'Compensation action failed.')}
    finally{setBusy('')}
  };
  const readinessAction=async(body:any,success:string)=>{
    setBusy(body.action||'readiness');setError('');setMessage('');
    try{await apiFetch(`/api/organizations/${activeOrgId()}/compensation/readiness`,{method:'POST',body:JSON.stringify(body)});setMessage(success);await load()}
    catch(e){setError(e instanceof Error?e.message:'Compensation readiness action failed.')}
    finally{setBusy('')}
  };

  async function openSyncReview(workerId:string){
    setBusy(`sync-load:${workerId}`);setError('');setMessage('');
    try{const r=await apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/compensation/operational-closure?workerId=${encodeURIComponent(workerId)}`);setSyncReview(r.data);setReviewNote('');setTab('sync')}
    catch(e){setError(e instanceof Error?e.message:'Unable to load Compensation → Payroll comparison.')}
    finally{setBusy('')}
  }
  const confirmSync=async()=>{
    if(!syncReview?.workerId)return;
    setBusy(`sync:${syncReview.workerId}`);setError('');setMessage('');
    try{
      await apiFetch(`/api/organizations/${activeOrgId()}/compensation/operational-closure`,{method:'POST',body:JSON.stringify({action:'review_sync',workerId:syncReview.workerId,note:reviewNote})});
      setMessage('Compensation → Payroll synchronization reviewed and audit logged. Payroll pay was not silently changed.');await load();await openSyncReview(syncReview.workerId);
    }catch(e){setError(e instanceof Error?e.message:'Unable to confirm synchronization.')}
    finally{setBusy('')}
  };
  const createChange=()=>intelligenceAction({action:'create_change',input:{...change,proposedBasePay:Number(change.proposedBasePay),standardHoursPerWeek:Number(change.standardHoursPerWeek||40),standardWeeksPerYear:Number(change.standardWeeksPerYear||52),evidenceRefs:change.evidenceRefs.split(',').map(x=>x.trim()).filter(Boolean)}},'Compensation change request created in Draft.');

  if(!intel||!readiness)return <div className="notice">Loading Compensation Transaction Integrity…</div>;
  const currentFlag=intel.flags.find((x:any)=>x.workerId===change.workerId);
  const tabs:[Tab,string][]=[['readiness','Readiness'],['employees','Employees'],['changes','Changes'],['sync','Sync Review']];

  return <div className="stack payCompUx" style={{marginTop:18}}>
    <div className="rowBetween"><div><h2 className="sectionTitle">Transaction Integrity & Operational Closure</h2><p className="muted">One authoritative readiness definition, direct remediation, governed changes and evidence-first Compensation → Payroll review.</p></div><button className="button secondary compact" onClick={()=>askAi('Review Compensation Transaction Integrity. Explain mapping gaps, missing pay, salary-band issues, explicit payroll-profile review, Compensation → Payroll comparison items, change requests, budget impact and pay-equity indicators. Recommend governed next actions only; never approve or change pay.')}>✦ Compensation Copilot</button></div>
    <div className="tabBar">{tabs.map(([id,label])=><button key={id} className={tab===id?'tab active':'tab'} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}

    {tab==='readiness'&&<section className="card stack"><h3 className="sectionTitle">Authoritative Readiness Metrics</h3><p className="muted">Employee band mapping, architecture health and Compensation → Payroll attention use shared authorities across every card, table and workflow.</p><div className="grid4">
  <div className="metricCard"><div className="metricLabel">Workers in scope</div><div className="metricValue">{readiness.counts.workers}</div></div>
  <div className="metricCard"><div className="metricLabel">Missing current compensation</div><div className="metricValue">{readiness.counts.missingCompensation}</div></div>
  <div className="metricCard"><div className="metricLabel">Employee band mappings missing</div><div className="metricValue">{readiness.counts.missingBand}</div><div className="metricFoot">Architecture: {readiness.health.architecturePct}%</div></div>
  <div className="metricCard"><div className="metricLabel">Compensation → Payroll review</div><div className="metricValue">{readiness.counts.syncPending}</div><div className="metricFoot">same authority used by Payroll</div></div>
</div>
<div className="stack"><h4 className="sectionTitle">Architecture Score Breakdown</h4><p className="muted">Dimensions: Job Families · Job Levels · Salary Bands · Position Mappings · Employee Placements.</p><div className="architectureScoreGrid">{readiness.architecture.dimensions.map((x:any)=><div className="architectureScoreCard" key={x.key}><div className="rowBetween"><strong>{x.label}</strong><span className="badge">{x.pct}%</span></div><div className="miniProgress"><span style={{width:`${x.pct}%`}} /></div><div className="muted">{x.detail}</div></div>)}</div>{!readiness.architecture.foundationConfigured&&<div className="error">No active Job Families, Job Levels or Salary Bands are configured. Architecture health is therefore 0% until the foundation is created.</div>}</div>
</section>}

    {tab==='employees'&&<section className="card stack"><h3 className="sectionTitle">Worker Remediation Hub</h3><div className="compPayWideTable authorityStickyTable" style={{ overflowX: 'auto' }}><table><thead><tr><th>Employee</th><th>Position</th><th>Hourly</th><th>Monthly</th><th>Annual</th><th>Blockers</th><th>Band</th><th>Comp → Payroll</th><th>Next action</th></tr></thead><tbody>
      {readiness.workers.map((w:any)=><tr key={w.workerId}><td style={{ whiteSpace: 'nowrap' }}><strong>{w.displayName}</strong><div className="muted">#{w.employeeNumber}</div></td><td>{w.positionTitle||'Missing current position'}</td><td>{cad(w.hourlyRate,w.currency)}</td><td>{cad(w.monthlyPay,w.currency)}</td><td>{cad(w.annualPay,w.currency)}</td><td>{w.issues.length?w.issues.join('; '):<span className="badge">Ready</span>}</td>
      <td>{w.suggestedBand?<div><strong>{w.suggestedBand.code}</strong> · {w.suggestedBand.confidence}%<br/><button className="button compact" disabled={Boolean(busy)} onClick={()=>readinessAction({action:'apply_band_mapping',workerId:w.workerId,bandId:w.suggestedBand.bandId},'Suggested salary-band mapping applied after human review.')}>Review & apply band</button></div>:w.issues.includes('No salary band mapping')?<button className="button secondary compact" onClick={()=>window.dispatchEvent(new CustomEvent('opsiqo:compensation-open-architecture'))}>Map band</button>:'—'}</td>
      <td><span className="badge">{w.syncLabel||String(w.syncStatus||'missing').replaceAll('_',' ')}</span>{w.syncReason&&<div className="muted">{w.syncReason}</div>}</td>
      <td><div className="compPayActionRow">{w.issues.includes('Missing current position')&&<button className="button compact" onClick={()=>window.location.assign('/people')}>Add position</button>}{w.issues.includes('Missing current compensation')&&<button className="button compact" onClick={()=>window.dispatchEvent(new CustomEvent('opsiqo:compensation-open-employees'))}>Add compensation</button>}{w.issues.some((x:string)=>x.toLowerCase().includes('payroll profile'))&&<button className="button secondary compact" onClick={()=>window.location.assign('/payroll')}>Review payroll profile</button>}{w.syncRequiresAttention&&w.annualPay&&<button className="button secondary compact" disabled={busy===`sync-load:${w.workerId}`} onClick={()=>void openSyncReview(w.workerId)}>Compare & Review sync</button>}</div></td></tr>)}
    </tbody></table></div></section>}

    {tab==='changes'&&<div className="stack">
      <section className="card stack"><h3 className="sectionTitle">Create Compensation Change</h3><p className="muted">Preview current/proposed pay, salary-band position, annual/remaining-year budget impact and first affected payroll before approval.</p><div className="grid4">
        <label>Worker<select className="input" value={change.workerId} onChange={e=>{const f=intel.flags.find((x:any)=>x.workerId===e.target.value);setChange({...change,workerId:e.target.value,proposedBasePay:f?.annualPay?String(f.annualPay):''})}}><option value="">Select…</option>{intel.flags.filter((x:any)=>Number(x.annualPay||0)>0).map((x:any)=><option key={x.workerId} value={x.workerId}>{x.displayName}</option>)}</select></label>
        <label>Pay basis<select className="input" value={change.proposedPayBasis} onChange={e=>setChange({...change,proposedPayBasis:e.target.value})}><option value="annual_salary">Annual salary</option><option value="monthly_salary">Monthly salary</option><option value="hourly">Hourly</option></select></label>
        <label>Proposed amount<input className="input" type="number" min="0.01" step="0.01" value={change.proposedBasePay} onChange={e=>setChange({...change,proposedBasePay:e.target.value})}/></label>
        <label>Effective date<input className="input" type="date" value={change.effectiveDate} onChange={e=>setChange({...change,effectiveDate:e.target.value})}/></label>
        <label>Reason<select className="input" value={change.reason} onChange={e=>setChange({...change,reason:e.target.value})}>{['merit','promotion','market','equity','adjustment','demotion','other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Hours/week<input className="input" type="number" step="0.25" value={change.standardHoursPerWeek} onChange={e=>setChange({...change,standardHoursPerWeek:e.target.value})}/></label>
        <label>Weeks/year<input className="input" type="number" step="0.1" value={change.standardWeeksPerYear} onChange={e=>setChange({...change,standardWeeksPerYear:e.target.value})}/></label>
        <label>Evidence refs<input className="input" value={change.evidenceRefs} onChange={e=>setChange({...change,evidenceRefs:e.target.value})}/></label>
      </div><label>Rationale<textarea className="input" value={change.rationale} onChange={e=>setChange({...change,rationale:e.target.value})}/></label>
      {currentFlag&&<div className="notice"><strong>Current annual pay:</strong> {cad(currentFlag.annualPay)} · <strong>Current band:</strong> {currentFlag.state.replaceAll('_',' ')} · <strong>Compa ratio:</strong> {currentFlag.compaRatioPct?`${currentFlag.compaRatioPct}%`:'—'}</div>}
      <button className="button compact" disabled={Boolean(busy)||!change.workerId||Number(change.proposedBasePay)<=0} onClick={createChange}>Create governed change request</button></section>
      <section className="card stack"><h3 className="sectionTitle">Compensation Change Workflow</h3>{intel.pendingChanges.length===0?<div className="notice">No pending compensation change requests.</div>:<div className="compPayWideTable"><table><thead><tr><th>Worker</th><th>Current</th><th>Proposed</th><th>Annual impact</th><th>Remaining-year</th><th>First payroll</th><th>Band</th><th>Status</th><th>Action</th></tr></thead><tbody>{intel.pendingChanges.map((x:any)=><tr key={x.id}><td>{intel.workerDirectory.find((w:any)=>w.id===x.workerId)?.displayName||x.workerId}</td><td>{cad(x.currentAnnualPay,x.currency)}</td><td>{cad(x.proposedAnnualPay,x.currency)}</td><td>{cad(x.budgetImpactAnnual,x.currency)}</td><td>{cad(x.budgetImpactRemainingYear,x.currency)}</td><td>{x.firstAffectedPayrollDate||'Requires reviewed payroll profile'}</td><td>{x.bandStatus}{x.proposedCompaRatioPct?` · ${x.proposedCompaRatioPct}% CR`:''}</td><td><span className="badge">{x.status.replaceAll('_',' ')}</span></td><td><div className="compPayActionRow">{x.status==='draft'&&<button className="button compact" onClick={()=>intelligenceAction({action:'change_action',id:x.id,operation: 'submit'},'Compensation change submitted.')}>Submit</button>}{x.status==='submitted'&&<button className="button compact" onClick={()=>intelligenceAction({action:'change_action',id:x.id,operation:'send_to_hr'},'Compensation change sent to HR Review.')}>Send to HR</button>}{x.status==='hr_review'&&<><button className="button compact" onClick={()=>intelligenceAction({action:'change_action',id:x.id,operation: 'approve'},'Compensation change approved.')}>Approve</button><button className="button secondary compact" onClick={()=>intelligenceAction({action:'change_action',id:x.id,operation: 'reject'},'Compensation change rejected.')}>Reject</button></>}{x.status==='approved'&&<button className="button compact" onClick={()=>intelligenceAction({action:'change_action',id:x.id,operation:'apply'},'Approved change applied when effective and routed to explicit sync review.')}>Apply when effective</button>}</div></td></tr>)}</tbody></table></div>}</section>
    </div>}

    {tab==='sync'&&<section className="card stack"><h3 className="sectionTitle">Compensation → Payroll Evidence Comparison</h3>
      {!syncReview?<div className="notice">Choose “Compare & Review sync” for an employee. The reviewer must see compensation values, sync evidence, payroll-profile state and first affected payroll before confirmation.</div>:<>
        <div className="rowBetween"><div><strong>{syncReview.displayName}</strong><div className="muted">{syncReview.evaluation.reason}</div></div><span className="badge">{syncReview.evaluation.label||String(syncReview.evaluation.state).replaceAll('_',' ')}</span></div>
        <div className="grid4"><div className="metricCard"><div className="metricLabel">Compensation record</div><div className="metricValue" style={{fontSize:16}}>{syncReview.compensation.recordId}</div><div className="metricFoot">effective {syncReview.compensation.effectiveDate}</div></div><div className="metricCard"><div className="metricLabel">Annual</div><div className="metricValue">{cad(syncReview.compensation.annualPay,syncReview.compensation.currency)}</div></div><div className="metricCard"><div className="metricLabel">Payroll profile</div><div className="metricValue" style={{fontSize:18}}>{syncReview.payrollProfile?.explicitReviewComplete?'Reviewed':'Needs review'}</div><div className="metricFoot">{syncReview.payrollProfile?.province||'No profile'} · {syncReview.payrollProfile?.payPeriodsPerYear||'—'} periods</div></div><div className="metricCard"><div className="metricLabel">First affected payroll</div><div className="metricValue" style={{fontSize:18}}>{syncReview.firstAffectedPayrollDate||'Unavailable'}</div></div></div>
        <div className="compPayWideTable"><table><thead><tr><th>Field</th><th>Current compensation</th><th>Sync evidence</th><th>Match</th></tr></thead><tbody>{syncReview.comparisons.map((r:any)=><tr key={r.field}><td>{r.field}</td><td>{typeof r.compensation==='number'?cad(r.compensation,syncReview.compensation.currency):String(r.compensation)}</td><td>{typeof r.synchronization==='number'?cad(r.synchronization,syncReview.compensation.currency):String(r.synchronization??'missing')}</td><td><span className="badge">{r.match?'match':'review required'}</span></td></tr>)}</tbody></table></div>
        {!syncReview.canConfirm&&<div className="error">Sync confirmation is blocked until the Payroll Profile is enabled, explicitly human-reviewed and has a controlled payment-method reference.</div>}
        <label>Reviewer note<input className="input" value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Evidence / reviewer note"/></label><button className="button compact" disabled={!syncReview.canConfirm||busy===`sync:${syncReview.workerId}`} onClick={confirmSync}>Confirm reviewed synchronization</button><div className="notice">This action updates synchronization evidence only. It does not alter compensation, payroll pay values, payment instructions or release payroll.</div>
      </>}
    </section>}
  </div>;
}