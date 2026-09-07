import {
  evaluateBenchmarks,
  strategicBenchmarks,
  type BenchmarkObservation,
  type BenchmarkResult,
} from './benchmark-suite';

export interface H50MigrationArtifactSignal {
  kind:
    | 'employee_data'
    | 'policy'
    | 'procedure'
    | 'contract'
    | 'form'
    | 'document'
    | 'training'
    | 'job_description'
    | 'org_chart'
    | 'payroll_export'
    | 'legacy_hris';
  confidence: number;
  issues: string[];
  unresolvedDecisions: string[];
}

export interface H50MigrationReadiness {
  score: number;
  readyForAuthoritativeReview: boolean;
  humanDecisionQueue: string[];
  blockers: string[];
  artifactCoverage: string[];
}

export function assessH50MigrationReadiness(
  signals: H50MigrationArtifactSignal[],
): H50MigrationReadiness {
  if (signals.length === 0) {
    return {
      score: 0,
      readyForAuthoritativeReview: false,
      humanDecisionQueue: [],
      blockers: ['no migration artifacts analyzed'],
      artifactCoverage: [],
    };
  }

  for (const signal of signals) {
    if (signal.confidence < 0 || signal.confidence > 1) {
      throw new Error('migration confidence must be between 0 and 1');
    }
  }

  const blockers = signals.flatMap((signal) =>
    signal.issues.filter((issue) =>
      /(invalid|duplicate|unresolved|missing|required|cycle|ambiguous)/i.test(issue),
    ),
  );
  const humanDecisionQueue = [
    ...new Set(signals.flatMap((signal) => signal.unresolvedDecisions)),
  ];
  const averageConfidence =
    signals.reduce((sum, signal) => sum + signal.confidence, 0) /
    signals.length;
  const issuePenalty = Math.min(
    40,
    signals.reduce((sum, signal) => sum + signal.issues.length * 3, 0),
  );
  const decisionPenalty = Math.min(20, humanDecisionQueue.length * 2);
  const score = Math.max(
    0,
    Math.min(100, averageConfidence * 100 - issuePenalty - decisionPenalty),
  );

  return {
    score,
    readyForAuthoritativeReview: blockers.length === 0 && score >= 70,
    humanDecisionQueue,
    blockers,
    artifactCoverage: [...new Set(signals.map((signal) => signal.kind))],
  };
}

export interface H50ZeroConfigProposal {
  organizationStructure: string[];
  permissionProfile: string[];
  policyBaseline: string[];
  workflows: string[];
  approvals: string[];
  dashboards: string[];
  complianceBaseline: string[];
  unresolvedDecisions: string[];
  autoApplied: false;
}

export function buildH50ZeroConfigProposal(input: {
  country: string;
  industry: string;
  size: 'small' | 'mid_market' | 'enterprise';
  workforceModel: string;
  regulatoryContext: string[];
  securityProfile: string[];
  migrationSignals: H50MigrationArtifactSignal[];
}): H50ZeroConfigProposal {
  if (!input.country.trim() || !input.industry.trim() || !input.workforceModel.trim()) {
    throw new Error('organization setup context is required');
  }

  const readiness = assessH50MigrationReadiness(input.migrationSignals);

  return {
    organizationStructure: [
      `${input.industry} operating structure proposal`,
      `${input.workforceModel} workforce structure proposal`,
    ],
    permissionProfile: [
      'least-privilege role baseline',
      ...input.securityProfile.map((item) => `security:${item}`),
    ],
    policyBaseline: [
      `${input.country} employment policy baseline`,
      `${input.industry} operating policy baseline`,
    ],
    workflows: [
      'onboarding',
      'leave',
      'performance',
      'learning',
      'offboarding',
    ],
    approvals: [
      'R3 confirmation',
      'R4 independent approval',
      'R5 recorded human decision',
      'R6 specialist review + human decision',
    ],
    dashboards: [
      'My Work',
      'My Team',
      'My Organization',
      'Needs Attention',
    ],
    complianceBaseline: [
      ...input.regulatoryContext,
      'policy acknowledgement',
      'training evidence',
      'control ownership',
    ],
    unresolvedDecisions: readiness.humanDecisionQueue,
    autoApplied: false,
  };
}

