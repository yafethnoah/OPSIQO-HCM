import { randomUUID } from 'crypto';
import type { ActorContext, Role } from '@/domain/security';
import type { WorkflowDefinition, WorkflowRun, WorkflowStepRun } from '@/domain/workflow';
import type { DocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { workflowDefinitionCreateSchema, workflowRunCreateSchema, workflowStepActionSchema } from './schemas';
import { systemActor } from '@/lib/automation/system-actor';
import { getNotificationSettingsForOrg } from '@/lib/notifications/service';

const now = () => new Date().toISOString();
const terminal = new Set(['completed', 'rejected', 'skipped', 'failed']);
const dependencySatisfied = new Set(['completed', 'skipped']);

function plusDays(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}
function plusHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

export async function listWorkflows(actor: ActorContext) {
  const snap = await adminDb()
    .collection(`organizations/${actor.orgId}/workflowDefinitions`)
    .orderBy('name')
    .limit(250)
    .get();
  return snap.docs.map((d) => d.data());
}

export async function createWorkflow(actor: ActorContext, raw: unknown) {
  const input = workflowDefinitionCreateSchema.parse(raw);
  const id = randomUUID();
  const timestamp = now();
  const workflow: WorkflowDefinition = {
    id,
    name: input.name,
    description: input.description,
    trigger: input.trigger,
    conditions: input.conditions,
    conditionMode: input.conditionMode,
    enabled: input.enabled,
    version: 1,
    steps: input.steps,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const audit = buildAudit(actor, {
    action: 'workflow.create',
    entityType: 'workflowDefinition',
    entityId: id,
    after: workflow,
  });
  const db = adminDb();
  const batch = db.batch();
  batch.create(db.doc(`organizations/${actor.orgId}/workflowDefinitions/${id}`), workflow);
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return workflow;
}

export async function listWorkflowRuns(actor: ActorContext, limit = 50) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const db = adminDb();
  const runSnap = await db.collection(`organizations/${actor.orgId}/workflowRuns`).orderBy('startedAt', 'desc').limit(safeLimit).get();
  const runs = runSnap.docs.map((d) => d.data() as WorkflowRun);
  return Promise.all(runs.map(async (run) => {
    const stepSnap = await db.collection(`organizations/${actor.orgId}/workflowStepRuns`).where('runId', '==', run.id).get();
    const steps = stepSnap.docs.map((d) => d.data() as WorkflowStepRun).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { ...run, steps };
  }));
}

export async function getWorkflowRun(actor: ActorContext, runId: string) {
  const db = adminDb();
  const runSnap = await db.doc(`organizations/${actor.orgId}/workflowRuns/${runId}`).get();
  if (!runSnap.exists) throw new ApiError(404, 'Workflow run not found.', 'workflow_run_not_found');
  const run = runSnap.data() as WorkflowRun;
  const stepSnap = await db.collection(`organizations/${actor.orgId}/workflowStepRuns`).where('runId', '==', runId).get();
  return { ...run, steps: stepSnap.docs.map((d) => d.data() as WorkflowStepRun).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) };
}

type StartOptions = {
  entityType?: string;
  entityId?: string;
  sourceEventId?: string;
  dispatchKey?: string;
};

