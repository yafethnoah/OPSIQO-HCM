import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { AuditLog } from '@/domain/audit';
import { adminDb } from '@/lib/firebase/admin';

type AuditInput = Omit<AuditLog, 'id' | 'orgId' | 'actorUid' | 'actorRole' | 'createdAt'>;

export function buildAudit(actor: ActorContext, input: AuditInput): AuditLog {
  return {
    id: randomUUID(),
    orgId: actor.orgId,
    actorUid: actor.uid,
    actorRole: actor.role,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
}

export async function writeAudit(actor: ActorContext, input: AuditInput) {
  const record = buildAudit(actor, input);
  await adminDb().doc(`organizations/${actor.orgId}/auditLogs/${record.id}`).create(record);
  return record;
}