export type H50PayrollInputKind =
  | 'time'
  | 'absence'
  | 'compensation'
  | 'benefit'
  | 'bonus'
  | 'expense'
  | 'new_hire'
  | 'worker_change'
  | 'termination';

export interface H50PayrollInputLine {
  workerId: string;
  kind: H50PayrollInputKind;
  amount?: number;
  hours?: number;
  approved: boolean;
  sourceRef: string;
}

export interface H50PayrollAnomaly {
  workerId: string;
  kind:
    | 'unapproved_input'
    | 'negative_amount'
    | 'negative_hours'
    | 'large_variance'
    | 'missing_source';
  severity: 'warning' | 'blocker';
  summary: string;
}

export interface H50PayrollPreflight {
  inputCount: number;
  workers: number;
  anomalies: H50PayrollAnomaly[];
  readyForApproval: boolean;
  providerHandoffAllowed: boolean;
  reconciliationRequired: true;
  glMappingRequired: true;
  payslipStatusTrackingRequired: true;
}

export function buildH50PayrollPreflight(input: {
  lines: H50PayrollInputLine[];
  previousAmountByWorker?: Readonly<Record<string, number>>;
  varianceThresholdPercent?: number;
}): H50PayrollPreflight {
  const anomalies: H50PayrollAnomaly[] = [];
  const threshold = input.varianceThresholdPercent ?? 25;

  for (const line of input.lines) {
    if (!line.sourceRef.trim()) {
      anomalies.push({
        workerId: line.workerId,
        kind: 'missing_source',
        severity: 'blocker',
        summary: 'payroll input has no source reference',
      });
    }
    if (!line.approved) {
      anomalies.push({
        workerId: line.workerId,
        kind: 'unapproved_input',
        severity: 'blocker',
        summary: 'payroll input is not approved',
      });
    }
    if (line.amount !== undefined && line.amount < 0) {
      anomalies.push({
        workerId: line.workerId,
        kind: 'negative_amount',
        severity: 'warning',
        summary: 'negative payroll amount requires review',
      });
    }
    if (line.hours !== undefined && line.hours < 0) {
      anomalies.push({
        workerId: line.workerId,
        kind: 'negative_hours',
        severity: 'blocker',
        summary: 'negative payroll hours are invalid',
      });
    }

    const previous = input.previousAmountByWorker?.[line.workerId];
    if (
      previous !== undefined &&
      previous !== 0 &&
      line.amount !== undefined
    ) {
      const variance = Math.abs((line.amount - previous) / previous) * 100;
      if (variance > threshold) {
        anomalies.push({
          workerId: line.workerId,
          kind: 'large_variance',
          severity: 'warning',
          summary: `payroll amount changed by ${variance.toFixed(1)}%`,
        });
      }
    }
  }

  const blocker = anomalies.some((item) => item.severity === 'blocker');

  return {
    inputCount: input.lines.length,
    workers: new Set(input.lines.map((line) => line.workerId)).size,
    anomalies,
    readyForApproval: !blocker,
    providerHandoffAllowed: !blocker,
    reconciliationRequired: true,
    glMappingRequired: true,
    payslipStatusTrackingRequired: true,
  };
}

export type H50IntegrationProtocol =
  | 'rest'
  | 'webhook'
  | 'graphql'
  | 'saml'
  | 'oidc'
  | 'scim'
  | 'sftp'
  | 'csv'
  | 'mcp'
  | 'a2a';

export interface H50IntegrationCapability {
  protocol: H50IntegrationProtocol;
  mode: 'operational' | 'governed_contract' | 'external_configuration_required';
  owner: string;
  tenantScoped: true;
  retries: boolean;
  reconciliation: boolean;
  healthCheck: boolean;
  credentialStatusTracked: boolean;
  notes: string;
}

