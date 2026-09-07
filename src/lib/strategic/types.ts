export type StrategicRiskTier = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6';

export type StrategicPhaseId =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;

export type LifecycleStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'superseded'
  | 'archived';

export interface EvidenceRef {
  id: string;
  sourceType: string;
  sourceId: string;
  observedAt: string;
  uri?: string;
  contentHash?: string;
}

export interface ActorRef {
  actorType: 'user' | 'service' | 'agent' | 'system';
  actorId: string;
}

export interface EnterpriseObjectMeta {
  objectId: string;
  orgId: string;
  objectType: string;
  lifecycleStatus: LifecycleStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
  etag: string;
  schemaVersion: number;
  evidenceRefs: EvidenceRef[];
  createdAt: string;
  createdBy: ActorRef;
  updatedAt: string;
  updatedBy: ActorRef;
}

export interface AuditEnvelope<TBefore = unknown, TAfter = unknown> {
  auditId: string;
  orgId: string;
  actor: ActorRef;
  occurredAt: string;
  action: string;
  reason: string;
  objectType: string;
  objectId: string;
  before?: TBefore;
  after?: TAfter;
  evidenceRefs: EvidenceRef[];
  correlationId: string;
}

export interface DomainEventEnvelope<TData = unknown> {
  eventId: string;
  specversion: '1.0';
  type: string;
  source: string;
  subject: string;
  time: string;
  orgId: string;
  correlationId: string;
  causationId?: string;
  schemaVersion: number;
  data: TData;
  evidenceRefs: EvidenceRef[];
}

export interface ExplainableOutput<T = unknown> {
  output: T;
  confidence: number;
  evidenceRefs: EvidenceRef[];
  assumptions: string[];
  limitations: string[];
  model?: {
    provider: string;
    model: string;
    version?: string;
  };
  generatedAt: string;
}

export interface PermissionDecision {
  allowed: boolean;
  checkedAt: string;
  permission: string;
  objectType?: string;
  objectId?: string;
  field?: string;
  reason?: string;
}

export interface StrategicPhaseDefinition {
  id: StrategicPhaseId;
  name: string;
  objective: string;
  existingCapabilities: readonly string[];
  requiredControls: readonly string[];
}
