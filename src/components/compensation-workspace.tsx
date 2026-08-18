'use client';

import { useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import type { ActorContext } from '@/domain/security';
import type { CompensationDashboard } from '@/domain/compensation';
import { LoadingState } from '@/components/data-states';

type Tab = 'overview'|'employees'|'market'|'architecture'|'cycles'|'rewards'|'letters'|'payEquity'|'transparency';
type WorkerView = CompensationDashboard['workers'][number];
type Cycle = CompensationDashboard['cycles'][number];

type Call = (path:string, init:RequestInit)=>Promise<void>;

const cad = (n?:number,c='CAD') => typeof n==='number'
  ? new Intl.NumberFormat('en-CA',{style:'currency',currency:c,maximumFractionDigits:0}).format(n)
  : '—';
const today = () => new Date().toISOString().slice(0,10);
const clean = (value:string) => value.trim().toLowerCase();

function workerHealth(worker: WorkerView) {
  if (!worker.current) return { key:'missing_pay', label:'Missing pay record', severity:'high' as const };
  if (!worker.salaryBand) return { key:'missing_band', label:'No salary band', severity:'warning' as const };
  const pay = worker.current.annualizedBasePay;
  if (pay < worker.salaryBand.min) return { key:'below_min', label:'Below band minimum', severity:'high' as const };
  if (pay > worker.salaryBand.max) return { key:'above_max', label:'Above band maximum', severity:'warning' as const };
  if (typeof worker.compaRatioPct === 'number' && (worker.compaRatioPct < 85 || worker.compaRatioPct > 115)) {
    return { key:'position_review', label:'Positioning review', severity:'warning' as const };
  }
  return { key:'in_range', label:'In configured range', severity:'info' as const };
}

function compensationHealth(data: CompensationDashboard) {
  const rows = data.workers.map(worker => ({ worker, health: workerHealth(worker) }));
  return {
    rows,
    missingPay: rows.filter(row => row.health.key==='missing_pay').length,
    missingBand: rows.filter(row => row.health.key==='missing_band').length,
    belowMin: rows.filter(row => row.health.key==='below_min').length,
    aboveMax: rows.filter(row => row.health.key==='above_max').length,
    inRange: rows.filter(row => row.health.key==='in_range').length,
    marketCoverage: data.workers.filter(worker => typeof worker.marketPositionPct==='number').length,
    rewardsCoverage: data.workers.filter(worker => Boolean(worker.totalRewards)).length,
    highPayEquity: data.payEquityDiagnostics.filter(item => item.severity==='high').length,
  };
}

function cycleBudgetSnapshot(data: CompensationDashboard, cycle: Cycle) {
  const eligible = cycle.eligibleWorkerIds?.length
    ? data.workers.filter(worker => cycle.eligibleWorkerIds!.includes(worker.workerId))
    : data.workers;
  const payroll = eligible.reduce((sum,worker)=>sum+Number(worker.current?.annualizedBasePay||0),0);
  const limit = typeof cycle.budgetAmount==='number'
    ? cycle.budgetAmount
    : typeof cycle.budgetPct==='number'
      ? payroll*cycle.budgetPct/100
      : undefined;
  const recs = data.recommendations.filter(rec => rec.cycleId===cycle.id);
  const committed = recs
    .filter(rec => ['approved','applied'].includes(rec.status))
    .reduce((sum,rec)=>sum+rec.proposedIncreaseAmount+rec.lumpSumAmount,0);
  const proposed = recs
    .filter(rec => !['rejected'].includes(rec.status))
    .reduce((sum,rec)=>sum+rec.proposedIncreaseAmount+rec.lumpSumAmount,0);
  return {
    payroll,
    limit,
    committed,
    proposed,
    utilization: limit && limit>0 ? Math.round(committed/limit*1000)/10 : undefined,
  };
}

function employeeName(data:CompensationDashboard, workerId:string) {
  return data.workerDirectory.find(worker=>worker.id===workerId)?.displayName || workerId;
}

function csvCell(value:unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"','""')}"`;
}

function downloadCompensationCsv(data:CompensationDashboard, rows:WorkerView[]) {
  const header = ['Employee','Employee number','Position','Base pay','Currency','Band','Band min','Band midpoint','Band max','Compa ratio %','Range penetration %','Market P50 position %','Health'];
  const body = rows.map(worker => {
    const health = workerHealth(worker);
    return [
      worker.displayName,
      worker.employeeNumber,
      worker.positionTitle||'',
      worker.current?.annualizedBasePay||'',
      worker.current?.currency||'',
      worker.salaryBand?.code||'',
      worker.salaryBand?.min||'',
      worker.salaryBand?.midpoint||'',
      worker.salaryBand?.max||'',
      worker.compaRatioPct||'',
      worker.rangePenetrationPct||'',
      worker.marketPositionPct||'',
      health.label,
    ];
  });
  const csv = [header,...body].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `opsiqo-compensation-snapshot-${today()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function CompensationWorkspace(){
  const [data,setData] = useState<CompensationDashboard|null>(null);
  const [actor,setActor] = useState<ActorContext|null>(null);
  const [tab,setTab] = useState<Tab>('overview');
  const [error,setError] = useState('');
  const [msg,setMsg] = useState('');
  const [busy,setBusy] = useState(false);

  const load = async()=>{
    setError('');
    try{
      const [dashboard,me] = await Promise.all([
        apiFetch<{data:CompensationDashboard}>(`/api/organizations/${activeOrgId()}/compensation/dashboard`),
        apiFetch<{actor:ActorContext}>('/api/me'),
      ]);
      setData(dashboard.data);
      setActor(me.actor);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to load Compensation Center.');
    }
  };

  useEffect(()=>{
    void load();
    const handleOrganizationChanged = () => void load();
    window.addEventListener('opsiqo:organization-changed',handleOrganizationChanged);
    return()=>window.removeEventListener('opsiqo:organization-changed',handleOrganizationChanged);
  },[]);

  async function call(path:string,init:RequestInit){
    setBusy(true);
    setError('');
    setMsg('');
    try{
      await apiFetch(path,init);
      setMsg('Compensation record saved successfully.');
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Compensation action failed.');
    }finally{
      setBusy(false);
    }
  }

  if(!data||!actor) return <div className="stack">{error&&<div className="error">{error}</div>}<LoadingState label="Loading governed compensation intelligence…"/></div>;

  const canManage = actor.permissions.includes('compensation.manage');
  const canApprove = actor.permissions.includes('compensation.approve');
  const canArchitecture = actor.permissions.includes('jobarchitecture.manage');
  const canPayEquity = actor.permissions.includes('payequity.review');
  const tabs:Tab[] = [
    'overview',
    'employees',
    ...(canManage?['market'] as Tab[]:[]),
    ...(canArchitecture?['architecture'] as Tab[]:[]),
    ...(canManage?['cycles','rewards'] as Tab[]:[]),
    ...((canApprove||data.compensationLetters.length)?['letters'] as Tab[]:[]),
    ...(canPayEquity?['payEquity'] as Tab[]:[]),
    ...(canManage?['transparency'] as Tab[]:[]),
  ];
  const labels:Record<Tab,string> = {
    overview:'Overview',employees:'Employees',market:'Market',architecture:'Architecture',cycles:'Cycles',rewards:'Total Rewards',letters:'Letters',payEquity:'Pay Equity',transparency:'Transparency',
  };

  return <div className="stack">
    {error&&<div className="error">{error}</div>}
    {msg&&<div className="success">{msg}</div>}

    <div className="learningHero">
      <div>
        <div className="eyebrow">Compensation Center · governed decision support</div>
        <h2>Pay architecture → market position → decisions → rewards</h2>
        <p>Use one controlled workspace for salary structures, employee positioning, market evidence, compensation cycles, total rewards, letters, pay-equity review and pay-transparency controls.</p>
      </div>
      <div className="performanceHeroScore"><span>Scope</span><strong>{data.scope}</strong><small>Updated {data.generatedAt.slice(0,10)}</small></div>
    </div>

    <div className="tabBar">
      {tabs.map(item=><button key={item} className={tab===item?'tab active':'tab'} onClick={()=>setTab(item)}>{labels[item]}</button>)}
    </div>

    {tab==='overview'&&<Overview data={data}/>}
    {tab==='employees'&&<Employees data={data} canApprove={canApprove} busy={busy} call={call}/>}
    {tab==='market'&&canManage&&<Market data={data} busy={busy} call={call}/>}
    {tab==='architecture'&&canArchitecture&&<Architecture data={data} busy={busy} call={call}/>}
    {tab==='cycles'&&canManage&&<Cycles data={data} actor={actor} canApprove={canApprove} busy={busy} call={call}/>}
    {tab==='rewards'&&canManage&&<Rewards data={data} busy={busy} call={call}/>}
    {tab==='letters'&&(canApprove||data.compensationLetters.length>0)&&<Letters data={data} canApprove={canApprove} busy={busy} call={call}/>}
    {tab==='payEquity'&&canPayEquity&&<PayEquity data={data} busy={busy} call={call}/>}
    {tab==='transparency'&&canManage&&<Transparency data={data} canApprove={canApprove} busy={busy} call={call}/>}

    <div className="notice">{data.legalDisclaimer}</div>
  </div>;
}

function Overview({data}:{data:CompensationDashboard}){
  const health = compensationHealth(data);
  const exceptions = health.rows.filter(row=>row.health.key!=='in_range').slice(0,10);
  const coverage = data.workers.length ? Math.round(data.workers.filter(w=>w.current).length/data.workers.length*100) : 0;
  const bandCoverage = data.workers.filter(w=>w.current).length ? Math.round(data.workers.filter(w=>w.current&&w.salaryBand).length/data.workers.filter(w=>w.current).length*100) : 0;
  const marketCoverage = data.workers.length ? Math.round(health.marketCoverage/data.workers.length*100) : 0;
  const rewardsCoverage = data.workers.length ? Math.round(health.rewardsCoverage/data.workers.length*100) : 0;

  return <div className="stack">
    <div className="grid4">{data.metrics.map(metric=><div className="card metricCard" key={metric.key}><div className="metricLabel">{metric.label}</div><div className="metricValue">{metric.value}</div><div className="metricFoot">{metric.helper}</div></div>)}</div>

    <div className="grid4">
      <div className="card metricCard"><div className="metricLabel">Pay record coverage</div><div className="metricValue">{coverage}%</div><div className="metricFoot">{health.missingPay} worker(s) missing current pay</div></div>
      <div className="card metricCard"><div className="metricLabel">Salary-band coverage</div><div className="metricValue">{bandCoverage}%</div><div className="metricFoot">{health.missingBand} paid worker(s) missing a band</div></div>
      <div className="card metricCard"><div className="metricLabel">Market coverage</div><div className="metricValue">{marketCoverage}%</div><div className="metricFoot">Workers with a mapped P50 benchmark</div></div>
      <div className="card metricCard"><div className="metricLabel">Total-rewards coverage</div><div className="metricValue">{rewardsCoverage}%</div><div className="metricFoot">Workers with configured employer-cost inputs</div></div>
    </div>

    <div className="grid2">
      <section className="card">
        <h2 className="sectionTitle">Compensation health queue</h2>
        {exceptions.map(({worker,health:item})=><div className="gapCard" key={worker.workerId}><div><strong>{worker.displayName}</strong><span>{worker.positionTitle||'No current position'} · {item.label}</span></div><b>{worker.compaRatioPct?`${worker.compaRatioPct}% CR`:'Review'}</b></div>)}
        {!exceptions.length&&<div className="success">No configured pay-position exceptions in the current scope.</div>}
      </section>
      <section className="card">
        <h2 className="sectionTitle">Range health</h2>
        <div className="rowBetween"><span>Below minimum</span><strong>{health.belowMin}</strong></div>
        <div className="rowBetween"><span>Above maximum</span><strong>{health.aboveMax}</strong></div>
        <div className="rowBetween"><span>Missing band</span><strong>{health.missingBand}</strong></div>
        <div className="rowBetween"><span>Missing pay</span><strong>{health.missingPay}</strong></div>
        <div className="rowBetween"><span>In configured range</span><strong>{health.inRange}</strong></div>
        <div className="rowBetween"><span>High pay-equity review indicators</span><strong>{health.highPayEquity}</strong></div>
      </section>
    </div>

    <section className="card">
      <h2 className="sectionTitle">Governance safeguards</h2>
      <div className="securityChecklist">
        <div>✓ Pay history is effective-dated; prior records are preserved</div>
        <div>✓ Organization switching re-loads tenant-scoped compensation data</div>
        <div>✓ Managers cannot approve their own compensation</div>
        <div>✓ Performance evidence informs but does not automatically determine pay</div>
        <div>✓ Cycle budgets are checked by the authoritative service before approval/application</div>
        <div>✓ Pay-equity indicators are screening evidence, not legal conclusions</div>
        <div>✓ Total rewards separates guaranteed base pay from target/estimated employer value</div>
      </div>
    </section>
  </div>;
}

function Employees({data,canApprove,busy,call}:{data:CompensationDashboard;canApprove:boolean;busy:boolean;call:Call}){
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('all');
  const [workerId,setWorkerId] = useState(data.workers[0]?.workerId||'');
  const [salary,setSalary] = useState(70000);
  const [reason,setReason] = useState('adjustment');
  const [note,setNote] = useState('Reviewed off-cycle compensation adjustment.');
  const selectedWorker = data.workers.find(worker=>worker.workerId===workerId);
  const selectedPayBasis = selectedWorker?.current?.payBasis || 'annual_salary';
  const selectedCurrency = selectedWorker?.current?.currency || 'CAD';

  const rows = useMemo(()=>data.workers.filter(worker=>{
    const text = clean(`${worker.displayName} ${worker.employeeNumber} ${worker.positionTitle||''} ${worker.salaryBand?.code||''}`);
    if (query.trim() && !text.includes(clean(query))) return false;
    const health = workerHealth(worker);
    return filter==='all' || health.key===filter || (filter==='outside_band' && ['below_min','above_max'].includes(health.key));
  }),[data.workers,query,filter]);

  return <div className="stack">
    <section className="card">
      <div className="rowBetween">
        <div><h2 className="sectionTitle">Employee compensation positioning</h2><p className="muted">Search and filter the current tenant-scoped population. Export contains only the records already authorized in your current scope.</p></div>
        <button className="button secondary" onClick={()=>downloadCompensationCsv(data,rows)}>Export visible CSV</button>
      </div>
      <div className="learningForm">
        <input className="input" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search employee, position, band…"/>
        <select className="input" value={filter} onChange={event=>setFilter(event.target.value)}>
          <option value="all">All compensation records</option>
          <option value="outside_band">Outside salary band</option>
          <option value="missing_band">Missing salary band</option>
          <option value="missing_pay">Missing pay record</option>
          <option value="position_review">Positioning review</option>
          <option value="in_range">In configured range</option>
        </select>
      </div>
    </section>

    <section className="card tableWrap">
      <table><thead><tr><th>Employee</th><th>Position</th><th>Base</th><th>Band</th><th>Compa-ratio</th><th>Range penetration</th><th>Market P50</th><th>Health</th></tr></thead>
      <tbody>{rows.map(worker=>{const health=workerHealth(worker);return <tr key={worker.workerId}><td><strong>{worker.displayName}</strong><div className="muted">#{worker.employeeNumber}</div></td><td>{worker.positionTitle||'—'}</td><td>{cad(worker.current?.annualizedBasePay,worker.current?.currency)}</td><td>{worker.salaryBand?`${worker.salaryBand.code} · ${cad(worker.salaryBand.min,worker.salaryBand.currency)} – ${cad(worker.salaryBand.max,worker.salaryBand.currency)}`:'—'}</td><td>{typeof worker.compaRatioPct==='number'?`${worker.compaRatioPct}%`:'—'}</td><td>{typeof worker.rangePenetrationPct==='number'?`${worker.rangePenetrationPct}%`:'—'}</td><td>{typeof worker.marketPositionPct==='number'?`${worker.marketPositionPct}%`:'—'}</td><td><span className="badge">{health.label}</span></td></tr>})}</tbody></table>
      {!rows.length&&<div className="notice">No employees match the current compensation filter.</div>}
    </section>

    {canApprove&&<section className="card">
      <h2 className="sectionTitle">Controlled off-cycle adjustment</h2>
      <p className="muted">Use only for reviewed corrections, market/equity adjustments or controlled migration. Normal increases should use a compensation cycle.</p>
      <div className="learningForm">
        <select className="input" value={workerId} onChange={event=>setWorkerId(event.target.value)}>{data.workers.map(worker=><option key={worker.workerId} value={worker.workerId}>{worker.displayName}</option>)}</select>
        <label>Annualized base pay ({selectedCurrency})<input className="input" type="number" value={salary} onChange={event=>setSalary(Number(event.target.value))}/></label>
        <select className="input" value={reason} onChange={event=>setReason(event.target.value)}><option value="adjustment">Adjustment</option><option value="market">Market</option><option value="equity">Equity</option><option value="promotion">Promotion</option><option value="demotion">Demotion</option><option value="other">Other</option></select>
        <input className="input" value={note} onChange={event=>setNote(event.target.value)} placeholder="Reviewed rationale"/>
        <button className="button" disabled={busy||!workerId||salary<0||note.trim().length<3} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/records`,{method:'POST',body:JSON.stringify({workerId,effectiveDate:today(),currency:selectedCurrency,payBasis:selectedPayBasis,basePay:selectedPayBasis==='hourly'?Math.round((salary/2080)*100)/100:salary,annualizedBasePay:salary,variableTargetPct:selectedWorker?.current?.variableTargetPct||0,allowancesAnnual:selectedWorker?.current?.allowancesAnnual||0,changeReason:reason,note})})}>Apply reviewed record</button>
      </div>
    </section>}
  </div>;
}

function Market({data,busy,call}:{data:CompensationDashboard;busy:boolean;call:Call}){
  const [code,setCode]=useState('MKT-P50');
  const [title,setTitle]=useState('Market benchmark');
  const [source,setSource]=useState('Reviewed market source');
  const [sourceDate,setSourceDate]=useState(today());
  const [location,setLocation]=useState('Ontario, Canada');
  const [p25,setP25]=useState(65000);
  const [p50,setP50]=useState(80000);
  const [p75,setP75]=useState(95000);
  const [p90,setP90]=useState(110000);

  return <div className="stack">
    <section className="card">
      <h2 className="sectionTitle">Add reviewed market benchmark</h2>
      <p className="muted">Record source and source date so market positioning remains traceable. OPSIQO does not treat market data as an automatic pay decision.</p>
      <div className="learningForm">
        <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="Benchmark code"/>
        <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Benchmark title"/>
        <input className="input" value={source} onChange={e=>setSource(e.target.value)} placeholder="Source"/>
        <input className="input" type="date" value={sourceDate} onChange={e=>setSourceDate(e.target.value)}/>
        <input className="input" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location"/>
        <div className="row"><input className="input" type="number" value={p25} onChange={e=>setP25(Number(e.target.value))} placeholder="P25"/><input className="input" type="number" value={p50} onChange={e=>setP50(Number(e.target.value))} placeholder="P50"/><input className="input" type="number" value={p75} onChange={e=>setP75(Number(e.target.value))} placeholder="P75"/><input className="input" type="number" value={p90} onChange={e=>setP90(Number(e.target.value))} placeholder="P90"/></div>
        <button className="button" disabled={busy||!code.trim()||!title.trim()||!source.trim()} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/benchmarks`,{method:'POST',body:JSON.stringify({code,title,source,sourceDate,currency:'CAD',location,p25,p50,p75,p90,note:'Reviewed market benchmark entered through Compensation Center.'})})}>Save benchmark</button>
      </div>
    </section>

    <section className="card tableWrap">
      <h2 className="sectionTitle">Market benchmark library</h2>
      <table><thead><tr><th>Code</th><th>Title</th><th>Source</th><th>Date</th><th>Location</th><th>P25</th><th>P50</th><th>P75</th><th>P90</th></tr></thead><tbody>{data.benchmarks.map(row=><tr key={row.id}><td><strong>{row.code}</strong></td><td>{row.title}</td><td>{row.source}</td><td>{row.sourceDate}</td><td>{row.location||'—'}</td><td>{cad(row.p25,row.currency)}</td><td>{cad(row.p50,row.currency)}</td><td>{cad(row.p75,row.currency)}</td><td>{cad(row.p90,row.currency)}</td></tr>)}</tbody></table>
      {!data.benchmarks.length&&<div className="notice">No market benchmarks have been recorded for this organization.</div>}
    </section>
  </div>;
}

function Architecture({data,busy,call}:{data:CompensationDashboard;busy:boolean;call:Call}){
  const [family,setFamily]=useState('People & Culture');
  const [level,setLevel]=useState('Manager');
  const [band,setBand]=useState('M1');
  const [min,setMin]=useState(70000);
  const [mid,setMid]=useState(85000);
  const [max,setMax]=useState(100000);
  const [position,setPosition]=useState(data.positionDirectory[0]?.id||'');
  const [bandId,setBandId]=useState(data.salaryBands[0]?.id||'');
  const [benchmarkId,setBenchmarkId]=useState(data.benchmarks[0]?.id||'');

  return <div className="stack">
    <div className="grid3">
      <section className="card"><h2 className="sectionTitle">Job family</h2><input className="input" value={family} onChange={e=>setFamily(e.target.value)}/><button className="button" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/job-families`,{method:'POST',body:JSON.stringify({code:family.replace(/\W/g,'').slice(0,12).toUpperCase(),name:family,status:'active'})})}>Create family</button></section>
      <section className="card"><h2 className="sectionTitle">Job level</h2><input className="input" value={level} onChange={e=>setLevel(e.target.value)}/><button className="button" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/job-levels`,{method:'POST',body:JSON.stringify({code:level.replace(/\W/g,'').slice(0,10).toUpperCase(),name:level,rank:data.jobLevels.length+1,status:'active'})})}>Create level</button></section>
      <section className="card"><h2 className="sectionTitle">Salary band</h2><input className="input" value={band} onChange={e=>setBand(e.target.value)}/><div className="row"><input className="input" type="number" value={min} onChange={e=>setMin(Number(e.target.value))}/><input className="input" type="number" value={mid} onChange={e=>setMid(Number(e.target.value))}/><input className="input" type="number" value={max} onChange={e=>setMax(Number(e.target.value))}/></div><button className="button" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/salary-bands`,{method:'POST',body:JSON.stringify({code:band,name:`${band} Salary Band`,currency:'CAD',payBasis:'annual_salary',min,midpoint:mid,max,effectiveDate:today(),status:'active'})})}>Create band</button></section>
    </div>

    <section className="card tableWrap"><h2 className="sectionTitle">Salary bands</h2><table><thead><tr><th>Code</th><th>Name</th><th>Min</th><th>Mid</th><th>Max</th><th>Spread</th><th>Effective</th></tr></thead><tbody>{data.salaryBands.map(row=><tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{cad(row.min,row.currency)}</td><td>{cad(row.midpoint,row.currency)}</td><td>{cad(row.max,row.currency)}</td><td>{row.min>0?`${Math.round((row.max-row.min)/row.min*100)}%`:'—'}</td><td>{row.effectiveDate}</td></tr>)}</tbody></table></section>

    <section className="card">
      <h2 className="sectionTitle">Map position to salary band and market benchmark</h2>
      <div className="learningForm">
        <select className="input" value={position} onChange={e=>setPosition(e.target.value)}>{data.positionDirectory.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select>
        <select className="input" value={bandId} onChange={e=>setBandId(e.target.value)}><option value="">No salary band</option>{data.salaryBands.map(row=><option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select>
        <select className="input" value={benchmarkId} onChange={e=>setBenchmarkId(e.target.value)}><option value="">No market benchmark</option>{data.benchmarks.map(row=><option key={row.id} value={row.id}>{row.code} · {row.title}</option>)}</select>
        <button className="button" disabled={busy||!position} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/position-profiles`,{method:'POST',body:JSON.stringify({positionId:position,...(bandId?{salaryBandId:bandId}:{}),...(benchmarkId?{marketBenchmarkId:benchmarkId}:{})})})}>Save position mapping</button>
      </div>
    </section>
  </div>;
}

function Cycles({data,actor,canApprove,busy,call}:{data:CompensationDashboard;actor:ActorContext;canApprove:boolean;busy:boolean;call:Call}){
  const nextYear = new Date().getFullYear()+1;
  const [name,setName]=useState(`${nextYear} Annual Compensation Review`);
  const [cycleYear,setCycleYear]=useState(nextYear);
  const [effectiveDate,setEffectiveDate]=useState(`${nextYear}-01-01`);
  const [budget,setBudget]=useState(3);
  const [worker,setWorker]=useState(data.workerDirectory.find(row=>row.id!==actor.workerId)?.id||'');
  const [cycle,setCycle]=useState(data.cycles.find(row=>['open','manager_review','hr_review'].includes(row.status))?.id||'');
  const [increase,setIncrease]=useState(3);
  const [type,setType]=useState('merit');
  const [rationale,setRationale]=useState('Reviewed recommendation based on documented contribution, internal positioning, approved budget and compensation policy.');

  return <div className="stack">
    <div className="grid2">
      <section className="card">
        <h2 className="sectionTitle">Create compensation cycle</h2>
        <div className="stack">
          <input className="input" value={name} onChange={e=>setName(e.target.value)}/>
          <div className="row"><label>Cycle year<input className="input" type="number" value={cycleYear} onChange={e=>setCycleYear(Number(e.target.value))}/></label><label>Effective date<input className="input" type="date" value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}/></label><label>Budget %<input className="input" type="number" step="0.1" value={budget} onChange={e=>setBudget(Number(e.target.value))}/></label></div>
          <button className="button" disabled={busy||!name.trim()} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/cycles`,{method:'POST',body:JSON.stringify({name,cycleYear,effectiveDate,currency:'CAD',budgetPct:budget,eligibilityNote:'Eligibility subject to approved compensation policy and documented exceptions.'})})}>Create draft cycle</button>
        </div>
      </section>
      <section className="card">
        <h2 className="sectionTitle">Create recommendation</h2>
        <div className="stack">
          <select className="input" value={cycle} onChange={e=>setCycle(e.target.value)}>{data.cycles.filter(row=>['open','manager_review','hr_review'].includes(row.status)).map(row=><option key={row.id} value={row.id}>{row.name} · {row.status}</option>)}</select>
          <select className="input" value={worker} onChange={e=>setWorker(e.target.value)}>{data.workerDirectory.filter(row=>row.id!==actor.workerId).map(row=><option key={row.id} value={row.id}>{row.displayName}</option>)}</select>
          <select className="input" value={type} onChange={e=>setType(e.target.value)}><option value="merit">Merit</option><option value="promotion">Promotion</option><option value="market">Market</option><option value="equity">Equity</option><option value="lump_sum">Lump sum</option><option value="other">Other</option></select>
          <label>Increase %<input className="input" type="number" step="0.1" value={increase} onChange={e=>setIncrease(Number(e.target.value))}/></label>
          <input className="input" value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="Documented rationale"/>
          <button className="button" disabled={busy||!cycle||!worker||rationale.trim().length<10} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/recommendations`,{method:'POST',body:JSON.stringify({cycleId:cycle,workerId:worker,type,proposedIncreasePct:increase,lumpSumAmount:0,rationale,evidenceRefs:['performance evidence','salary band position','market/internal equity review']})})}>Save recommendation</button>
        </div>
      </section>
    </div>

    <section className="card tableWrap">
      <h2 className="sectionTitle">Cycle control board</h2>
      <table><thead><tr><th>Cycle</th><th>Status</th><th>Effective</th><th>Budget</th><th>Committed</th><th>Utilization</th><th>Actions</th></tr></thead><tbody>{data.cycles.map(row=>{const snap=cycleBudgetSnapshot(data,row);return <tr key={row.id}><td><strong>{row.name}</strong></td><td><span className="badge">{row.status}</span></td><td>{row.effectiveDate}</td><td>{typeof snap.limit==='number'?cad(snap.limit,row.currency):row.budgetPct?`${row.budgetPct}%`:'—'}</td><td>{cad(snap.committed,row.currency)}</td><td>{typeof snap.utilization==='number'?`${snap.utilization}%`:'—'}</td><td><div className="row">
        {row.status==='draft'&&<button className="button compact" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/cycles/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'open'})})}>Open</button>}
        {['open','manager_review'].includes(row.status)&&<button className="button compact" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/cycles/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'send_to_hr'})})}>HR review</button>}
        {canApprove&&row.status==='hr_review'&&<button className="button compact" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/cycles/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'approve',decisionNote:'Reviewed against recommendation status, budget and compensation governance controls.'})})}>Approve</button>}
        {canApprove&&row.status==='approved'&&<button className="button compact" disabled={busy||row.effectiveDate>today()} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/cycles/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'apply'})})}>Apply</button>}
        {canApprove&&row.status==='applied'&&<button className="button compact" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/cycles/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'close'})})}>Close</button>}
        {canApprove&&!['applied','closed','cancelled'].includes(row.status)&&<button className="button compact secondary" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/cycles/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'cancel',decisionNote:'Cycle cancelled through Compensation Center.'})})}>Cancel</button>}
      </div></td></tr>})}</tbody></table>
    </section>

    <section className="card tableWrap">
      <h2 className="sectionTitle">Recommendation decision queue</h2>
      <table><thead><tr><th>Employee</th><th>Cycle</th><th>Type</th><th>Current</th><th>Increase</th><th>Proposed</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.recommendations.map(row=>{const cycleRow=data.cycles.find(item=>item.id===row.cycleId);return <tr key={row.id}><td>{employeeName(data,row.workerId)}</td><td>{cycleRow?.name||row.cycleId}</td><td>{row.type.replaceAll('_',' ')}</td><td>{cad(row.currentBasePay,row.currency)}</td><td>{row.proposedIncreasePct}% · {cad(row.proposedIncreaseAmount,row.currency)}</td><td>{cad(row.proposedBasePay,row.currency)}</td><td><span className="badge">{row.status}</span></td><td><div className="row">
        {row.status==='draft'&&<button className="button compact" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/recommendations/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'submit'})})}>Submit</button>}
        {canApprove&&['submitted','hr_review'].includes(row.status)&&<><button className="button compact" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/recommendations/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'approve',decisionNote:'Reviewed against budget, salary structure, internal equity and supporting evidence.'})})}>Approve</button><button className="button compact secondary" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/recommendations/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'reject',decisionNote:'Recommendation requires revision or is not approved.'})})}>Reject</button></>}
        {canApprove&&row.status==='approved'&&<button className="button compact" disabled={busy||Boolean(cycleRow&&cycleRow.effectiveDate>today())} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/recommendations/${row.id}`,{method:'PATCH',body:JSON.stringify({action:'apply'})})}>Apply</button>}
        {!['draft','submitted','hr_review','approved'].includes(row.status)&&'—'}
      </div></td></tr>})}</tbody></table>
    </section>
  </div>;
}

function Rewards({data,busy,call}:{data:CompensationDashboard;busy:boolean;call:Call}){
  const [workerId,setWorkerId]=useState(data.workers[0]?.workerId||'');
  const [benefits,setBenefits]=useState(8000);
  const [retirement,setRetirement]=useState(4000);
  const [other,setOther]=useState(0);
  const row=data.workers.find(worker=>worker.workerId===workerId);
  return <div className="grid2">
    <section className="card"><h2 className="sectionTitle">Total rewards inputs</h2><select className="input" value={workerId} onChange={e=>setWorkerId(e.target.value)}>{data.workers.map(worker=><option key={worker.workerId} value={worker.workerId}>{worker.displayName}</option>)}</select><label>Employer benefits value<input className="input" type="number" value={benefits} onChange={e=>setBenefits(Number(e.target.value))}/></label><label>Employer retirement value<input className="input" type="number" value={retirement} onChange={e=>setRetirement(Number(e.target.value))}/></label><label>Other employer rewards<input className="input" type="number" value={other} onChange={e=>setOther(Number(e.target.value))}/></label><button className="button" disabled={busy||!workerId} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/total-rewards`,{method:'POST',body:JSON.stringify({workerId,asOfDate:today(),employerBenefitsValue:benefits,employerRetirementValue:retirement,otherRewardsValue:other})})}>Save inputs</button></section>
    <section className="card"><h2 className="sectionTitle">Statement preview</h2>{row?.totalRewards?<><div className="qualityScore">{cad(row.totalRewards.totalRewardsValue,row.totalRewards.currency)}</div>{row.totalRewards.components.map(component=><div className="rowBetween" key={component.label}><span>{component.label}</span><strong>{cad(component.value,row.totalRewards!.currency)}</strong></div>)}<p className="muted">{row.totalRewards.disclaimer}</p></>:<p className="muted">Current compensation is required before a statement can be calculated.</p>}</section>
  </div>;
}

