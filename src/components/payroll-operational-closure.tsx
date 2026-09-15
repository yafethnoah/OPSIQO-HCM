
'use client';

import { useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { PAYROLL_PROVIDER_REGISTRY } from '@/lib/payroll/provider-registry';

const today=()=>new Date().toISOString().slice(0,10);
const cad=(n?:number,c='CAD')=>typeof n==='number'?new Intl.NumberFormat('en-CA',{style:'currency',currency:c,maximumFractionDigits:2}).format(n):'—';
const askAi=(prompt:string)=>window.dispatchEvent(new CustomEvent('opsiqo:ai-assist',{detail:{prompt}}));
type Tab='readiness'|'profiles'|'calendars'|'adjustments'|'runs'|'reconciliation';

const numericProfileFields=[
  'federalClaimAmount','provincialClaimAmount','additionalTax',
  'recurringTaxableBenefits','recurringPreTaxDeductions','recurringOtherDeductions',
] as const;

export function PayrollOperationalClosure(){
  const[tab,setTab]=useState<Tab>('readiness');
  const[intel,setIntel]=useState<any>(null),[dashboard,setDashboard]=useState<any>(null),[readiness,setReadiness]=useState<any>(null);
  const[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState('');

  const provider0=PAYROLL_PROVIDER_REGISTRY[0]!;
  const[providerCode,setProviderCode]=useState(provider0.code);
  const selectedProvider=PAYROLL_PROVIDER_REGISTRY.find(x=>x.code===providerCode)||provider0;
  const[mappingVersion,setMappingVersion]=useState(selectedProvider.mappingVersions[0]!);

  const[profileWorkerId,setProfileWorkerId]=useState(''),[profileConfirmed,setProfileConfirmed]=useState(false);
  const[profile,setProfile]=useState({
    province:'',payPeriodsPerYear:'',federalClaimAmount:'',provincialClaimAmount:'',additionalTax:'',
    recurringTaxableBenefits:'',recurringPreTaxDeductions:'',recurringOtherDeductions:'',paymentMethodRef:'',
    enabled:true,payDateRule:'run_default',payDateOffsetDays:'0',payDayOfMonth:'',weekendAdjustment:'none',
  });
  const[calendar,setCalendar]=useState({scope:'organization',targetId:'',rule:'run_default',offsetDays:'0',dayOfMonth:'15',weekendAdjustment:'none',effectiveDate:today(),endDate:'',reason:'Approved payroll calendar rule'});
  const[retro,setRetro]=useState({workerId:'',previousAnnualPay:'',newAnnualPay:'',payPeriodsPerYear:'',affectedPeriods:'1',effectiveDate:today(),approvalDate:today(),payDate:today(),reason:'',evidenceRefs:''});
  const[variablePay,setVariablePay]=useState({workerId:'',type:'bonus',calculationMethod:'fixed',amount:'',units:'',frequency:'one_time',currency:'CAD',payDate:today(),effectiveDate:today(),endDate:'',taxTreatmentRef:'',evidenceRefs:''});
  const[specialRun,setSpecialRun]=useState({kind:'off_cycle',name:'Controlled off-cycle payroll',payDate:today(),periodStart:today(),periodEnd:today(),workerId:'',sourceRunId:'',reason:'Approved off-cycle payroll requirement'});

  const endpoint=`/api/organizations/${activeOrgId()}/payroll/intelligence`;
  const load=async()=>{
    try{
      setError('');
      const[i,d,r]=await Promise.all([
        apiFetch<{data:any}>(endpoint),
        apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/payroll/dashboard`),
        apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/payroll/readiness`),
      ]);
      setIntel(i.data);setDashboard(d.data);setReadiness(r.data);
      const first=i.data.workers?.[0]?.workerId||'';
      setRetro(x=>x.workerId?x:{...x,workerId:first});
      setVariablePay(x=>x.workerId?x:{...x,workerId:first});
      setSpecialRun(x=>x.workerId?x:{...x,workerId:first});
    }catch(e){setError(e instanceof Error?e.message:'Unable to load Payroll Transaction Integrity.')}
  };
  useEffect(()=>{void load()},[]);

  const workers=intel?.workers||[],providers=dashboard?.providers?.filter((x:any)=>(x.environment||'uat')==='uat')||[],activeRuns=intel?.runs||[];

  const action=async(body:any,success:string)=>{
    setBusy(body.action||'action');setError('');setMessage('');
    try{await apiFetch(endpoint,{method:'POST',body:JSON.stringify(body)});setMessage(success);await load()}
    catch(e){setError(e instanceof Error?e.message:'Governed payroll action failed.')}
    finally{setBusy('')}
  };

  const configureProvider=async()=>{
    setBusy('provider');setError('');setMessage('');
    try{
      await apiFetch(`/api/organizations/${activeOrgId()}/payroll/providers`,{method:'POST',body:JSON.stringify({
        code:selectedProvider.code,name:selectedProvider.name,adapterCode:selectedProvider.adapterCode,
        mappingVersion,secretRefs:[],environment:'uat',
      })});
      setMessage('Registered UAT provider configured. No credential values were stored.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to configure UAT provider.')}
    finally{setBusy('')}
  };

  const beginProfile=(workerId:string)=>{
    const existing=dashboard?.workerProfiles?.find((x:any)=>x.workerId===workerId);
    const v=(name:string)=>existing?.[name]===undefined||existing?.[name]===null?'':String(existing[name]);
    setProfileWorkerId(workerId);setProfileConfirmed(false);setProfile({
      province:existing?.province||'',payPeriodsPerYear:v('payPeriodsPerYear'),
      federalClaimAmount:v('federalClaimAmount'),provincialClaimAmount:v('provincialClaimAmount'),additionalTax:v('additionalTax'),
      recurringTaxableBenefits:v('recurringTaxableBenefits'),recurringPreTaxDeductions:v('recurringPreTaxDeductions'),recurringOtherDeductions:v('recurringOtherDeductions'),
      paymentMethodRef:existing?.paymentMethodRef||'',enabled:existing?.enabled??true,payDateRule:existing?.payDateRule||'run_default',
      payDateOffsetDays:v('payDateOffsetDays')||'0',payDayOfMonth:v('payDayOfMonth'),weekendAdjustment:existing?.weekendAdjustment||'none',
    });setTab('profiles');
  };

  const saveProfile=async()=>{
    if(!profileWorkerId)return setError('Choose a worker to review.');
    if(!profile.province)return setError('Province must be reviewed and selected by a human.');
    if(!Number(profile.payPeriodsPerYear))return setError('Pay periods per year must be reviewed and entered.');
    if(!profile.paymentMethodRef.trim())return setError('Payment method reference must be reviewed and entered.');
    const missing=numericProfileFields.filter(f=>profile[f].trim()==='');
    if(missing.length)return setError(`Unknown is not zero. Review and explicitly enter these values, including 0 when confirmed: ${missing.join(', ')}.`);
    if(!profileConfirmed)return setError('Confirm that every visible payroll-profile value was human-reviewed before saving.');
    setBusy('profile');setError('');setMessage('');
    try{
      await apiFetch(`/api/organizations/${activeOrgId()}/payroll/profiles/${profileWorkerId}`,{method:'PUT',body:JSON.stringify({
        province:profile.province,payPeriodsPerYear:Number(profile.payPeriodsPerYear),
        federalClaimAmount:Number(profile.federalClaimAmount),provincialClaimAmount:Number(profile.provincialClaimAmount),additionalTax:Number(profile.additionalTax),
        recurringTaxableBenefits:Number(profile.recurringTaxableBenefits),recurringPreTaxDeductions:Number(profile.recurringPreTaxDeductions),recurringOtherDeductions:Number(profile.recurringOtherDeductions),
        paymentMethodRef:profile.paymentMethodRef.trim(),enabled:profile.enabled,payDateRule:profile.payDateRule,
        payDateOffsetDays:Number(profile.payDateOffsetDays||0),payDayOfMonth:profile.payDateRule==='fixed_day_of_month'?Number(profile.payDayOfMonth):undefined,
        weekendAdjustment:profile.weekendAdjustment,reviewConfirmed:true,
      })});
      setMessage('Payroll profile saved with explicit human-review evidence. Unknown values were not silently converted to zero.');setProfileConfirmed(false);await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to save payroll profile.')}
    finally{setBusy('')}
  };

  const saveCalendar=()=>action({action:'save_calendar',input:{
    scope:calendar.scope,targetId:calendar.scope==='organization'?undefined:calendar.targetId,rule:calendar.rule,
    offsetDays:calendar.rule==='offset_days'?Number(calendar.offsetDays||0):undefined,dayOfMonth:calendar.rule==='fixed_day_of_month'?Number(calendar.dayOfMonth||1):undefined,
    weekendAdjustment:calendar.weekendAdjustment,effectiveDate:calendar.effectiveDate,endDate:calendar.endDate||undefined,reason:calendar.reason,
  }},'Payroll calendar rule saved and next-release dates recalculated.');

  const createRetro=()=>action({action:'create_retro',input:{...retro,previousAnnualPay:Number(retro.previousAnnualPay),newAnnualPay:Number(retro.newAnnualPay),payPeriodsPerYear:Number(retro.payPeriodsPerYear),affectedPeriods:Number(retro.affectedPeriods),evidenceRefs:retro.evidenceRefs.split(',').map(x=>x.trim()).filter(Boolean)}},'Retro case created in Draft.');
  const createVariable=()=>action({action:'create_variable_pay',input:{...variablePay,amount:Number(variablePay.amount),units:variablePay.units?Number(variablePay.units):undefined,endDate:variablePay.endDate||undefined,taxTreatmentRef:variablePay.taxTreatmentRef||undefined,evidenceRefs:variablePay.evidenceRefs.split(',').map(x=>x.trim()).filter(Boolean)}},'Variable-pay item created in Draft.');
  const createRun=()=>action({action: 'create_special_run',input:{kind:specialRun.kind,name:specialRun.name,payDate:specialRun.payDate,periodStart:specialRun.periodStart,periodEnd:specialRun.periodEnd,workerIds:specialRun.workerId?[specialRun.workerId]:undefined,providerId:providers[0]?.id,sourceRunId:specialRun.kind==='correction'?specialRun.sourceRunId:undefined,reason:specialRun.reason,idempotencyKey:globalThis.crypto?.randomUUID?.()||`${Date.now()}-special`}},'Specialized UAT payroll run created under existing controls.');

  if(!intel||!dashboard||!readiness)return <div className="notice">Loading Payroll Transaction Integrity…</div>;

  const tabs:[Tab,string][]=[['readiness','Readiness'],['profiles','Profiles'],['calendars','Calendars'],['adjustments','Adjustments'],['runs','Runs'],['reconciliation','Reconciliation']];

  return <div className="stack payCompUx" style={{marginTop:18}}>
    <div className="rowBetween"><div><h2 className="sectionTitle">Transaction Integrity & Operational Closure</h2><p className="muted">One governed workspace for readiness, explicit profile review, calendars, adjustments, runs and reconciliation.</p></div><button className="button secondary compact" onClick={()=>askAi('Review Payroll Transaction Integrity. Prioritize unresolved profiles, Compensation → Payroll synchronization, release-date exceptions, provider prerequisites, retro cases, variable pay, specialized runs, anomalies and reconciliation. Recommend actions only; never release payroll or override a blocker.')}>✦ Payroll Copilot</button></div>
    <div className="tabBar">{tabs.map(([id,label])=><button key={id} className={tab===id?'tab active':'tab'} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}

    {tab==='readiness'&&<section className="card stack">
      <div className="rowBetween"><div><h3 className="sectionTitle">Blocker Resolution</h3><p className="muted">Payroll and Compensation use the same synchronization authority.</p></div>{providers.length===0&&<button className="button compact" onClick={()=>setTab('runs')}>Configure UAT provider</button>}</div>
      <div className="compPayWideTable" style={{ overflowX: 'auto' }}><table><thead><tr><th>Employee</th><th>Hourly</th><th>Monthly</th><th>Annual</th><th>Next release</th><th>Sync</th><th>Issue</th><th>Action</th></tr></thead>
      <tbody>{workers.map((w:any)=><tr key={w.workerId}><td style={{ whiteSpace: 'nowrap' }}><strong>{w.displayName}</strong><div className="muted">#{w.employeeNumber}</div></td><td>{cad(w.hourlyRate,w.currency)}</td><td>{cad(w.monthlyPay,w.currency)}</td><td>{cad(w.annualPay,w.currency)}</td><td>{w.nextReleaseDate}<div className="muted">{w.releaseSource}</div></td><td><span className="badge">{String(w.syncStatus||'missing').replaceAll('_',' ')}</span>{w.syncReason&&<div className="muted">{w.syncReason}</div>}</td><td>{w.ready?<span className="badge">Ready</span>:w.issues.join('; ')}</td><td><div className="compPayActionRow">{!w.profileEnabled&&<button className="button compact" onClick={()=>beginProfile(w.workerId)}>Review profile</button>}<button className="button secondary compact" onClick={()=>window.location.assign('/compensation')}>Open Compensation</button>{w.syncRequiresAttention&&<button className="button secondary compact" onClick={()=>window.location.assign(`/compensation?syncWorker=${encodeURIComponent(w.workerId)}`)}>Review Sync</button>}</div></td></tr>)}</tbody></table></div>
    </section>}

    {tab==='profiles'&&<section className="card stack">
      <h3 className="sectionTitle">Payroll Profile Review</h3><div className="notice"><strong>Unknown ≠ 0.</strong> Consequential tax and deduction fields remain blank until an authorized human reviews them. Enter 0 only when 0 was explicitly confirmed.</div>
      <label>Worker<select className="input" value={profileWorkerId} onChange={e=>beginProfile(e.target.value)}><option value="">Choose worker…</option>{readiness.workers.map((w:any)=><option key={w.workerId} value={w.workerId}>{w.displayName} — {w.issues.join(', ')||'ready'}</option>)}</select></label>
      {profileWorkerId&&<><div className="grid4">
        <label>Province<select className="input" value={profile.province} onChange={e=>setProfile({...profile,province:e.target.value})}><option value="">Select…</option>{['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'].map(p=><option key={p}>{p}</option>)}</select></label>
        <label>Pay periods/year<input className="input" type="number" min="1" max="366" value={profile.payPeriodsPerYear} onChange={e=>setProfile({...profile,payPeriodsPerYear:e.target.value})}/></label>
        <label>Federal claim<input className="input" type="number" step="0.01" placeholder="Unreviewed" value={profile.federalClaimAmount} onChange={e=>setProfile({...profile,federalClaimAmount:e.target.value})}/></label>
        <label>Provincial claim<input className="input" type="number" step="0.01" placeholder="Unreviewed" value={profile.provincialClaimAmount} onChange={e=>setProfile({...profile,provincialClaimAmount:e.target.value})}/></label>
        <label>Additional tax<input className="input" type="number" step="0.01" placeholder="Unreviewed" value={profile.additionalTax} onChange={e=>setProfile({...profile,additionalTax:e.target.value})}/></label>
        <label>Recurring taxable benefits<input className="input" type="number" step="0.01" placeholder="Unreviewed" value={profile.recurringTaxableBenefits} onChange={e=>setProfile({...profile,recurringTaxableBenefits:e.target.value})}/></label>
        <label>Recurring pre-tax deductions<input className="input" type="number" step="0.01" placeholder="Unreviewed" value={profile.recurringPreTaxDeductions} onChange={e=>setProfile({...profile,recurringPreTaxDeductions:e.target.value})}/></label>
        <label>Recurring other deductions<input className="input" type="number" step="0.01" placeholder="Unreviewed" value={profile.recurringOtherDeductions} onChange={e=>setProfile({...profile,recurringOtherDeductions:e.target.value})}/></label>
        <label>Payment method reference<input className="input" value={profile.paymentMethodRef} onChange={e=>setProfile({...profile,paymentMethodRef:e.target.value})} placeholder="Controlled reference only"/></label>
        <label>Release rule<select className="input" value={profile.payDateRule} onChange={e=>setProfile({...profile,payDateRule:e.target.value})}><option value="run_default">Run default</option><option value="offset_days">Offset days</option><option value="fixed_day_of_month">Fixed day of month</option></select></label>
        <label>Weekend adjustment<select className="input" value={profile.weekendAdjustment} onChange={e=>setProfile({...profile,weekendAdjustment:e.target.value})}><option value="none">None</option><option value="previous_weekday">Previous weekday</option><option value="next_weekday">Next weekday</option></select></label>
        {profile.payDateRule==='offset_days'&&<label>Offset days<input className="input" type="number" min="-31" max="31" value={profile.payDateOffsetDays} onChange={e=>setProfile({...profile,payDateOffsetDays:e.target.value})}/></label>}
        {profile.payDateRule==='fixed_day_of_month'&&<label>Day of month<input className="input" type="number" min="1" max="31" value={profile.payDayOfMonth} onChange={e=>setProfile({...profile,payDayOfMonth:e.target.value})}/></label>}
      </div><label className="notice"><input type="checkbox" checked={profileConfirmed} onChange={e=>setProfileConfirmed(e.target.checked)}/> I confirm every visible payroll-profile value, including any entered zero, was reviewed by an authorized human.</label><button className="button compact" disabled={busy==='profile'} onClick={saveProfile}>Save explicitly reviewed payroll profile</button></>}
    </section>}

    {tab==='calendars'&&<section className="card stack"><h3 className="sectionTitle">Pay Calendar Manager</h3><p className="muted">Precedence: exact run override → worker rule → pay group → org unit → organization calendar.</p>
      <div className="grid4">
        <label>Scope<select className="input" value={calendar.scope} onChange={e=>setCalendar({...calendar,scope:e.target.value,targetId:''})}><option value="organization">Organization</option><option value="org_unit">Org unit</option><option value="pay_group">Pay group</option><option value="worker">Worker</option></select></label>
        {calendar.scope==='worker'?<label>Worker<select className="input" value={calendar.targetId} onChange={e=>setCalendar({...calendar,targetId:e.target.value})}><option value="">Select…</option>{workers.map((w:any)=><option key={w.workerId} value={w.workerId}>{w.displayName}</option>)}</select></label>:calendar.scope!=='organization'?<label>Target ID<input className="input" value={calendar.targetId} onChange={e=>setCalendar({...calendar,targetId:e.target.value})}/></label>:null}
        <label>Rule<select className="input" value={calendar.rule} onChange={e=>setCalendar({...calendar,rule:e.target.value})}><option value="run_default">Run default</option><option value="offset_days">Offset days</option><option value="fixed_day_of_month">Fixed day of month</option><option value="last_business_day">Last business day</option></select></label>
        {calendar.rule==='offset_days'&&<label>Offset<input className="input" type="number" min="-31" max="31" value={calendar.offsetDays} onChange={e=>setCalendar({...calendar,offsetDays:e.target.value})}/></label>}
        {calendar.rule==='fixed_day_of_month'&&<label>Day of month<input className="input" type="number" min="1" max="31" value={calendar.dayOfMonth} onChange={e=>setCalendar({...calendar,dayOfMonth:e.target.value})}/></label>}
        <label>Weekend<select className="input" value={calendar.weekendAdjustment} onChange={e=>setCalendar({...calendar,weekendAdjustment:e.target.value})}><option value="none">None</option><option value="previous_weekday">Previous weekday</option><option value="next_weekday">Next weekday</option></select></label>
        <label>Effective<input className="input" type="date" value={calendar.effectiveDate} onChange={e=>setCalendar({...calendar,effectiveDate:e.target.value})}/></label>
        <label>End date<input className="input" type="date" value={calendar.endDate} onChange={e=>setCalendar({...calendar,endDate:e.target.value})}/></label>
        <label>Reason<input className="input" value={calendar.reason} onChange={e=>setCalendar({...calendar,reason:e.target.value})}/></label>
      </div><button className="button compact" disabled={Boolean(busy)} onClick={saveCalendar}>Save calendar rule</button>
      <div className="compPayWideTable"><table><thead><tr><th>Scope</th><th>Target</th><th>Rule</th><th>Effective</th><th>End</th><th>Reason</th></tr></thead><tbody>{intel.calendarRules.map((r:any)=><tr key={r.id}><td>{r.scope}</td><td>{r.targetId||'organization'}</td><td>{r.rule}</td><td>{r.effectiveDate}</td><td>{r.endDate||'—'}</td><td>{r.reason}</td></tr>)}</tbody></table></div>
    </section>}

    {tab==='adjustments'&&<div className="stack">
      <section className="card stack"><h3 className="sectionTitle">Retro / Correction Workflow</h3><div className="grid4">
        <label>Worker<select className="input" value={retro.workerId} onChange={e=>{const w=workers.find((x:any)=>x.workerId===e.target.value);setRetro({...retro,workerId:e.target.value,previousAnnualPay:w?.annualPay?String(w.annualPay):retro.previousAnnualPay})}}><option value="">Select…</option>{workers.map((w:any)=><option key={w.workerId} value={w.workerId}>{w.displayName}</option>)}</select></label>
        <label>Previous annual<input className="input" type="number" step="0.01" value={retro.previousAnnualPay} onChange={e=>setRetro({...retro,previousAnnualPay:e.target.value})}/></label>
        <label>New annual<input className="input" type="number" step="0.01" value={retro.newAnnualPay} onChange={e=>setRetro({...retro,newAnnualPay:e.target.value})}/></label>
        <label>Pay periods/year<input className="input" type="number" value={retro.payPeriodsPerYear} onChange={e=>setRetro({...retro,payPeriodsPerYear:e.target.value})}/></label>
        <label>Affected periods<input className="input" type="number" value={retro.affectedPeriods} onChange={e=>setRetro({...retro,affectedPeriods:e.target.value})}/></label>
        <label>Effective<input className="input" type="date" value={retro.effectiveDate} onChange={e=>setRetro({...retro,effectiveDate:e.target.value})}/></label>
        <label>Approval date<input className="input" type="date" value={retro.approvalDate} onChange={e=>setRetro({...retro,approvalDate:e.target.value})}/></label>
        <label>Target pay date<input className="input" type="date" value={retro.payDate} onChange={e=>setRetro({...retro,payDate:e.target.value})}/></label>
        <label>Reason<input className="input" value={retro.reason} onChange={e=>setRetro({...retro,reason:e.target.value})}/></label>
        <label>Evidence refs<input className="input" value={retro.evidenceRefs} onChange={e=>setRetro({...retro,evidenceRefs:e.target.value})}/></label>
      </div><button className="button compact" disabled={Boolean(busy)} onClick={createRetro}>Create retro case</button>
      {intel.retroCases.length>0&&<div className="compPayWideTable"><table><thead><tr><th>Worker</th><th>Retro</th><th>Pay date</th><th>Status</th><th>Action</th></tr></thead><tbody>{intel.retroCases.map((x:any)=><tr key={x.id}><td>{workers.find((w:any)=>w.workerId===x.workerId)?.displayName||x.workerId}</td><td>{cad(x.retroAmount)}</td><td>{x.payDate}</td><td>{x.status}</td><td><div className="compPayActionRow">{x.status==='draft'&&<button className="button compact" onClick={()=>action({action:'retro_action',id:x.id,operation: 'submit'},'Retro case submitted.')}>Submit</button>}{x.status==='submitted'&&<><button className="button compact" onClick={()=>action({action:'retro_action',id:x.id,operation: 'approve'},'Retro case approved.')}>Approve</button><button className="button secondary compact" onClick={()=>action({action:'retro_action',id:x.id,operation: 'reject'},'Retro case rejected.')}>Reject</button></>}{x.status==='approved'&&<button className="button compact" onClick={()=>action({action:'retro_action',id:x.id,operation: 'prepare'},'Retro adjustment prepared.')}>Prepare adjustment</button>}</div></td></tr>)}</tbody></table></div>}
      </section>
      <section className="card stack"><h3 className="sectionTitle">Variable Compensation Workflow</h3><div className="grid4">
        <label>Worker<select className="input" value={variablePay.workerId} onChange={e=>setVariablePay({...variablePay,workerId:e.target.value})}><option value="">Select…</option>{workers.map((w:any)=><option key={w.workerId} value={w.workerId}>{w.displayName}</option>)}</select></label>
        <label>Type<select className="input" value={variablePay.type} onChange={e=>setVariablePay({...variablePay,type:e.target.value})}>{['bonus','commission','shift_premium','overtime','allowance','car_allowance','housing_allowance','meal_allowance','expense_reimbursement','retention_bonus','signing_bonus','performance_award','other'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
        <label>Calculation<select className="input" value={variablePay.calculationMethod} onChange={e=>setVariablePay({...variablePay,calculationMethod:e.target.value})}><option value="fixed">Fixed</option><option value="percent_of_base">% of base</option><option value="hourly">Hourly</option></select></label>
        <label>Amount<input className="input" type="number" step="0.01" value={variablePay.amount} onChange={e=>setVariablePay({...variablePay,amount:e.target.value})}/></label>
        <label>Units<input className="input" type="number" step="0.01" value={variablePay.units} onChange={e=>setVariablePay({...variablePay,units:e.target.value})}/></label>
        <label>Frequency<select className="input" value={variablePay.frequency} onChange={e=>setVariablePay({...variablePay,frequency:e.target.value})}><option value="one_time">One time</option><option value="per_pay">Per pay</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></label>
        <label>Pay date<input className="input" type="date" value={variablePay.payDate} onChange={e=>setVariablePay({...variablePay,payDate:e.target.value})}/></label>
        <label>Effective<input className="input" type="date" value={variablePay.effectiveDate} onChange={e=>setVariablePay({...variablePay,effectiveDate:e.target.value})}/></label>
        <label>Evidence refs<input className="input" value={variablePay.evidenceRefs} onChange={e=>setVariablePay({...variablePay,evidenceRefs:e.target.value})}/></label>
      </div><button className="button compact" disabled={Boolean(busy)} onClick={createVariable}>Create variable-pay item</button>
      {intel.variablePay.length>0&&<div className="compPayWideTable"><table><thead><tr><th>Worker</th><th>Type</th><th>Amount</th><th>Pay date</th><th>Status</th><th>Action</th></tr></thead><tbody>{intel.variablePay.map((x:any)=><tr key={x.id}><td>{workers.find((w:any)=>w.workerId===x.workerId)?.displayName||x.workerId}</td><td>{x.type}</td><td>{cad(x.amount,x.currency)}</td><td>{x.payDate||'—'}</td><td>{x.status}</td><td><div className="compPayActionRow">{x.status==='draft'&&<button className="button compact" onClick={()=>action({action:'variable_action',id:x.id,operation: 'submit'},'Variable pay submitted.')}>Submit</button>}{x.status==='submitted'&&<><button className="button compact" onClick={()=>action({action:'variable_action',id:x.id,operation: 'approve'},'Variable pay approved.')}>Approve</button><button className="button secondary compact" onClick={()=>action({action:'variable_action',id:x.id,operation: 'reject'},'Variable pay rejected.')}>Reject</button></>}{x.status==='approved'&&<button className="button compact" onClick={()=>action({action:'variable_action',id:x.id,operation: 'prepare'},'Variable-pay adjustment prepared.')}>Prepare adjustment</button>}</div></td></tr>)}</tbody></table></div>}
      </section>
      {intel.anomalies?.length>0&&<section className="card stack"><h3 className="sectionTitle">Variance Investigation</h3>{intel.anomalies.map((a:any)=><div className="notice" key={a.id}><div className="rowBetween"><div><strong>{a.displayName} · {a.metric.toUpperCase()} {a.deltaPct>0?'+':''}{a.deltaPct}%</strong><br/>{cad(a.previousAmount)} → {cad(a.currentAmount)}</div><button className="button secondary compact" onClick={()=>askAi(`Investigate this payroll variance for ${a.displayName}. Explain evidence to review only; do not change payroll or approve anything.`)}>Investigate with AI</button></div></div>)}</section>}
    </div>}

    {tab==='runs'&&<div className="stack">
      <section className="card stack"><h3 className="sectionTitle">Registered UAT Provider</h3><p className="muted">Provider, adapter and mapping version come from the governed registry. Free-text combinations are rejected server-side.</p><div className="grid4">
        <label>Provider<select className="input" value={providerCode} onChange={e=>{const next=PAYROLL_PROVIDER_REGISTRY.find(x=>x.code===e.target.value)||provider0;setProviderCode(next.code);setMappingVersion(next.mappingVersions[0]!)}}>{PAYROLL_PROVIDER_REGISTRY.filter(x=>x.environments.includes('uat')).map(x=><option key={x.code} value={x.code}>{x.name}</option>)}</select></label>
        <label>Adapter<input className="input" value={selectedProvider.adapterCode} readOnly/></label>
        <label>Mapping version<select className="input" value={mappingVersion} onChange={e=>setMappingVersion(e.target.value)}>{selectedProvider.mappingVersions.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Environment<input className="input" value="uat" readOnly/></label>
      </div><div className="notice">{selectedProvider.description}</div><button className="button compact" disabled={busy==='provider'} onClick={configureProvider}>Configure UAT provider</button></section>
      <section className="card stack"><h3 className="sectionTitle">Specialized / Off-Cycle Payroll</h3><div className="grid4">
        <label>Run type<select className="input" value={specialRun.kind} onChange={e=>setSpecialRun({...specialRun,kind:e.target.value})}>{['off_cycle','correction','termination','bonus','commission','emergency','retro'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
        <label>Name<input className="input" value={specialRun.name} onChange={e=>setSpecialRun({...specialRun,name:e.target.value})}/></label>
        <label>Worker<select className="input" value={specialRun.workerId} onChange={e=>setSpecialRun({...specialRun,workerId:e.target.value})}><option value="">All reviewed workers</option>{workers.map((w:any)=><option key={w.workerId} value={w.workerId}>{w.displayName}</option>)}</select></label>
        <label>Pay date<input className="input" type="date" value={specialRun.payDate} onChange={e=>setSpecialRun({...specialRun,payDate:e.target.value})}/></label>
        <label>Period start<input className="input" type="date" value={specialRun.periodStart} onChange={e=>setSpecialRun({...specialRun,periodStart:e.target.value})}/></label>
        <label>Period end<input className="input" type="date" value={specialRun.periodEnd} onChange={e=>setSpecialRun({...specialRun,periodEnd:e.target.value})}/></label>
        {specialRun.kind==='correction'&&<label>Source run<select className="input" value={specialRun.sourceRunId} onChange={e=>setSpecialRun({...specialRun,sourceRunId:e.target.value})}><option value="">Select…</option>{activeRuns.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
        <label>Reason<input className="input" value={specialRun.reason} onChange={e=>setSpecialRun({...specialRun,reason:e.target.value})}/></label>
      </div>{providers.length===0&&<div className="error">No registered UAT provider is configured. Configure one above before creating a controlled specialized run.</div>}<button className="button compact" disabled={Boolean(busy)||providers.length===0} onClick={createRun}>Create controlled UAT run</button></section>
    </div>}

    {tab==='reconciliation'&&<section className="card stack"><h3 className="sectionTitle">Payroll Run & Reconciliation Status</h3><div className="compPayWideTable"><table><thead><tr><th>Run</th><th>Type</th><th>Stage</th><th>Pay date</th><th>Workers</th><th>Reconciliation</th></tr></thead><tbody>{activeRuns.map((r:any)=><tr key={r.id}><td>{r.name}</td><td>{r.kind||'regular'}</td><td>{r.operationalStage}</td><td>{r.payDate}</td><td>{r.totals?.workers||r.workerIds?.length||'—'}</td><td>{r.reconciliation?.status||'pending'}</td></tr>)}</tbody></table></div><div className="notice">A non-zero provider/accounting discrepancy must block payroll closure. Existing Payroll maker-checker, regulatory certification, provider and reconciliation gates remain authoritative.</div></section>}
  </div>;
}