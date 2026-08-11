export type IntegrationAdapterKind =
  | 'rest_pull'
  | 'rest_push'
  | 'scim_users'
  | 'scim_groups'
  | 'webhook_hmac'
  | 'file_json'
  | 'sftp_json';

export type IntegrationDeltaMode = 'none' | 'cursor' | 'etag' | 'scim_start_index';
export type IntegrationRuntimeLifecycle = 'draft' | 'in_review' | 'approved' | 'active' | 'paused' | 'retired';
export type IntegrationCircuitStatus = 'closed' | 'open' | 'half_open';

export interface IntegrationRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOn429: boolean;
  retryOn5xx: boolean;
}

export interface IntegrationCircuitBreakerPolicy {
  failureThreshold: number;
  resetAfterMs: number;
}

export interface IntegrationAdapterProfile {
  id: string;
  code: string;
  name: string;
  connectorId: string;
  contractId: string;
  adapterKind: IntegrationAdapterKind;
  resourcePath?: string;
  recordsPath?: string;
  recordKeyPath?: string;
  cursorPath?: string;
  cursorParam?: string;
  deltaMode: IntegrationDeltaMode;
  requestMethod: 'GET' | 'POST' | 'PUT' | 'PATCH';
  staticHeaders: Record<string,string>;
  fileObjectPath?: string;
  sftpRemotePath?: string;
  retryPolicy: IntegrationRetryPolicy;
  circuitBreaker: IntegrationCircuitBreakerPolicy;
  status: IntegrationRuntimeLifecycle;
  transportAvailability: 'built_in' | 'external_provider_required';
  consequentialWorkerMutationProhibited: true;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface IntegrationRuntimeState {
  id: string;
  profileId: string;
  connectorId: string;
  cursor?: string;
  etag?: string;
  scimStartIndex?: number;
  circuitStatus: IntegrationCircuitStatus;
  consecutiveFailures: number;
  openUntil?: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  lastRunId?: string;
  updatedAt: string;
}

export interface IntegrationSchedule {
  id: string;
  code: string;
  name: string;
  profileId: string;
  cadence: 'interval' | 'daily';
  intervalMinutes?: number;
  dailyTimeUtc?: string;
  nextRunAt: string;
  status: 'draft' | 'in_review' | 'approved' | 'active' | 'paused' | 'retired';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  lastRunAt?: string;
  lastRunId?: string;
  lastStatus?: 'succeeded' | 'partial' | 'failed' | 'blocked';
  lastMessage?: string;
  leaseUntil?: string;
  leaseTokenHash?: string;
}

export interface IntegrationWebhookReceipt {
  id: string;
  connectorId: string;
  profileId: string;
  contractId: string;
  signatureHash: string;
  timestamp: string;
  receivedAt: string;
  runId?: string;
  status: 'accepted' | 'rejected' | 'duplicate';
  recordCount: number;
  errorCode?: string;
}

export interface IntegrationReplayRequest {
  id: string;
  sourceRunId: string;
  profileId: string;
  rationale: string;
  status: 'draft' | 'in_review' | 'approved' | 'executed' | 'rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  executedBy?: string;
  executedAt?: string;
  replayRunId?: string;
}

export interface IntegrationSandboxResult {
  id: string;
  profileId: string;
  connectorId: string;
  contractId: string;
  status: 'passed' | 'failed';
  endpointValidated: boolean;
  secretReferenceValidated: boolean;
  mappingValidated: boolean;
  contractValidated: boolean;
  transportAvailability: 'available' | 'provider_required';
  issueCodes: string[];
  executedBy: string;
  executedAt: string;
}

export interface IntegrationRuntimeDashboard {
  profiles: IntegrationAdapterProfile[];
  schedules: IntegrationSchedule[];
  states: IntegrationRuntimeState[];
  webhookReceipts: IntegrationWebhookReceipt[];
  replayRequests: IntegrationReplayRequest[];
  sandboxResults: IntegrationSandboxResult[];
  metrics: {
    activeProfiles: number;
    activeSchedules: number;
    openCircuits: number;
    overdueSchedules: number;
    webhookReceipts24h: number;
    rejectedWebhookReceipts24h: number;
    pendingReplayApprovals: number;
    sandboxFailures30d: number;
  };
  operatingNotice: string;
  generatedAt: string;
}