export const h50IntegrationCapabilities: readonly H50IntegrationCapability[] = [
  {
    protocol: 'rest',
    mode: 'operational',
    owner: 'Integration Runtime',
    tenantScoped: true,
    retries: true,
    reconciliation: true,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Existing governed REST domain/API surfaces.',
  },
  {
    protocol: 'webhook',
    mode: 'operational',
    owner: 'Integration Runtime',
    tenantScoped: true,
    retries: true,
    reconciliation: true,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Governed event/subscription integration surface.',
  },
  {
    protocol: 'graphql',
    mode: 'governed_contract',
    owner: 'Analytics',
    tenantScoped: true,
    retries: false,
    reconciliation: false,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Read/query contract only until an analytical use case justifies transport deployment.',
  },
  {
    protocol: 'saml',
    mode: 'external_configuration_required',
    owner: 'Identity',
    tenantScoped: true,
    retries: false,
    reconciliation: false,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Enterprise IdP configuration required.',
  },
  {
    protocol: 'oidc',
    mode: 'operational',
    owner: 'Identity',
    tenantScoped: true,
    retries: false,
    reconciliation: false,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Identity/SSO foundation.',
  },
  {
    protocol: 'scim',
    mode: 'governed_contract',
    owner: 'Identity',
    tenantScoped: true,
    retries: true,
    reconciliation: true,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Provisioning contract requires provider-specific UAT.',
  },
  {
    protocol: 'sftp',
    mode: 'external_configuration_required',
    owner: 'Integration Runtime',
    tenantScoped: true,
    retries: true,
    reconciliation: true,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Provider credentials and allow-listed destination required.',
  },
  {
    protocol: 'csv',
    mode: 'operational',
    owner: 'Import / Export',
    tenantScoped: true,
    retries: true,
    reconciliation: true,
    healthCheck: true,
    credentialStatusTracked: false,
    notes: 'Controlled import/export surface.',
  },
  {
    protocol: 'mcp',
    mode: 'governed_contract',
    owner: 'Agent OS',
    tenantScoped: true,
    retries: true,
    reconciliation: true,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Tool interoperability must still pass OPSIQO permission/risk/orchestrator controls.',
  },
  {
    protocol: 'a2a',
    mode: 'governed_contract',
    owner: 'Agent OS',
    tenantScoped: true,
    retries: true,
    reconciliation: true,
    healthCheck: true,
    credentialStatusTracked: true,
    notes: 'Agent-to-agent interoperability cannot bypass authoritative services.',
  },
] as const;

export interface H50IndustryPack {
  packId: string;
  name: string;
  version: string;
  publisher: 'OPSIQO';
  permissions: string[];
  dataAccess: string[];
  dependencies: string[];
  components: string[];
  validationStatus: 'draft' | 'uat_validated' | 'production_approved';
  rollbackMetadata: {
    supported: true;
    strategy: string;
  };
}

export const h50FirstPartyIndustryPacks: readonly H50IndustryPack[] = [
  pack('ontario-healthcare', 'Ontario Healthcare', [
    'policy templates',
    'safety/compliance controls',
    'learning requirements',
    'workflows',
  ]),
  pack('ontario-nonprofit', 'Ontario Nonprofit', [
    'volunteer onboarding',
    'grant workforce controls',
    'policy templates',
    'governance workflows',
  ]),
  pack('retail-scheduling', 'Retail Scheduling', [
    'schedule workflows',
    'time/leave controls',
    'manager dashboards',
  ]),
  pack('construction-safety', 'Construction Safety', [
    'safety controls',
    'training requirements',
    'incident workflows',
  ]),
  pack('restaurant-workforce', 'Restaurant Workforce', [
    'shift workflows',
    'time/leave controls',
    'frontline learning',
  ]),
  pack('humanitarian-ngo', 'Humanitarian NGO', [
    'grant workforce controls',
    'field safety',
    'training',
    'multi-location onboarding',
  ]),
] as const;