function Letters({data,canApprove,busy,call}:{data:CompensationDashboard;canApprove:boolean;busy:boolean;call:Call}){
  return <section className="card tableWrap">
    <h2 className="sectionTitle">Compensation letters</h2>
    <p className="muted">Letters are generated from applied recommendations. Release remains an explicit HR approval action.</p>
    <table><thead><tr><th>Employee</th><th>Effective</th><th>Previous</th><th>New base</th><th>Increase</th><th>Lump sum</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.compensationLetters.map(letter=><tr key={letter.id}><td>{employeeName(data,letter.workerId)}</td><td>{letter.effectiveDate}</td><td>{cad(letter.previousBasePay,letter.currency)}</td><td>{cad(letter.newBasePay,letter.currency)}</td><td>{letter.increasePct}% · {cad(letter.increaseAmount,letter.currency)}</td><td>{cad(letter.lumpSumAmount,letter.currency)}</td><td><span className="badge">{letter.status}</span></td><td>{canApprove&&letter.status==='ready'?<button className="button compact" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/letters/${letter.id}`,{method:'PATCH',body:JSON.stringify({action:'release'})})}>Release</button>:'—'}</td></tr>)}</tbody></table>
    {!data.compensationLetters.length&&<div className="notice">No compensation letters are available in the current scope.</div>}
  </section>;
}

function PayEquity({data,busy,call}:{data:CompensationDashboard;busy:boolean;call:Call}){
  const [code,setCode]=useState('HRCOORD');
  const [name,setName]=useState('HR Coordinator');
  const [gender,setGender]=useState<'female'|'male'|'neutral'|'unknown'>('female');
  const [rate,setRate]=useState(65000);
  const [skill,setSkill]=useState(25);
  const [effort,setEffort]=useState(20);
  const [responsibility,setResponsibility]=useState(25);
  const [conditions,setConditions]=useState(10);
  return <div className="stack">
    <section className="card"><h2 className="sectionTitle">Pay-equity job-class evidence</h2><p className="muted">Record job-class predominance and gender-neutral job-value evidence. Individual employee sex/gender is not used to infer job-class predominance.</p><div className="learningForm"><input className="input" value={code} onChange={e=>setCode(e.target.value)}/><input className="input" value={name} onChange={e=>setName(e.target.value)}/><select className="input" value={gender} onChange={e=>setGender(e.target.value as typeof gender)}><option value="female">Female job class</option><option value="male">Male job class</option><option value="neutral">Gender neutral</option><option value="unknown">Not determined</option></select><input className="input" type="number" value={rate} onChange={e=>setRate(Number(e.target.value))}/><div className="row"><input className="input" type="number" value={skill} onChange={e=>setSkill(Number(e.target.value))}/><input className="input" type="number" value={effort} onChange={e=>setEffort(Number(e.target.value))}/><input className="input" type="number" value={responsibility} onChange={e=>setResponsibility(Number(e.target.value))}/><input className="input" type="number" value={conditions} onChange={e=>setConditions(Number(e.target.value))}/></div><button className="button" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/pay-equity/job-classes`,{method:'POST',body:JSON.stringify({code,name,establishmentId:'main',genderPredominance:gender,jobRate:rate,currency:'CAD',skillPoints:skill,effortPoints:effort,responsibilityPoints:responsibility,workingConditionsPoints:conditions,comparatorMethod:'not_assessed',comparatorJobClassIds:[],reviewStatus:'review_required',legalBasisNote:'Job-class classification and comparison require qualified Pay Equity Act review.'})})}>Save job class</button></div></section>
    <section className="card tableWrap"><h2 className="sectionTitle">Job classes</h2><table><thead><tr><th>Class</th><th>Predominance</th><th>Job rate</th><th>Value points</th><th>Method</th><th>Status</th></tr></thead><tbody>{data.payEquityJobClasses.map(row=><tr key={row.id}><td>{row.code} · {row.name}</td><td>{row.genderPredominance}</td><td>{cad(row.jobRate,row.currency)}</td><td>{row.totalValuePoints}</td><td>{row.comparatorMethod.replaceAll('_',' ')}</td><td>{row.reviewStatus.replaceAll('_',' ')}</td></tr>)}</tbody></table></section>
    <section className="card"><h2 className="sectionTitle">Review indicators</h2>{data.payEquityDiagnostics.map(item=><div className={`alertCard ${item.severity}`} key={item.id}><div><span className="badge">{item.severity}</span><strong>{item.title}</strong></div><p>{item.description}</p><p className="muted">{item.recommendedAction}</p></div>)}{!data.payEquityDiagnostics.length&&<div className="success">No configured screening flags in the current evidence set.</div>}</section>
  </div>;
}

