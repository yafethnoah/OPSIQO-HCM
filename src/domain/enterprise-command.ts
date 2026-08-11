export type EnterpriseDomainKey =
  | 'lifecycle'
  | 'hr_diagnostic'
  | 'governance'
  | 'regulatory'
  | 'assurance'
  | 'privacy_ai'
  | 'resilience'
  | 'strategy'
  | 'org_design'
  | 'integration'
  | 'identity'
  | 'security_ops'
  | 'platform_reliability';

export type EnterpriseRiskStatus = 'low' | 'medium' | 'high' | 'critical';
export type EnterpriseReadinessLevel = 'fragile' | 'developing' | 'controlled' | 'strategic';
export type EnterpriseLifecycle = 'draft' | 'in_review' | 'approved' | 'retired';

export interface EnterpriseRiskNode {
  key: EnterpriseDomainKey;
  label: string;
  href: string;
  readinessScore: number;
  status: EnterpriseRiskStatus;
  open: number;
  overdue: number;
  highCritical: number;
  weight: number;
  summary: string;
}

export interface EnterpriseRiskEdge {
  from: EnterpriseDomainKey;
  to: EnterpriseDomainKey;
  reason: string;
}

export interface EnterpriseHcmIndex {
  score: number;
  level: EnterpriseReadinessLevel;
  explanation: string;
}

export interface CommandCenterActionTask {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
  completedBy?: string;
}

export interface CommandCenterActionPlan {
  id: string;
  code: string;
  title: string;
  sourceDomain: EnterpriseDomainKey;
  sourceEntityType?: string;
  sourceEntityId?: string;
  sourceHref: string;
  priority: EnterpriseRiskStatus;
  ownerRole: string;
  dueDate: string;
  objective: string;
  successMeasure: string;
  tasks: CommandCenterActionTask[];
  status: 'draft' | 'in_review' | 'approved' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  consequentialActionProhibited: true;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  closedBy?: string;
  closedAt?: string;
}

export interface CommandCenterDataQualitySnapshot {
  id: string;
  snapshotDate: string;
  score: number;
  critical: number;
  high: number;
  warning: number;
  info: number;
  sampled: boolean;
  sampleLimit: number;
  findingIds: string[];
  operationalIndicatorOnly: true;
  createdBy: string;
  createdAt: string;
}

export interface CommandCenterSlo {
  id: string;
  code: string;
  name: string;
  category: 'availability' | 'latency' | 'automation' | 'data_quality' | 'security' | 'other';
  unit: 'percent' | 'milliseconds' | 'minutes' | 'count';
  direction: 'higher_better' | 'lower_better';
  target: number;
  current: number;
  tolerance: number;
  measurementWindow: string;
  measurementSource: string;
  ownerRole: string;
  nextReviewDate: string;
  breach: boolean;
  status: EnterpriseLifecycle;
  operationalIndicatorOnly: true;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export type ReleaseGateStatus = 'pending' | 'passed' | 'failed' | 'not_run';
export interface CommandCenterReleaseAssessment {
  id: string;
  releaseVersion: string;
  environment: 'staging' | 'production';
  assessedAt: string;
  readinessOkay: boolean;
  readinessFailedChecks: string[];
  dependencyInstall: ReleaseGateStatus;
  typecheck: ReleaseGateStatus;
  tests: ReleaseGateStatus;
  rulesTests: ReleaseGateStatus;
  build: ReleaseGateStatus;
  aiGovernance: ReleaseGateStatus;
  lifecycleUat: ReleaseGateStatus;
  ciEvidenceUrl?: string;
  notes: string;
  gateStatus: 'blocked' | 'ready';
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  createdBy: string;
  createdAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CommandCenterReport {
  id: string;
  title: string;
  reportingDate: string;
  audience: 'executive' | 'board' | 'hr_leadership' | 'audit_risk_committee';
  enterpriseIndex: EnterpriseHcmIndex;
  domainRisks: EnterpriseRiskNode[];
  actionMetrics: { open: number; overdue: number; highCritical: number };
  dataQualityScore: number;
  sloBreaches: number;
  releaseGateStatus: 'blocked' | 'ready' | 'not_assessed';
  commentary: string;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  operationalIndicatorOnly: true;
  createdBy: string;
  createdAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface EnterpriseCommandDashboard {
  enterpriseIndex: EnterpriseHcmIndex;
  riskNodes: EnterpriseRiskNode[];
  riskEdges: EnterpriseRiskEdge[];
  actions: CommandCenterActionPlan[];
  dataQualitySnapshots: CommandCenterDataQualitySnapshot[];
  slos: CommandCenterSlo[];
  releaseAssessments: CommandCenterReleaseAssessment[];
  reports: CommandCenterReport[];
  notifications: Array<{ id: string; title: string; message: string; priority?: string; createdAt: string; status: string }>;
  metrics: {
    highCriticalDomains: number;
    openActions: number;
    overdueActions: number;
    highCriticalActions: number;
    dataQualityScore: number;
    sloBreaches: number;
    unreadNotifications: number;
    releaseGateStatus: 'blocked' | 'ready' | 'not_assessed';
  };
  operatingNotice: string;
  generatedAt: string;
}
