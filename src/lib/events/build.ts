import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { DomainEvent, DomainEventType } from '@/domain/automation';

export function buildDomainEvent(
  actor: ActorContext,
  type: DomainEventType,
  entityType: string,
  entityId: string,
  payload?: Record<string, unknown>,
): DomainEvent {
  const timestamp = new Date().toISOString();
  return {
    id: randomUUID(),
    orgId: actor.orgId,
    type,
    entityType,
    entityId,
    actorUid: actor.uid,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