export type H50TrustControlState =
  | 'implemented'
  | 'evidence_required'
  | 'external_assurance_required';

export interface H50TrustControl {
  id: string;
  name: string;
  state: H50TrustControlState;
  evidence: string[];
}

export const h50TrustControls: readonly H50TrustControl[] = [
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    state: 'external_assurance_required',
    evidence: ['security controls', 'audit trail', 'reliability evidence'],
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    state: 'external_assurance_required',
    evidence: ['security operations', 'risk register', 'access governance'],
  },
  {
    id: 'iso42001',
    name: 'ISO/IEC 42001',
    state: 'external_assurance_required',
    evidence: ['AI governance', 'risk tiers', 'human decision controls'],
  },
  {
    id: 'pia',
    name: 'Privacy impact assessment',
    state: 'evidence_required',
    evidence: ['privacy controls', 'data inventory'],
  },
  {
    id: 'penetration-test',
    name: 'Independent penetration testing',
    state: 'external_assurance_required',
    evidence: ['scope', 'remediation record'],
  },
  {
    id: 'sast-dast',
    name: 'SAST / DAST / dependency scanning',
    state: 'evidence_required',
    evidence: ['static scan', 'dependency review', 'DAST run'],
  },
  {
    id: 'sbom-provenance',
    name: 'SBOM and provenance',
    state: 'implemented',
    evidence: ['source manifest', 'SBOM', 'exact-tree release evidence'],
  },
  {
    id: 'tenant-isolation',
    name: 'Tenant isolation',
    state: 'implemented',
    evidence: ['Rules tests', 'tenant checks'],
  },
  {
    id: 'mfa-sso-scim',
    name: 'MFA / SSO / SCIM',
    state: 'evidence_required',
    evidence: ['MFA', 'identity governance', 'provider UAT'],
  },
  {
    id: 'dr',
    name: 'PITR and disaster recovery',
    state: 'evidence_required',
    evidence: ['DR capture', 'timed recovery exercise'],
  },
  {
    id: 'data-residency',
    name: 'Data residency and retention',
    state: 'evidence_required',
    evidence: ['retention policy', 'regional architecture'],
  },
  {
    id: 'dlp-appcheck',
    name: 'DLP and App Check',
    state: 'evidence_required',
    evidence: ['endpoint coverage', 'sensitive-data controls'],
  },
] as const;

export interface H50ReliabilityObservation {
  availabilityPercent: number;
  criticalApiP95Ms: number;
  simpleAiP95Ms: number;
  transactionIdempotencyPercent: number;
  tenantIsolationPassPercent: number;
  rpoMinutes: number;
  rtoMinutes: number;
  consequentialAuditPercent: number;
  reconciliationVisibilityPercent: number;
  accessibilityWcag22Aa: boolean;
}

export function evaluateH50Reliability(
  observation: H50ReliabilityObservation,
): Record<keyof H50ReliabilityObservation, boolean> {
  return {
    availabilityPercent: observation.availabilityPercent >= 99.95,
    criticalApiP95Ms: observation.criticalApiP95Ms < 500,
    simpleAiP95Ms: observation.simpleAiP95Ms < 3000,
    transactionIdempotencyPercent:
      observation.transactionIdempotencyPercent === 100,
    tenantIsolationPassPercent:
      observation.tenantIsolationPassPercent === 100,
    rpoMinutes: observation.rpoMinutes <= 15,
    rtoMinutes: observation.rtoMinutes <= 60,
    consequentialAuditPercent:
      observation.consequentialAuditPercent === 100,
    reconciliationVisibilityPercent:
      observation.reconciliationVisibilityPercent === 100,
    accessibilityWcag22Aa: observation.accessibilityWcag22Aa,
  };
}

