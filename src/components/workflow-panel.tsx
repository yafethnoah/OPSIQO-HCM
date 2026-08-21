'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { GovernedGantt, type GovernedGanttTask, type GovernedGanttStatus } from '@/components/governed-gantt';
import { WORKFLOW_TRIGGER_OPTIONS } from '@/domain/workflow';

type WorkflowCondition={field:string;operator:string;value?:string|number|boolean|string[]};
type Workflow = { id: string; name: string; description?: string; trigger: string; conditions?:WorkflowCondition[]; conditionMode?:'all'|'any'; enabled: boolean; version: number; steps: {id:string; name:string; type:string}[] };
type StepRun = { id:string;workflowStepId:string;name:string;type:string;ownerRole?:string;status:string;outcome?:string;dueAt?:string;escalateAt?:string;escalationOwnerRole?:string;slaStatus?:string;escalationCount?:number;dependsOn:string[] };
type Run = {id:string;workflowId:string;workflowName?:string;status:string;progress:number;completedSteps:number;totalSteps:number;startedAt:string;sourceEventId?:string;steps:StepRun[]};

export function WorkflowPanel() {
  const translationRoot=useRef<HTMLDivElement>(null);useLegacySurfaceTranslation('workflows',translationRoot);
  const [data, setData] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState('');
  const [started, setStarted] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedRunId,setSelectedRunId]=useState('');
  const [template,setTemplate]=useState<'review_approval_notify'|'manager_approval_notify'|'notification_only'>('review_approval_notify');

  const load = async () => {
    try {
      const orgId = activeOrgId();
      const [workflows, workflowRuns] = await Promise.all([
        apiFetch<{data:Workflow[]}>(`/api/organizations/${orgId}/workflows`),
        apiFetch<{data:Run[]}>(`/api/organizations/${orgId}/workflow-runs?limit=20`),
      ]);
      setData(workflows.data);
      setRuns(workflowRuns.data);
      setSelectedRunId(current=>current&&workflowRuns.data.some(r=>r.id===current)?current:(workflowRuns.data[0]?.id||''));
      setError('');
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Unable to load workflows.');
    }
  };

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creating) return;

    // Capture the form reference before awaiting. React's event currentTarget can
    // no longer be safely relied on after asynchronous work completes.
    const form = e.currentTarget;
    const f = new FormData(form);
    const orgId = activeOrgId();

    setError('');
    setStarted('');
    setCreating(true);

    try {
      const conditionField=String(f.get('conditionField')||'').trim();
      const conditionOperator=String(f.get('conditionOperator')||'eq');
      const rawConditionValue=String(f.get('conditionValue')||'').trim();
      const conditions=conditionField?[{field:conditionField,operator:conditionOperator,value:conditionOperator==='exists'?undefined:rawConditionValue}]:[];
      const templates={
        review_approval_notify:[
          { id:'review', name:'HR review', type:'task', ownerRole:'hr_admin', dueInDays:2, escalationOwnerRole:'org_admin', escalateAfterHours:4, dependsOn:[] },
          { id:'approve', name:'Manager approval', type:'approval', ownerRole:'manager', dueInDays:3, escalationOwnerRole:'hr_admin', escalateAfterHours:4, dependsOn:['review'] },
          { id:'close', name:'Close and notify', type:'notification', ownerRole:'hr_admin', dueInDays:1, escalationOwnerRole:'org_admin', escalateAfterHours:4, dependsOn:['approve'] },
        ],
        manager_approval_notify:[
          { id:'approve', name:'Manager approval', type:'approval', ownerRole:'manager', dueInDays:2, escalationOwnerRole:'hr_admin', escalateAfterHours:4, dependsOn:[] },
          { id:'notify', name:'Notify requester', type:'notification', ownerRole:'hr_admin', dueInDays:0, escalationOwnerRole:'hr_admin', escalateAfterHours:4, dependsOn:['approve'] },
        ],
        notification_only:[
          { id:'notify', name:'Automated notification', type:'notification', ownerRole:'hr_admin', dueInDays:0, escalationOwnerRole:'hr_admin', escalateAfterHours:4, dependsOn:[] },
        ],
      } as const;
      await apiFetch(`/api/organizations/${orgId}/workflows`, { method:'POST', body: JSON.stringify({
        name: f.get('name'), description: f.get('description'), trigger:f.get('trigger'), conditions,conditionMode:f.get('conditionMode')||'all', enabled:true,
        steps:templates[template],
      })});
      form.reset();
      setStarted('Workflow created successfully.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create workflow.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleWorkflow(id:string, enabled:boolean) {
    setError(''); setStarted('');
    try {
      const orgId=activeOrgId();
      await apiFetch(`/api/organizations/${orgId}/workflows/${id}`,{method:'POST',body:JSON.stringify({action:enabled?'disable':'enable'})});
      setStarted(`Workflow ${enabled?'disabled':'enabled'} after governed review.`);
      await load();
    } catch(e) { setError(e instanceof Error?e.message:'Unable to update workflow status.'); }
  }

  async function run(id:string) {
    setError(''); setStarted('');
    try {
      const orgId = activeOrgId();
      const r = await apiFetch<{data:{run:{id:string};steps:number}}>(`/api/organizations/${orgId}/workflow-runs`, { method:'POST', body:JSON.stringify({workflowId:id}) });
      setStarted(`Started run ${r.data.run.id.slice(0,8)} with ${r.data.steps} tracked steps.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start workflow.'); }
  }

  async function act(runId:string, step:StepRun, action:string){
    setError('');
    try{
      const orgId = activeOrgId();
      await apiFetch(`/api/organizations/${orgId}/workflow-runs/${runId}/steps/${step.workflowStepId}`,{method:'POST',body:JSON.stringify({action})});
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to update workflow step.');}
  }

  return <div className="stack" ref={translationRoot}>
    <form className="card stack automationDesigner" onSubmit={create} aria-busy={creating}>
      <div className="toolbar"><div><span className="eyebrow">Automation Designer 2.0</span><h2 className="sectionTitle">Create governed event automation</h2><p className="muted">Choose a trigger, optionally filter the event payload, then use a safe step template. Automated notifications may run without a person; task and approval steps still require their configured owners.</p></div><a className="button secondary" href="/automation-marketplace">Automation Marketplace</a></div>
      <div className="formGrid">
        <label className="field"><span>Name</span><input required name="name" className="input" placeholder="High-priority HR service escalation" disabled={creating} /></label>
        <label className="field"><span>Description</span><input name="description" className="input" placeholder="Route selected events through governed review" disabled={creating} /></label>
        <label className="field"><span>Trigger</span><select className="input" name="trigger" defaultValue="manual" disabled={creating}>{WORKFLOW_TRIGGER_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="field"><span>Step template</span><select className="input" value={template} onChange={e=>setTemplate(e.target.value as any)} disabled={creating}><option value="review_approval_notify">HR review → manager approval → notify</option><option value="manager_approval_notify">Manager approval → notify</option><option value="notification_only">Automated notification only</option></select></label>
      </div>
      <div className="automationConditionBox"><div><strong>Optional trigger condition</strong><p className="muted">Conditions are evaluated against the durable domain event before a workflow run is created.</p></div><div className="formGrid"><label className="field"><span>Event field</span><input className="input" name="conditionField" placeholder="payload.priority" pattern="(?:entityType|entityId|payload\.[A-Za-z0-9_.-]+)"/></label><label className="field"><span>Operator</span><select className="input" name="conditionOperator" defaultValue="eq"><option value="eq">Equals</option><option value="neq">Does not equal</option><option value="contains">Contains</option><option value="exists">Exists</option><option value="gt">Greater than</option><option value="gte">Greater/equal</option><option value="lt">Less than</option><option value="lte">Less/equal</option></select></label><label className="field"><span>Value</span><input className="input" name="conditionValue" placeholder="high"/></label><label className="field"><span>Condition mode</span><select className="input" name="conditionMode" defaultValue="all"><option value="all">All conditions</option><option value="any">Any condition</option></select></label></div></div>
      <div className="notice"><strong>Governance boundary:</strong> this designer does not make hiring, termination, promotion, discipline, succession or individual compensation decisions. Those actions must remain in human-governed domain workflows.</div>
      <div><button className="button" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create governed automation'}</button></div>
    </form>
    {error && <div className="error">{error}</div>}{started && <div className="notice">{started}</div>}
    <section className="card tableWrap"><h2 className="sectionTitle">Workflow definitions</h2><table><thead><tr><th>Workflow</th><th>Trigger</th><th>Conditions</th><th>Version</th><th>Steps</th><th>Status</th><th></th></tr></thead><tbody>
      {data.map(w => <tr key={w.id}><td><strong>{w.name}</strong><div className="muted">{w.description || '—'}</div></td><td>{w.trigger}</td><td>{w.conditions?.length?`${w.conditionMode||'all'} · ${w.conditions.length}`:'—'}</td><td>v{w.version}</td><td>{w.steps.length}</td><td><span className="badge">{w.enabled ? 'enabled':'disabled'}</span></td><td><div className="row wrap"><button className="button secondary" type="button" disabled={!w.enabled} onClick={() => run(w.id)}>Run</button><button className="button secondary" type="button" onClick={()=>toggleWorkflow(w.id,w.enabled)}>{w.enabled?'Disable':'Enable'}</button></div></td></tr>)}
      {!data.length && <tr><td colSpan={7} className="muted">No workflows yet.</td></tr>}
    </tbody></table></section>

    {runs.length>0&&<section className="card stack"><div className="toolbar"><div><h2 className="sectionTitle">Professional workflow Gantt</h2><p className="muted">Dependencies, due dates, owners, SLA blockers and progress come from persisted workflow state.</p></div><select className="input" value={selectedRunId} onChange={e=>setSelectedRunId(e.target.value)}>{runs.map(r=><option key={r.id} value={r.id}>{r.workflowName||r.workflowId} · {r.id.slice(0,8)}</option>)}</select></div><GovernedGantt tasks={ganttTasks(runs.find(r=>r.id===selectedRunId)||runs[0])}/></section>}

    <section className="stack">
      <div className="toolbar"><h2 className="sectionTitle">Live workflow runs</h2><span className="muted">Actual persisted progress · refreshes every 3 seconds</span></div>
      {runs.map(run=><div className="card stack" key={run.id}>
        <div className="runHeader"><div><strong>{run.workflowName||run.workflowId}</strong><div className="muted">Run {run.id.slice(0,8)} · {new Date(run.startedAt).toLocaleString()}{run.sourceEventId?` · event ${run.sourceEventId.slice(0,8)}`:''}</div></div><span className="badge">{run.status}</span></div>
        <div className="progressRow"><div className="progressTrack"><span style={{width:`${run.progress}%`}} /></div><strong>{run.progress}%</strong></div>
        <div className="muted">{run.completedSteps}/{run.totalSteps} successfully completed</div>
        <div className="workflowSteps">{run.steps.map(step=><div className={`workflowStep ${step.status}`} key={step.id}>
          <div><strong>{step.name}</strong><div className="muted">{step.type} · owner: {step.ownerRole||'any'}{step.dueAt?` · due ${new Date(step.dueAt).toLocaleString()}`:''}{step.escalationCount?` · escalations ${step.escalationCount}`:''}</div></div>
          <div className="stepActions"><span className="badge">{step.outcome||step.status}</span>{step.slaStatus&&<span className="badge">SLA: {step.slaStatus}</span>}</div>
          <div className="stepActions">
            {step.status==='ready'&&step.type!=='approval'&&<button className="button secondary" type="button" onClick={()=>act(run.id,step,'start')}>Start</button>}
            {['ready','in_progress'].includes(step.status)&&step.type!=='approval'&&<button className="button" type="button" onClick={()=>act(run.id,step,'complete')}>Complete</button>}
            {['ready','in_progress'].includes(step.status)&&step.type==='approval'&&<><button className="button" type="button" onClick={()=>act(run.id,step,'approve')}>Approve</button><button className="button dangerButton" type="button" onClick={()=>act(run.id,step,'reject')}>Reject</button></>}
          </div>
        </div>)}</div>
      </div>)}
      {!runs.length&&<div className="card muted">No workflow runs yet.</div>}
    </section>
  </div>;
}

function ganttTasks(run:Run|undefined):GovernedGanttTask[]{if(!run)return[];const start=run.startedAt;return run.steps.map(step=>{const statusMap:Record<string,GovernedGanttStatus>={pending:'not_started',not_started:'not_started',ready:'ready',in_progress:'in_progress',waiting:'waiting',blocked:'blocked',completed:'completed',complete:'completed',approved:'completed',rejected:'blocked',failed:'blocked',cancelled:'cancelled'};const status=statusMap[step.status]||statusMap[step.outcome||'']||'waiting';const pct=status==='completed'?100:status==='in_progress'?null:status==='ready'?0:null;const blocker=step.slaStatus&&['overdue','breached'].includes(step.slaStatus)?`SLA ${step.slaStatus}`:status==='blocked'?(step.outcome||'Workflow step blocked'):undefined;const risk=blocker?'high':step.escalationCount?'medium':'low';return{id:step.id,title:step.name,owner:step.ownerRole||'Unassigned',status,start,end:step.dueAt||start,progressPercent:pct,dependencies:step.dependsOn||[],blocker,risk,milestone:step.type==='notification'}})}
