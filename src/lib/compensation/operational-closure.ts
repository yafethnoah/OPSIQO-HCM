import type { ActorContext } from '@/domain/security';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

const now = () => new Date().toISOString();

export async function reviewCompensationPayrollSync(
  actor: ActorContext,
  workerId: string,
  note?: string,
) {
  const permissions = actor.permissions as string[];
  if (!permissions.includes('compensation.manage') && !permissions.includes('payroll.review')) {
    throw new ApiError(403, 'Compensation management or payroll review permission required.', 'forbidden');
  }

  const db = adminDb();
  const compRef = db.doc(`organizations/${actor.orgId}/workerCompensationCurrent/${workerId}`);
  const syncRef = db.doc(`organizations/${actor.orgId}/compensationPayrollSyncCurrent/${workerId}`);
  const [compSnap, syncSnap] = await Promise.all([compRef.get(), syncRef.get()]);

  if (!compSnap.exists) {
    throw new ApiError(409, 'Current compensation is required before compensation-to-payroll sync can be reviewed.', 'compensation_missing');
  }

  const current = compSnap.data() as any;
  const before = syncSnap.exists ? { id: syncSnap.id, ...(syncSnap.data() || {}) } : undefined;
  const timestamp = now();

  const after = {
    ...(syncSnap.data() || {}),
    workerId,
    compensationRecordId: current.id || compSnap.id,
    status: 'reviewed',
    reviewNote: String(note || '').trim(),
    reviewedBy: actor.uid,
    reviewedAt: timestamp,
    updatedBy: actor.uid,
    updatedAt: timestamp,
  };

  await syncRef.set(after, { merge: true });

  const audit = buildAudit(actor, {
    action: 'compensation.payroll_sync.review',
    entityType: 'compensationPayrollSync',
    entityId: workerId,
    before,
    after,
  });
  await db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);

  return after;
}