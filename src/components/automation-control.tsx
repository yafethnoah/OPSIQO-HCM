'use client';
import { useEffect, useRef, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { AUTOMATION_CATALOG } from '@/lib/automation/catalog';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';

type Lane={lane:string;category:string;status:'completed'|'failed'|'skipped';durationMs:number;details?:Record<string,unknown>;error?:string};
type Coverage={automatedLanes:number;automatedCapabilities?:number;completedLanes:number;failedLanes:number;humanApprovalBoundaries:number};
type Summary={
  coverage?:Coverage;lanes?:Lane[];
  scheduledChanges?:{scanned:number;applied:number;failed:number;skipped:number};
  domainEvents?:{scanned:number;processed:number;failed:number;workflowRunsStarted:number;deduplicated:number};
  workflowSla?:{scanned:number;overdue:number;escalated:number;unchanged:number};
  invitationGovernance?:{scanned:number;expired:number;expiringSoon:number;tokenIndexesDeleted:number;notifications:number};
  lifecycleDiagnostics?:{score:number;critical:number;high:number;warning:number;sampled:boolean};
  notificationDelivery?:{scanned:number;sent:number;failed:number;skipped:number};
};
type Run={id:string;runId?:string;status:string;startedAt:string;completedAt?:string;initiatedBy?:string;lastError?:string;summary?:Summary};

const automated=AUTOMATION_CATALOG.filter(x=>x.boundary==='automatic'||x.boundary==='automatic_after_approval');
const governed=AUTOMATION_CATALOG.filter(x=>x.boundary==='human_required'||x.boundary==='opt_in_assist');
const boundaryLabel=(value:string)=>value==='automatic'?'Automatic':value==='automatic_after_approval'?'Automatic after approval':value==='opt_in_assist'?'Governed opt-in assistance':'Human decision required';
const detailText=(details?:Record<string,unknown>)=>details?Object.entries(details).filter(([,v])=>['string','number','boolean'].includes(typeof v)).slice(0,6).map(([k,v])=>`${k.replaceAll('_',' ')}: ${String(v)}`).join(' · '):'Completed';

export function AutomationControl(){
 const translationRoot=useRef<HTMLDivElement>(null);useLegacySurfaceTranslation('automation_control',translationRoot);
 const[runs,setRuns]=useState<Run[]>([]);const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[msg,setMsg]=useState('');
 const load=async()=>{try{const r=await apiFetch<{data:Run[]}>(`/api/organizations/${activeOrgId()}/automation`);setRuns(r.data);setError('')}catch(e){setError(e instanceof Error?e.message:'Unable to load automation runs.')}};
 useEffect(()=>{void load();},[]);
 async function run(){setBusy(true);setError('');setMsg('');try{const r=await apiFetch<{data:Summary}>(`/api/organizations/${activeOrgId()}/automation`,{method:'POST'});const failed=r.data.coverage?.failedLanes||0;setMsg(failed?`Automation cycle completed with ${failed} isolated lane failure(s); unaffected lanes continued.`:'Automation cycle completed successfully.');await load()}catch(e){setError(e instanceof Error?e.message:'Automation run failed.')}finally{setBusy(false)}}
 const latest=runs[0],lanes=latest?.summary?.lanes||[],coverage=latest?.summary?.coverage;
 return <div ref={translationRoot} className="stack">
  {error&&<div className="error" role="alert">{error}</div>}{msg&&<div className="success" role="status">{msg}</div>}
  <div className="grid2">
   <section className="card stack"><h2 className="sectionTitle">Automation control plane</h2><p className="muted">OPSIQO now runs the safe administrative, monitoring, reminder, event, workflow, integration and governance work automatically. One lane failing no longer stops unrelated automation lanes.</p><button className="button" disabled={busy} onClick={run}>{busy?'Running controlled automation…':'Run full automation cycle now'}</button><div className="securityGate"><strong>Production scheduler</strong><div className="muted">Schedule the secret-protected <code data-opsiqo-no-translate="true">/api/internal/automation</code> endpoint from Cloud Scheduler or another trusted scheduler. A 30–60 minute cadence is appropriate because every lane is due-date/idempotency governed.</div></div></section>
   <section className="card stack"><h2 className="sectionTitle">Automation coverage</h2><div className="settingsGrid"><Val label="Automated capabilities" value={String(coverage?.automatedCapabilities??automated.length)}/><Val label="Automation lanes" value={coverage?String(coverage.automatedLanes):'Not run yet'}/><Val label="Last-cycle lanes completed" value={coverage?String(coverage.completedLanes):'Not run yet'}/><Val label="Last-cycle lane failures" value={coverage?String(coverage.failedLanes):'Not run yet'}/><Val label="Human approval boundaries" value={String(coverage?.humanApprovalBoundaries??governed.length)}/></div><div className="notice">Automation executes approved/configured administrative work and evidence monitoring. It does not decide hiring, termination, discipline, promotion/demotion, individual pay, successor selection, privileged access grants or policy/legal conclusions.</div></section>
  </div>

  <section className="card stack"><h2 className="sectionTitle">Automated capabilities</h2><div className="settingsLinkGrid">{automated.map(item=><div className="settingsLink" key={item.id}><div className="row wrap"><strong>{item.label}</strong><span className="badge">{boundaryLabel(item.boundary)}</span></div><div className="muted">{item.description}</div></div>)}</div></section>

  <section className="card stack"><h2 className="sectionTitle">Human-governed boundaries</h2><div className="settingsLinkGrid">{governed.map(item=><div className="settingsLink" key={item.id}><div className="row wrap"><strong>{item.label}</strong><span className="badge">{boundaryLabel(item.boundary)}</span></div><div className="muted">{item.description}</div></div>)}</div></section>

  <section className="card tableWrap"><h2 className="sectionTitle">Latest automation lane execution</h2><table><thead><tr><th>Lane</th><th>Category</th><th>Status</th><th>Duration</th><th>Result</th></tr></thead><tbody>{lanes.map(l=><tr key={l.lane}><td><strong>{l.lane.replaceAll('_',' ')}</strong></td><td>{l.category}</td><td><span className="badge">{l.status}</span></td><td>{l.durationMs} ms</td><td>{l.error?<span className="error">{l.error}</span>:<span className="muted">{detailText(l.details)}</span>}</td></tr>)}{!lanes.length&&<tr><td colSpan={5} className="muted">Run the automation cycle to see lane-level execution evidence.</td></tr>}</tbody></table></section>

  <section className="card tableWrap"><h2 className="sectionTitle">Recent automation runs</h2><table><thead><tr><th>Started</th><th>Status</th><th>Initiator</th><th>Coverage</th><th>Invitations</th><th>Events / workflows</th><th>SLA</th><th>Diagnostics</th><th>Notifications</th></tr></thead><tbody>{runs.map((r,i)=>{const s=r.summary;return <tr key={r.id||r.runId||i}><td>{new Date(r.startedAt).toLocaleString()}</td><td><span className="badge">{r.status}</span>{r.lastError&&<div className="error">{r.lastError}</div>}</td><td>{r.initiatedBy||'system'}</td><td>{s?.coverage?`${s.coverage.completedLanes} completed · ${s.coverage.failedLanes} failed`:'—'}</td><td>{s?.invitationGovernance?`${s.invitationGovernance.expired} expired · ${s.invitationGovernance.expiringSoon} expiring`:'—'}</td><td>{s?.domainEvents?`${s.domainEvents.processed} events · ${s.domainEvents.workflowRunsStarted} workflows`:'—'}</td><td>{s?.workflowSla?`${s.workflowSla.overdue} overdue · ${s.workflowSla.escalated} escalated`:'—'}</td><td>{s?.lifecycleDiagnostics?(s.lifecycleDiagnostics.score>=0?`${s.lifecycleDiagnostics.score}/100 · ${s.lifecycleDiagnostics.critical} critical`:'Unavailable'):'—'}</td><td>{s?.notificationDelivery?`${s.notificationDelivery.sent} sent · ${s.notificationDelivery.failed} failed`:'—'}</td></tr>})}{!runs.length&&<tr><td colSpan={9} className="muted">No automation runs recorded.</td></tr>}</tbody></table></section>
 </div>
}
function Val({label,value}:{label:string;value:string}){return <div><span className="muted">{label}</span><strong>{value}</strong></div>}
