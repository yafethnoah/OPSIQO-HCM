import type { ActorContext } from '@/domain/security';
import type { AuditLog } from '@/domain/audit';
import { adminDb } from '@/lib/firebase/admin';

export interface AuditFilters {
  limit?: number;
  action?: string;
  entityType?: string;
  actorUid?: string;
  from?: string;
  to?: string;
}

export async function listAudit(actor: ActorContext, filters: AuditFilters = {}) {
  const safeLimit = Math.max(1, Math.min(filters.limit || 100, 500));
  const fetchLimit = Math.min(1000, Math.max(safeLimit, 250));
  const snap = await adminDb()
    .collection(`organizations/${actor.orgId}/auditLogs`)
    .orderBy('createdAt', 'desc')
    .limit(fetchLimit)
    .get();
  return snap.docs.map((d) => d.data() as AuditLog).filter((a) => {
    if (filters.action && !a.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
    if (filters.entityType && a.entityType !== filters.entityType) return false;
    if (filters.actorUid && a.actorUid !== filters.actorUid) return false;
    if (filters.from && a.createdAt < filters.from) return false;
    if (filters.to && a.createdAt > filters.to) return false;
    return true;
  }).slice(0, safeLimit);
}