export const h50MobileFeatures = [
  'clock',
  'schedule',
  'shift_swap',
  'leave',
  'payslip',
  'documents',
  'announcements',
  'approvals',
  'tasks',
  'learning',
  'profile',
  'ai_assistant',
  'voice',
  'push_notifications',
  'manager_actions',
  'selective_offline',
] as const;

export type H50VoiceIntent =
  | 'leave'
  | 'absence'
  | 'schedule'
  | 'approval'
  | 'policy'
  | 'staffing'
  | 'task'
  | 'unknown';

export function classifyH50VoiceIntent(transcript: string): {
  intent: H50VoiceIntent;
  directExecutionPermitted: false;
} {
  const normalized = transcript.toLowerCase();

  let intent: H50VoiceIntent = 'unknown';
  if (/(leave|vacation|time off)/.test(normalized)) intent = 'leave';
  else if (/(absence|absent|sick)/.test(normalized)) intent = 'absence';
  else if (/(schedule|shift)/.test(normalized)) intent = 'schedule';
  else if (/(approve|approval)/.test(normalized)) intent = 'approval';
  else if (/(policy|procedure)/.test(normalized)) intent = 'policy';
  else if (/(staffing|headcount|vacanc)/.test(normalized)) intent = 'staffing';
  else if (/(task|to do|todo)/.test(normalized)) intent = 'task';

  return {
    intent,
    directExecutionPermitted: false,
  };
}

export interface H50HumanBenchmark {
  task: string;
  opsiqoSeconds: number;
  legacyNavigationSeconds: number;
  opsiqoClicks: number;
  legacyNavigationClicks: number;
}

export function evaluateH50HumanBenchmark(
  input: H50HumanBenchmark,
): {
  faster: boolean;
  fewerClicks: boolean;
  timeImprovementPercent: number;
  clickImprovementPercent: number;
} {
  if (
    input.opsiqoSeconds <= 0 ||
    input.legacyNavigationSeconds <= 0 ||
    input.opsiqoClicks < 0 ||
    input.legacyNavigationClicks <= 0
  ) {
    throw new Error('human benchmark observations are invalid');
  }

  return {
    faster: input.opsiqoSeconds < input.legacyNavigationSeconds,
    fewerClicks: input.opsiqoClicks < input.legacyNavigationClicks,
    timeImprovementPercent:
      ((input.legacyNavigationSeconds - input.opsiqoSeconds) /
        input.legacyNavigationSeconds) *
      100,
    clickImprovementPercent:
      ((input.legacyNavigationClicks - input.opsiqoClicks) /
        input.legacyNavigationClicks) *
      100,
  };
}

export const h50NorthStarKpis = [
  'time_to_first_value',
  'human_effort_per_transaction',
  'conversational_completion_rate',
  'human_override_rate',
  'ai_evidence_coverage',
  'workflow_exception_rate',
  'compliance_closure_lead_time',
  'manager_task_completion_time',
  'self_service_resolution_rate',
  'configuration_without_code',
] as const;

export function buildH50BenchmarkReport(
  observations: BenchmarkObservation[],
): {
  targets: typeof strategicBenchmarks;
  results: BenchmarkResult[];
  passed: number;
  failed: number;
  missing: number;
} {
  const results = evaluateBenchmarks(observations);

  return {
    targets: strategicBenchmarks,
    results,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter(
      (result) => !result.passed && Number.isFinite(result.observed),
    ).length,
    missing: results.filter((result) => !Number.isFinite(result.observed))
      .length,
  };
}

function pack(
  packId: string,
  name: string,
  components: string[],
): H50IndustryPack {
  return {
    packId,
    name,
    version: '1.0.0-draft',
    publisher: 'OPSIQO',
    permissions: ['organization.read'],
    dataAccess: ['tenant-scoped configuration only'],
    dependencies: ['OPSIQO governance', 'workflow engine'],
    components,
    validationStatus: 'draft',
    rollbackMetadata: {
      supported: true,
      strategy: 'restore previous governed configuration version',
    },
  };
}