export async function startWorkflowFromDefinition(actor: ActorContext, workflow: WorkflowDefinition, options: StartOptions = {}) {
  if (!workflow.enabled) throw new ApiError(409, 'Workflow is disabled.', 'workflow_disabled');
  const db = adminDb();
  const timestamp = now();
  const runId = randomUUID();
  const dispatchRef = options.dispatchKey
    ? db.doc(`organizations/${actor.orgId}/workflowDispatches/${encodeURIComponent(options.dispatchKey)}`)
    : null;
  let result: { run: WorkflowRun; steps: number; deduplicated: boolean } | undefined;

  await db.runTransaction(async (tx: Transaction) => {
    if (dispatchRef) {
      const marker = await tx.get(dispatchRef);
      if (marker.exists) {
        const existingRunId = marker.data()?.runId as string | undefined;
        if (existingRunId) {
          const existingRunSnap = await tx.get(db.doc(`organizations/${actor.orgId}/workflowRuns/${existingRunId}`));
          if (existingRunSnap.exists) {
            result = { run: existingRunSnap.data() as WorkflowRun, steps: workflow.steps.length, deduplicated: true };
            return;
          }
        }
        throw new ApiError(409, 'Workflow dispatch marker exists without a valid run.', 'workflow_dispatch_inconsistent');
      }
    }

    const run: WorkflowRun = {
      id: runId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      workflowName: workflow.name,
      status: 'running',
      progress: 0,
      totalSteps: workflow.steps.length,
      completedSteps: 0,
      stepsSnapshot: workflow.steps,
      entityType: options.entityType,
      entityId: options.entityId,
      sourceEventId: options.sourceEventId,
      dispatchKey: options.dispatchKey,
      startedBy: actor.uid,
      startedAt: timestamp,
      updatedAt: timestamp,
    };

    tx.create(db.doc(`organizations/${actor.orgId}/workflowRuns/${runId}`), run);
    for (const step of workflow.steps) {
      const stepId = `${runId}_${step.id}`;
      const readyAtStart = (step.dependsOn?.length ?? 0) === 0;
      const dueAt = readyAtStart && step.dueInDays != null ? plusDays(timestamp, step.dueInDays) : null;
      const escalateAt = dueAt == null ? null : plusHours(dueAt, step.escalateAfterHours ?? 0);
      const stepRun: WorkflowStepRun = {
        id: stepId,
        runId,
        workflowStepId: step.id,
        name: step.name,
        type: step.type,
        ownerRole: step.ownerRole ?? null,
        dueInDays: step.dueInDays ?? null,
        dueAt,
        escalateAfterHours: step.escalateAfterHours ?? 0,
        escalateAt,
        escalationOwnerRole: step.escalationOwnerRole ?? 'hr_admin',
        escalationCount: 0,
        slaStatus: 'on_track',
        dependsOn: step.dependsOn ?? [],
        status: readyAtStart ? 'ready' : 'blocked',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      tx.create(db.doc(`organizations/${actor.orgId}/workflowStepRuns/${stepId}`), stepRun);
    }
    if (dispatchRef) {
      tx.create(dispatchRef, {
        dispatchKey: options.dispatchKey,
        sourceEventId: options.sourceEventId,
        workflowId: workflow.id,
        runId,
        createdAt: timestamp,
      });
    }
    const audit = buildAudit(actor, {
      action: options.sourceEventId ? 'workflow.dispatch' : 'workflow.start',
      entityType: 'workflowRun',
      entityId: runId,
      after: run,
      metadata: options.sourceEventId ? { sourceEventId: options.sourceEventId, dispatchKey: options.dispatchKey } : undefined,
    });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
    result = { run, steps: workflow.steps.length, deduplicated: false };
  });

  return result!;
}

export async function startWorkflow(actor: ActorContext, raw: unknown) {
  const input = workflowRunCreateSchema.parse(raw);
  const db = adminDb();
  const workflowRef = db.doc(`organizations/${actor.orgId}/workflowDefinitions/${input.workflowId}`);
  const workflowSnap = await workflowRef.get();
  if (!workflowSnap.exists) throw new ApiError(404, 'Workflow not found.', 'workflow_not_found');
  return startWorkflowFromDefinition(actor, workflowSnap.data() as WorkflowDefinition, {
    entityType: input.entityType,
    entityId: input.entityId,
  });
}

function mayAct(actor: ActorContext, step: WorkflowStepRun) {
  if (['super_admin', 'org_admin', 'hr_admin'].includes(actor.role)) return true;
  if (!step.ownerRole) return true;
  return actor.role === step.ownerRole as Role;
}

export async function actOnWorkflowStep(actor: ActorContext, runId: string, workflowStepId: string, raw: unknown) {
  const input = workflowStepActionSchema.parse(raw);
  const db = adminDb();
  const runRef = db.doc(`organizations/${actor.orgId}/workflowRuns/${runId}`);
  const targetRef = db.doc(`organizations/${actor.orgId}/workflowStepRuns/${runId}_${workflowStepId}`);
  const timestamp = now();
  let response: { run: WorkflowRun; step: WorkflowStepRun } | undefined;

  await db.runTransaction(async (tx) => {
    const [runSnap, targetSnap] = await Promise.all([tx.get(runRef), tx.get(targetRef)]);
    if (!runSnap.exists) throw new ApiError(404, 'Workflow run not found.', 'workflow_run_not_found');
    if (!targetSnap.exists) throw new ApiError(404, 'Workflow step not found.', 'workflow_step_not_found');
    const run = runSnap.data() as WorkflowRun;
    const target = targetSnap.data() as WorkflowStepRun;
    if (run.status !== 'running') throw new ApiError(409, `Workflow is ${run.status}.`, 'workflow_not_running');
    if (!mayAct(actor, target)) throw new ApiError(403, `Step is owned by ${target.ownerRole}.`, 'step_owner_required');

    const workflowSteps = run.stepsSnapshot;
    if (!workflowSteps?.length) throw new ApiError(409, 'Workflow run snapshot is missing.', 'workflow_snapshot_missing');
    const refs = workflowSteps.map((s) => db.doc(`organizations/${actor.orgId}/workflowStepRuns/${runId}_${s.id}`));
    const snaps: DocumentSnapshot[] = [];
    for (const ref of refs) snaps.push(await tx.get(ref));
    const stepMap = new Map<string, WorkflowStepRun>();
    for (const snap of snaps) if (snap.exists) {
      const step = snap.data() as WorkflowStepRun;
      stepMap.set(step.workflowStepId, step);
    }

    if (input.action === 'start') {
      if (target.status !== 'ready') throw new ApiError(409, 'Only ready steps can be started.', 'step_not_ready');
      target.status = 'in_progress';
    } else if (input.action === 'complete') {
      if (!['ready', 'in_progress'].includes(target.status)) throw new ApiError(409, 'Step cannot be completed from its current state.', 'invalid_step_state');
      target.status = 'completed'; target.outcome = 'completed';
    } else if (input.action === 'approve') {
      if (target.type !== 'approval') throw new ApiError(409, 'Only approval steps can be approved.', 'not_approval_step');
      if (!['ready', 'in_progress'].includes(target.status)) throw new ApiError(409, 'Approval is not actionable.', 'invalid_step_state');
      target.status = 'completed'; target.outcome = 'approved';
    } else if (input.action === 'reject') {
      if (target.type !== 'approval') throw new ApiError(409, 'Only approval steps can be rejected.', 'not_approval_step');
      if (!['ready', 'in_progress'].includes(target.status)) throw new ApiError(409, 'Approval is not actionable.', 'invalid_step_state');
      target.status = 'rejected'; target.outcome = 'rejected';
    } else if (input.action === 'skip') {
      if (!['ready', 'in_progress', 'blocked'].includes(target.status)) throw new ApiError(409, 'Step cannot be skipped.', 'invalid_step_state');
      if (!['super_admin', 'org_admin', 'hr_admin'].includes(actor.role)) throw new ApiError(403, 'Only HR administrators can skip workflow steps.', 'skip_not_allowed');
      target.status = 'skipped'; target.outcome = 'skipped';
    }
    target.note = input.note;
    target.actedBy = actor.uid;
    target.actedAt = timestamp;
    target.updatedAt = timestamp;
    if (terminal.has(target.status)) {
      target.slaStatus = target.dueAt && timestamp > target.dueAt ? 'completed_late' : 'met';
    }
    stepMap.set(target.workflowStepId, target);
    tx.update(targetRef, target);

    for (const definitionStep of workflowSteps) {
      const step = stepMap.get(definitionStep.id);
      if (!step || step.status !== 'blocked') continue;
      const depsReady = (definitionStep.dependsOn || []).every((dep) => dependencySatisfied.has(stepMap.get(dep)?.status || 'blocked'));
      if (depsReady) {
        const dueAt = definitionStep.dueInDays == null ? null : plusDays(timestamp, definitionStep.dueInDays);
        const escalateAt = dueAt == null ? null : plusHours(dueAt, definitionStep.escalateAfterHours ?? 0);
        step.status = 'ready';
        step.dueAt = dueAt;
        step.escalateAt = escalateAt;
        step.updatedAt = timestamp;
        tx.update(db.doc(`organizations/${actor.orgId}/workflowStepRuns/${step.id}`), { status: 'ready', dueAt, escalateAt, updatedAt: timestamp });
      }
    }

    const allSteps = [...stepMap.values()];
    const finished = allSteps.filter((s) => terminal.has(s.status)).length;
    const successful = allSteps.filter((s) => dependencySatisfied.has(s.status)).length;
    const failed = allSteps.some((s) => ['rejected', 'failed'].includes(s.status));
    const allSuccessful = successful === run.totalSteps;
    const progress = Math.round((finished / Math.max(1, run.totalSteps)) * 100);
    const runUpdate: Partial<WorkflowRun> = {
      progress,
      completedSteps: successful,
      updatedAt: timestamp,
      status: failed ? 'failed' : allSuccessful ? 'completed' : 'running',
      completedAt: failed || allSuccessful ? timestamp : undefined,
    };
    tx.update(runRef, runUpdate);
    const updatedRun = { ...run, ...runUpdate } as WorkflowRun;

    const audit = buildAudit(actor, {
      action: `workflow.step.${input.action}`,
      entityType: 'workflowStepRun',
      entityId: target.id,
      before: targetSnap.data(),
      after: target,
      metadata: { runId, workflowStepId, progress: updatedRun.progress },
    });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
    response = { run: updatedRun, step: target };
  });

  return response!;
}


export async function processWorkflowNotificationSteps(orgId:string,limit=200){
 const db=adminDb(),actor=systemActor(orgId,'system:workflow-notification'),settings=await getNotificationSettingsForOrg(orgId),summary={scanned:0,delivered:0,completed:0,failed:0,passes:0};
 const safe=Math.max(1,Math.min(limit,500));
 for(let pass=0;pass<10;pass++){
  const snap=await db.collection(`organizations/${orgId}/workflowStepRuns`).where('status','==','ready').limit(safe).get();
  const steps=snap.docs.map(d=>d.data() as WorkflowStepRun).filter(step=>step.type==='notification');
  summary.scanned+=steps.length;summary.passes=pass+1;
  if(!steps.length)break;
  let progressed=0;
  for(const step of steps){
   try{
    const runSnap=await db.doc(`organizations/${orgId}/workflowRuns/${step.runId}`).get();
    if(!runSnap.exists)continue;
    const run=runSnap.data() as WorkflowRun;
    const marker=db.doc(`organizations/${orgId}/workflowNotificationDispatches/${encodeURIComponent(step.id)}`);
    let delivered=false;
    await db.runTransaction(async tx=>{
     const prior=await tx.get(marker);if(prior.exists)return;
     const id=randomUUID(),timestamp=now();
     tx.create(marker,{stepRunId:step.id,runId:step.runId,createdAt:timestamp});
     tx.create(db.doc(`organizations/${orgId}/notifications/${id}`),{
      id,type:'workflow.notification',category:'workflow',title:step.name,
      message:`Workflow ${run.workflowName||run.workflowId} reached the automated notification step “${step.name}”.`,
      targetRole:step.ownerRole||'hr_admin',entityType:run.entityType||'workflowRun',entityId:run.entityId||run.id,
      status:'unread',inAppVisible:settings.inAppEnabled,emailStatus:settings.emailEnabled?'pending':'disabled',emailAttempts:0,
      createdAt:timestamp,updatedAt:timestamp,
     });
     delivered=true;
    });
    if(delivered)summary.delivered++;
    await actOnWorkflowStep(actor,step.runId,step.workflowStepId,{action:'complete',note:'Automatically completed after workflow notification dispatch.'});
    summary.completed++;progressed++;
   }catch{summary.failed++;}
  }
  if(!progressed)break;
 }
 return summary;
}

export async function setWorkflowEnabled(actor: ActorContext, workflowId: string, enabled: boolean) {
  const db=adminDb(),ref=db.doc(`organizations/${actor.orgId}/workflowDefinitions/${workflowId}`),snap=await ref.get();
  if(!snap.exists) throw new ApiError(404,'Workflow not found.','workflow_not_found');
  const before=snap.data() as WorkflowDefinition;
  if(before.enabled===enabled) return before;
  const after={...before,enabled,updatedAt:now()};
  const audit=buildAudit(actor,{action:enabled?'workflow.enable':'workflow.disable',entityType:'workflowDefinition',entityId:workflowId,before,after});
  const batch=db.batch();batch.set(ref,{enabled,updatedAt:after.updatedAt},{merge:true});batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();
  return after;
}