function Transparency({data,canApprove,busy,call}:{data:CompensationDashboard;canApprove:boolean;busy:boolean;call:Call}){
  const reqs=data.requisitionDisclosures;
  const [min,setMin]=useState(60000);
  const [max,setMax]=useState(90000);
  const [req,setReq]=useState(reqs[0]?.requisitionId||'');
  const policy=data.payTransparencyPolicy;
  return <div className="stack">
    <section className="card"><h2 className="sectionTitle">Configured reference policy</h2><div className="grid4"><div><span className="muted">Jurisdiction</span><strong>{policy.jurisdiction}</strong></div><div><span className="muted">Employee threshold</span><strong>{policy.employerEmployeeThreshold}</strong></div><div><span className="muted">Range spread reference</span><strong>{cad(policy.rangeMaxSpreadAnnual)}</strong></div><div><span className="muted">Exception above</span><strong>{cad(policy.exceptionAboveAnnual)}</strong></div></div>{canApprove&&<button className="button secondary" disabled={busy} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/pay-transparency/policy`,{method:'POST',body:JSON.stringify(policy)})}>Re-save reviewed policy</button>}</section>
    <section className="card"><h2 className="sectionTitle">Requisition compensation disclosure</h2><p className="muted">Enter an existing requisition ID from Recruiting. Validation is a configured compliance check, not a legal opinion.</p><div className="learningForm"><input className="input" placeholder="Requisition ID" value={req} onChange={e=>setReq(e.target.value)}/><div className="row"><input className="input" type="number" value={min} onChange={e=>setMin(Number(e.target.value))}/><input className="input" type="number" value={max} onChange={e=>setMax(Number(e.target.value))}/></div><button className="button" disabled={busy||!req} onClick={()=>call(`/api/organizations/${activeOrgId()}/compensation/requisition-disclosures`,{method:'POST',body:JSON.stringify({requisitionId:req,publiclyAdvertised:true,currency:'CAD',expectedMin:min,expectedMax:max,annualized:true,vacancyExists:'yes',aiUsedInScreening:false})})}>Validate & save disclosure</button></div></section>
    <section className="card tableWrap"><table><thead><tr><th>Requisition</th><th>Range</th><th>Vacancy</th><th>AI</th><th>Status</th><th>Review notes</th></tr></thead><tbody>{reqs.map(row=><tr key={row.id}><td>{row.requisitionId}</td><td>{cad(row.expectedMin,row.currency)} – {cad(row.expectedMax,row.currency)}</td><td>{row.vacancyExists}</td><td>{row.aiUsedInScreening?'used':'not used'}</td><td><span className="badge">{row.validatedStatus.replaceAll('_',' ')}</span></td><td>{row.validationNotes.join('; ')||'No configured flags'}</td></tr>)}</tbody></table></section>
  </div>;
}
