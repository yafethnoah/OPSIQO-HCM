import { randomUUID } from 'node:crypto';
import type { ActorContext } from '@/domain/security';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import {
  assessOntarioComplianceReadiness,
  defaultOntarioComplianceProfile,
  type OntarioComplianceProfile,
} from '@/lib/country-compliance/ontario-readiness';
import {
  buildOntarioRemediationPlan,
  computeOntarioAssurance,
  evidenceOperationalStatus,
  type OntarioComplianceEvidence,
  type OntarioComplianceTask,
  type OntarioTaskStatus,
} from '@/lib/country-compliance/ontario-assurance';

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

function requireRead(actor: ActorContext) {
  if (!actor.permissions.includes('regulatory.read')) {
    throw new ApiError(403, 'Regulatory read permission required.', 'forbidden');
  }
}

function requireManage(actor: ActorContext) {
  if (!actor.permissions.includes('regulatory.manage')) {
    throw new ApiError(403, 'Regulatory management permission required.', 'forbidden');
  }
}

function requiredText(value: unknown, label: string) {
  const next = String(value || '').trim();
  if (!next) throw new ApiError(400, `${label} is required.`, 'invalid_ontario_assurance_input');
  if (next.length > 500) throw new ApiError(400, `${label} is too long.`, 'invalid_ontario_assurance_input');
  return next;
}

function optionalText(value: unknown, max = 1000) {
  const next = String(value || '').trim();
  if (next.length > max) throw new ApiError(400, 'Text value is too long.', 'invalid_ontario_assurance_input');
  return next || undefined;
}

function optionalDate(value: unknown, label: string) {
  const next = String(value || '').trim();
  if (!next) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) {
    throw new ApiError(400, `${label} must use YYYY-MM-DD.`, 'invalid_ontario_assurance_input');
  }
  return next;
}

async function loadProfile(actor: ActorContext): Promise<OntarioComplianceProfile> {
  const snap = await adminDb().doc(`organizations/${actor.orgId}/ontarioComplianceProfile/current`).get();
  return snap.exists
    ? ({ ...defaultOntarioComplianceProfile(), ...snap.data(), id: 'current' } as OntarioComplianceProfile)
    : defaultOntarioComplianceProfile();
}

async function loadEvidence(actor: ActorContext): Promise<OntarioComplianceEvidence[]> {
  const snap = await adminDb().collection(`organizations/${actor.orgId}/ontarioComplianceEvidence`).get();
  return snap.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as OntarioComplianceEvidence)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function loadTasks(actor: ActorContext): Promise<OntarioComplianceTask[]> {
  const snap = await adminDb().collection(`organizations/${actor.orgId}/ontarioComplianceTasks`).get();
  return snap.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as OntarioComplianceTask)
    .sort((a, b) => a.priority.localeCompare(b.priority) || a.label.localeCompare(b.label));
}

async function loadSnapshot(actor: ActorContext) {
  const [profile, evidence, tasks] = await Promise.all([
    loadProfile(actor),
    loadEvidence(actor),
    loadTasks(actor),
  ]);
  const asOfDate = today();
  const assessment = assessOntarioComplianceReadiness(profile, asOfDate);
  const assurance = computeOntarioAssurance(profile, evidence, tasks, asOfDate);

  return {
    profile,
    assessment,
    assurance,
    evidence: evidence.map((item) => ({
      ...item,
      operationalStatus: evidenceOperationalStatus(item, asOfDate),
    })),
    tasks,
    canManage: actor.permissions.includes('regulatory.manage'),
    asOfDate,
  };
}

export async function getOntarioAssurance(actor: ActorContext) {
  requireRead(actor);
  return loadSnapshot(actor);
}

export async function submitOntarioEvidence(actor: ActorContext, raw: unknown) {
  requireManage(actor);
  const input = (raw || {}) as Record<string, unknown>;
  const profile = await loadProfile(actor);
  const obligationId = requiredText(input.obligationId, 'Obligation');
  const obligation = assessOntarioComplianceReadiness(profile, today()).obligations.find((item) => item.id === obligationId);

  if (!obligation) {
    throw new ApiError(404, 'Ontario obligation was not found.', 'ontario_obligation_not_found');
  }
  if (obligation.applicability === 'not_applicable') {
    throw new ApiError(409, 'Evidence cannot be submitted for an obligation currently marked not applicable.', 'obligation_not_applicable');
  }

  const timestamp = now();
  const id = randomUUID();
  const evidence: OntarioComplianceEvidence = {
    id,
    obligationId,
    title: requiredText(input.title, 'Evidence title'),
    reference: requiredText(input.reference, 'Evidence reference'),
    status: 'submitted',
    validFrom: optionalDate(input.validFrom, 'Valid-from date'),
    reviewDueDate: optionalDate(input.reviewDueDate, 'Review-due date'),
    createdBy: actor.uid,
    createdAt: timestamp,
    updatedBy: actor.uid,
    updatedAt: timestamp,
  };

  await adminDb().doc(`organizations/${actor.orgId}/ontarioComplianceEvidence/${id}`).create(evidence);
  const audit = buildAudit(actor, {
    action: 'regulatory.ontario.evidence.submit',
    entityType: 'ontarioComplianceEvidence',
    entityId: id,
    before: undefined,
    after: evidence,
  });
  await adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);

  return loadSnapshot(actor);
}

