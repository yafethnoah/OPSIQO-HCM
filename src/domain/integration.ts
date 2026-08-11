export type IntegrationCategory = 'hris' | 'payroll' | 'identity' | 'finance' | 'benefits' | 'learning' | 'recruiting' | 'time' | 'custom';
export type IntegrationProtocol = 'rest_json' | 'scim2' | 'webhook' | 'sftp' | 'file' | 'custom';
export type IntegrationDirection = 'inbound' | 'outbound' | 'bidirectional';
export type IntegrationRisk = 'low' | 'medium' | 'high' | 'critical';
export type IntegrationLifecycle = 'draft' | 'in_review' | 'approved' | 'active' | 'paused' | 'retired';

export interface IntegrationConnector {
  id: string;
  code: string;
  name: string;
  category: IntegrationCategory;
  protocol: IntegrationProtocol;
  direction: IntegrationDirection;
  baseUrl?: string;
  authMode: 'none' | 'oauth2_client_credentials' | 'api_key' | 'bearer' | 'hmac_secret' | 'mtls' | 'basic';
  secretRef?: string;
  ownerRole: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  systemOfRecordFor: string[];
  standardProfile: 'none' | 'scim2' | 'cloudevents_1_0' | 'custom';
  timeoutMs: number;
  maxBatchSize: number;
  idempotencyRequired: boolean;
  reconciliationRequired: boolean;
  mutationMode: 'staging_only';
  status: IntegrationLifecycle;
  health: 'unknown' | 'healthy' | 'degraded' | 'failing';
  lastHealthCheckAt?: string;
  lastHealthMessage?: string;
  consequentialWorkerMutationProhibited: true;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface IntegrationFieldMapping {
  source: string;
  target: string;
  required: boolean;
  transform?: 'none' | 'trim' | 'lowercase' | 'uppercase' | 'date_iso' | 'number';
}

export interface IntegrationContract {
  id: string;
  code: string;
  name: string;
  entityType: string;
  direction: 'inbound' | 'outbound';
  schemaVersion: string;
  schemaDialect: 'https://json-schema.org/draft/2020-12/schema';
  validationProfile: 'opsiqo-json-schema-subset-v1';
  jsonSchema: Record<string, unknown>;
  fieldMappings: IntegrationFieldMapping[];
  standardProfile: 'none' | 'scim2' | 'cloudevents_1_0' | 'custom';
  compatibility: 'compatible' | 'breaking';
  compatibilityNotes: string;
  status: 'draft' | 'in_review' | 'approved' | 'retired';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface IntegrationRun {
  id: string;
  connectorId: string;
  contractId: string;
  direction: 'inbound' | 'outbound';
  mode: 'scheduled' | 'manual' | 'replay' | 'test' | 'webhook';
  idempotencyHash: string;
  correlationId: string;
  traceId: string;
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'dead_lettered';
  recordsReceived: number;
  recordsAccepted: number;
  recordsRejected: number;
  payloadHash?: string;
  reconciliationStatus: 'not_required' | 'pending' | 'matched' | 'variance' | 'failed';
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  mutationMode: 'staging_only';
  startedBy: string;
  startedAt: string;
  completedAt?: string;
}


export interface IntegrationStagingRecord {
  id: string;
  runId: string;
  connectorId: string;
  contractId: string;
  direction: 'inbound' | 'outbound';
  recordKeyHash: string;
  payloadHash: string;
  validationStatus: 'valid' | 'invalid';
  validationIssues: Array<{path:string;code:string;message:string}>;
  data?: unknown;
  status: 'staged' | 'acknowledged' | 'rejected' | 'expired';
  domainMutationRequired: true;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationDeadLetter {
  id: string;
  runId: string;
  connectorId: string;
  contractId: string;
  recordKeyHash: string;
  errorCode: string;
  errorMessage: string;
  attempts: number;
  status: 'open' | 'requeued' | 'resolved' | 'discarded';
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface IntegrationReconciliation {
  id: string;
  runId: string;
  connectorId: string;
  contractId: string;
  expectedCount: number;
  actualCount: number;
  matchedCount: number;
  missingCount: number;
  extraCount: number;
  fieldMismatchCount: number;
  variancePct: number;
  status: 'matched' | 'variance' | 'failed';
  reviewStatus: 'open' | 'in_review' | 'accepted' | 'resolved';
  rationale?: string;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface IntegrationEventEnvelope {
  id: string;
  specversion: '1.0';
  type: string;
  source: string;
  subject?: string;
  time: string;
  datacontenttype: 'application/json';
  dataschema?: string;
  correlationId: string;
  traceId: string;
  dataRef?: string;
  payloadHash?: string;
  connectorId: string;
  runId?: string;
  createdAt: string;
}

export interface IntegrationDashboard {
  connectors: IntegrationConnector[];
  contracts: IntegrationContract[];
  runs: IntegrationRun[];
  stagingRecords: IntegrationStagingRecord[];
  deadLetters: IntegrationDeadLetter[];
  reconciliations: IntegrationReconciliation[];
  events: IntegrationEventEnvelope[];
  metrics: {
    approvedConnectors: number;
    activeConnectors: number;
    degradedFailingConnectors: number;
    approvedContracts: number;
    failedRuns24h: number;
    successRate30d: number;
    averageLatencyMs: number;
    stagedRecords: number;
    rejectedStagingRecords: number;
    openDeadLetters: number;
    reconciliationVariances: number;
    activeRuntimeProfiles: number;
    openRuntimeCircuits: number;
    overdueRuntimeSchedules: number;
    rejectedWebhookReceipts24h: number;
    readinessScore: number;
    readinessLevel: 'fragile' | 'developing' | 'controlled' | 'resilient';
  };
  standards: Array<{name:string;version:string;purpose:string}>;
  operatingNotice: string;
  generatedAt: string;
}
