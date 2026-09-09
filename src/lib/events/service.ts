import { randomUUID } from 'crypto';
import type { DomainEvent } from '@/domain/automation';
import type { WorkflowDefinition } from '@/domain/workflow';
import { adminDb } from '@/lib/firebase/admin';
import { startWorkflowFromDefinition } from '@/lib/workflow/service';
import { systemActor } from '@/lib/automation/system-actor';
import { buildAudit } from '@/lib/audit/service';
import { getNotificationSettingsForOrg } from '@/lib/notifications/service';
import { workflowMatchesEvent } from '@/lib/workflow/conditions';
import { recordNextBestActionsForEvent } from '@/lib/intelligence-control-plane/next-best-action';

const now = () => new Date().toISOString();

export async function processPendingDomainEvents(orgId: string, limit = 50) {
  const db = adminDb();
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const snap = await db.collection(`organizations/${orgId}/domainEvents`)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(safeLimit)
    .get();

  const summary = { scanned: snap.size, processed: 0, failed: 0, workflowRunsStarted: 0, deduplicated: 0 };
  const notificationSettings = await getNotificationSettingsForOrg(orgId);

  for (const doc of snap.docs) {
    const event = doc.data() as DomainEvent;
    const attempts = Number(event.attempts || 0) + 1;
    try {
      const workflowSnap = await db.collection(`organizations/${orgId}/workflowDefinitions`)
        .where('trigger', '==', event.type)
        .where('enabled', '==', true)
        .get();
      const actor = systemActor(orgId, 'system:workflow-dispatcher');
      for (const workflowDoc of workflowSnap.docs) {
        const workflow = workflowDoc.data() as WorkflowDefinition;
        if(!workflowMatchesEvent(workflow,event))continue;
        const dispatchKey = `${event.id}:${workflow.id}:v${workflow.version}`;
        const started = await startWorkflowFromDefinition(actor, workflow, {
          entityType: event.entityType,
          entityId: event.entityId,
          sourceEventId: event.id,
          dispatchKey,
        });
        if (started.deduplicated) summary.deduplicated += 1;
        else summary.workflowRunsStarted += 1;
      }
      await recordNextBestActionsForEvent(actor,event);
      await doc.ref.set({ status: 'processed', attempts, processedAt: now(), updatedAt: now(), lastError: null }, { merge: true });
      summary.processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown domain-event dispatch error';
      const timestamp = now();
      const finalFailure = attempts >= 5;
      const batch = db.batch();
      batch.set(doc.ref, { status: finalFailure ? 'failed' : 'pending', attempts, lastError: message.slice(0, 1000), updatedAt: timestamp }, { merge: true });
      const actor = systemActor(orgId, 'system:workflow-dispatcher');
      const audit = buildAudit(actor, {
        action: finalFailure ? 'domain_event.dispatch_failed' : 'domain_event.dispatch_retry',
        entityType: 'domainEvent',
        entityId: event.id,
        before: event,
        after: { status: finalFailure ? 'failed' : 'pending', attempts, lastError: message.slice(0, 1000) },
        metadata: { eventType: event.type, sourceEntityType: event.entityType, sourceEntityId: event.entityId },
      });
      batch.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
      if (finalFailure && notificationSettings.failureAlertsEnabled && (notificationSettings.inAppEnabled || notificationSettings.emailEnabled)) {
        const notificationId = randomUUID();
        batch.create(db.doc(`organizations/${orgId}/notifications/${notificationId}`), {
          id: notificationId,
          type: 'domain_event.dispatch_failed',
          title: 'Workflow event requires review',
          message: `Event ${event.id} (${event.type}) failed after ${attempts} dispatch attempts.`,
          targetRole: 'hr_admin',
          entityType: 'domainEvent',
          entityId: event.id,
          status: 'unread',
          inAppVisible: notificationSettings.inAppEnabled,
          emailStatus: notificationSettings.emailEnabled ? 'pending' : 'disabled',
          emailAttempts: 0,
          createdAt: timestamp,
        });
      }
      await batch.commit();
      summary.failed += 1;
    }
  }

  return summary;
}
