import type {
  DomainEventEnvelope,
  EnterpriseObjectMeta,
  EvidenceRef,
} from './types';

export interface EnterpriseObject<TData = Record<string, unknown>> {
  meta: EnterpriseObjectMeta;
  data: TData;
}

export interface EnterpriseRelationship {
  relationshipId: string;
  orgId: string;
  fromObjectId: string;
  fromObjectType: string;
  relationshipType: string;
  toObjectId: string;
  toObjectType: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  evidenceRefs: EvidenceRef[];
}

export function assertCanonicalObject(meta: EnterpriseObjectMeta): void {
  if (!meta.objectId.trim()) throw new Error('objectId is required');
  if (!meta.orgId.trim()) throw new Error('orgId is required');
  if (!meta.objectType.trim()) throw new Error('objectType is required');
  if (!Number.isInteger(meta.version) || meta.version < 1) {
    throw new Error('version must be an integer >= 1');
  }
  if (!Number.isInteger(meta.schemaVersion) || meta.schemaVersion < 1) {
    throw new Error('schemaVersion must be an integer >= 1');
  }
  if (!meta.etag.trim()) throw new Error('etag is required');
  if (!isIsoLike(meta.effectiveFrom)) throw new Error('effectiveFrom must be ISO-like');
  if (meta.effectiveTo && !isIsoLike(meta.effectiveTo)) {
    throw new Error('effectiveTo must be ISO-like');
  }
  if (meta.effectiveTo && meta.effectiveTo < meta.effectiveFrom) {
    throw new Error('effectiveTo cannot precede effectiveFrom');
  }
}

export function assertTenantScope(
  expectedOrgId: string,
  ...orgScoped: Array<{ orgId: string }>
): void {
  for (const value of orgScoped) {
    if (value.orgId !== expectedOrgId) {
      throw new Error('cross-organization access is forbidden');
    }
  }
}

export function assertOptimisticVersion(
  current: EnterpriseObjectMeta,
  expectedVersion: number,
  expectedEtag?: string,
): void {
  if (current.version !== expectedVersion) {
    throw new Error('optimistic concurrency version conflict');
  }
  if (expectedEtag !== undefined && current.etag !== expectedEtag) {
    throw new Error('optimistic concurrency etag conflict');
  }
}

export function isEffectiveAt(
  meta: EnterpriseObjectMeta,
  instant: string,
): boolean {
  if (instant < meta.effectiveFrom) return false;
  if (meta.effectiveTo && instant >= meta.effectiveTo) return false;
  return meta.lifecycleStatus === 'active';
}

export function validateRelationship(
  relationship: EnterpriseRelationship,
): void {
  if (!relationship.relationshipId.trim()) {
    throw new Error('relationshipId is required');
  }
  if (!relationship.orgId.trim()) throw new Error('orgId is required');
  if (!relationship.fromObjectId.trim() || !relationship.toObjectId.trim()) {
    throw new Error('relationship endpoints are required');
  }
  if (!relationship.relationshipType.trim()) {
    throw new Error('relationshipType is required');
  }
  if (
    relationship.effectiveTo &&
    relationship.effectiveTo < relationship.effectiveFrom
  ) {
    throw new Error('relationship effective dates are invalid');
  }
}

export function nextVersion(
  current: EnterpriseObjectMeta,
  input: {
    updatedAt: string;
    updatedBy: EnterpriseObjectMeta['updatedBy'];
    etag: string;
    evidenceRefs?: EvidenceRef[];
  },
): EnterpriseObjectMeta {
  return {
    ...current,
    version: current.version + 1,
    etag: input.etag,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy,
    evidenceRefs: input.evidenceRefs ?? current.evidenceRefs,
  };
}

export function toDomainEvent<TData>(input: {
  eventId: string;
  type: string;
  source: string;
  object: EnterpriseObject<TData>;
  time: string;
  correlationId: string;
  causationId?: string;
}): DomainEventEnvelope<TData> {
  return {
    eventId: input.eventId,
    specversion: '1.0',
    type: input.type,
    source: input.source,
    subject: `${input.object.meta.objectType}/${input.object.meta.objectId}`,
    time: input.time,
    orgId: input.object.meta.orgId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    schemaVersion: input.object.meta.schemaVersion,
    data: input.object.data,
    evidenceRefs: input.object.meta.evidenceRefs,
  };
}

function isIsoLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}
