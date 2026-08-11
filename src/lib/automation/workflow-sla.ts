import { randomUUID } from 'crypto';
import type { WorkflowStepRun, WorkflowEscalation } from '@/domain/workflow';
import { adminDb } from '@/lib/firebase/admin';
import { buildAudit } from '@/lib/audit/service';
import { systemActor } from './system-actor';
import { getNotificationSettingsForOrg } from '@/lib/notifications/service';

const now = () => new Date().toISOString();
const actionable = new Set(['ready', 'in_progress', 'blocked']);

export async function processWorkflowSla(orgId: string, limit = 200) {
  const db = adminDb();
  const timestamp = now();
  const snap = await db.collection(`organizations/${orgId}/workflowStepRuns`)
    .where('dueAt', '<=', timestamp)
    .limit(Math.max(1, Math.min(limit, 500)))
    .get();

  const summary = { scanned: snap.size, overdue: 0, escalated: 0, unchanged: 0 };
  const actor = systemActor(orgId, 'system:workflow-sla');
  const notificationSettings = await getNotificationSettingsForOrg(orgId);

  for (const doc of snap.docs) {
    const ref = doc.ref;
    const changed = await db.runTransaction(async (tx) => {
      const currentSnap = await tx.get(ref);
      if (!currentSnap.exists) return 'unchanged' as const;
      const step = currentSnap.data() as WorkflowStepRun;
      if (!actionable.has(step.status) || !step.dueAt || step.dueAt > timestamp) return 'unchanged' as const;

      const shouldEscalate = Boolean(step.escalateAt && step.escalateAt <= timestamp && !step.escalatedAt);
      if (shouldEscalate) {
        const level = Number(step.escalationCount || 0) + 1;
        const escalationId = randomUUID();
        const escalation: WorkflowEscalation = {
          id: escalationId,
          runId: step.runId,
          stepRunId: step.id,
          workflowStepId: step.workflowStepId,
          targetRole: step.escalationOwnerRole || 'hr_admin',
          level,
          reason: 'sla_overdue',
          createdAt: timestamp,
        };
        tx.update(ref, { slaStatus: 'escalated', escalationCount: level, escalatedAt: timestamp, updatedAt: timestamp });
        tx.create(db.doc(`organizations/${orgId}/workflowEscalations/${escalationId}`), escalation);
        if (notificationSettings.workflowEscalationsEnabled && (notificationSettings.inAppEnabled || notificationSettings.emailEnabled)) {
          const notificationId = randomUUID();
          tx.create(db.doc(`organizations/${orgId}/notifications/${notificationId}`), {
            id: notificationId,
            type: 'workflow.sla.escalation',
            title: `Workflow step overdue: ${step.name}`,
            message: `Step ${step.name} in run ${step.runId} exceeded its SLA.`,
            targetRole: escalation.targetRole,
            entityType: 'workflowStepRun',
            entityId: step.id,
            status: 'unread',
            inAppVisible: notificationSettings.inAppEnabled,
            emailStatus: notificationSettings.emailEnabled ? 'pending' : 'disabled',
            emailAttempts: 0,
            createdAt: timestamp,
          });
        }
        const audit = buildAudit(actor, {
          action: 'workflow.sla.escalate',
          entityType: 'workflowStepRun',
          entityId: step.id,
          before: step,
          after: { ...step, slaStatus: 'escalated', escalationCount: level, escalatedAt: timestamp },
          metadata: { escalationId, targetRole: escalation.targetRole, runId: step.runId },
        });
        tx.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
        return 'escalated' as const;
      }

      if (step.slaStatus !== 'overdue' && step.slaStatus !== 'escalated') {
        tx.update(ref, { slaStatus: 'overdue', updatedAt: timestamp });
        return 'overdue' as const;
      }
      return 'unchanged' as const;
    });

    if (changed === 'escalated') summary.escalated += 1;
    else if (changed === 'overdue') summary.overdue += 1;
    else summary.unchanged += 1;
  }
  return summary;
}