export async function reviewOntarioEvidence(actor: ActorContext, raw: unknown) {
  requireManage(actor);
  const input = (raw || {}) as Record<string, unknown>;
  const evidenceId = requiredText(input.evidenceId, 'Evidence id');
  const decision = String(input.decision || '');
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new ApiError(400, 'Evidence decision must be approved or rejected.', 'invalid_evidence_decision');
  }

  const ref = adminDb().doc(`organizations/${actor.orgId}/ontarioComplianceEvidence/${evidenceId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'Ontario evidence was not found.', 'ontario_evidence_not_found');

  const before = { ...snap.data(), id: snap.id } as OntarioComplianceEvidence;
  if (before.status !== 'submitted' && before.status !== 'approved' && before.status !== 'rejected') {
    throw new ApiError(409, 'This evidence cannot be reviewed in its current state.', 'invalid_evidence_state');
  }

  const timestamp = now();
  const after: OntarioComplianceEvidence = {
    ...before,
    status: decision,
    reviewNote: optionalText(input.reviewNote),
    reviewerUid: actor.uid,
    reviewedAt: timestamp,
    updatedBy: actor.uid,
    updatedAt: timestamp,
  };

  await ref.set(after);

  const taskRef = adminDb().doc(`organizations/${actor.orgId}/ontarioComplianceTasks/ontario-${before.obligationId}`);
  const taskSnap = await taskRef.get();
  if (taskSnap.exists) {
    const task = taskSnap.data() as OntarioComplianceTask;
    if (decision === 'approved') {
      await taskRef.set({
        ...task,
        status: 'complete',
        completionReason: 'approved_evidence',
        updatedBy: actor.uid,
        updatedAt: timestamp,
      }, { merge: true });
    } else if (task.status === 'complete' && task.completionReason === 'approved_evidence') {
      await taskRef.set({
        ...task,
        status: 'open',
        completionReason: null,
        updatedBy: actor.uid,
        updatedAt: timestamp,
      }, { merge: true });
    }
  }

  const audit = buildAudit(actor, {
    action: `regulatory.ontario.evidence.${decision}`,
    entityType: 'ontarioComplianceEvidence',
    entityId: evidenceId,
    before,
    after,
  });
  await adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);

  return loadSnapshot(actor);
}

export async function syncOntarioRemediationTasks(actor: ActorContext) {
  requireManage(actor);
  const [profile, evidence, existingTasks] = await Promise.all([
    loadProfile(actor),
    loadEvidence(actor),
    loadTasks(actor),
  ]);
  const timestamp = now();
  const plan = buildOntarioRemediationPlan(profile, evidence, existingTasks, today());
  const db = adminDb();
  const batch = db.batch();

  for (const task of plan) {
    const previous = existingTasks.find((item) => item.obligationId === task.obligationId);
    const next: OntarioComplianceTask = {
      ...task,
      createdBy: previous?.createdBy || actor.uid,
      createdAt: previous?.createdAt || timestamp,
      updatedBy: actor.uid,
      updatedAt: timestamp,
    };
    batch.set(db.doc(`organizations/${actor.orgId}/ontarioComplianceTasks/${task.id}`), next, { merge: true });
  }

  await batch.commit();

  const audit = buildAudit(actor, {
    action: 'regulatory.ontario.remediation.sync',
    entityType: 'ontarioComplianceTasks',
    entityId: 'sync',
    before: { taskCount: existingTasks.length },
    after: { taskCount: plan.length, syncedAt: timestamp },
  });
  await db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);

  return loadSnapshot(actor);
}

export async function updateOntarioRemediationTask(actor: ActorContext, raw: unknown) {
  requireManage(actor);
  const input = (raw || {}) as Record<string, unknown>;
  const taskId = requiredText(input.taskId, 'Task id');
  const status = String(input.status || '') as OntarioTaskStatus;

  if (!['open', 'in_progress', 'blocked'].includes(status)) {
    throw new ApiError(
      400,
      'Manual task status can only be open, in progress or blocked. Completion requires approved evidence.',
      'invalid_task_status',
    );
  }

  const ref = adminDb().doc(`organizations/${actor.orgId}/ontarioComplianceTasks/${taskId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'Ontario remediation task was not found.', 'ontario_task_not_found');

  const before = { ...snap.data(), id: snap.id } as OntarioComplianceTask;
  const after: OntarioComplianceTask = {
    ...before,
    status,
    completionReason: undefined,
    note: optionalText(input.note),
    updatedBy: actor.uid,
    updatedAt: now(),
  };

  await ref.set(after);

  const audit = buildAudit(actor, {
    action: 'regulatory.ontario.remediation.update',
    entityType: 'ontarioComplianceTask',
    entityId: taskId,
    before,
    after,
  });
  await adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);

  return loadSnapshot(actor);
}