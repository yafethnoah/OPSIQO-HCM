import type { OpsiQoActionLevel } from './opsiqo-one';

export interface OpsiQoAgentPolicy {
  agentId: string;
  enabled: boolean;
  maxActionLevel: OpsiQoActionLevel;
  shadowMode: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface OpsiQoEffectiveAgentPolicy extends OpsiQoAgentPolicy {
  agentName: string;
  purpose: string;
  hardMaxActionLevel: OpsiQoActionLevel;
  humanOversight: boolean;
  capabilities: string[];
  editable: boolean;
}

export interface OpsiQoCortexStep {
  id: string;
  agentId: string;
  agentName: string;
  actionLevel: OpsiQoActionLevel;
  title: string;
  description: string;
  status: 'planned' | 'blocked';
  reason?: string;
}

export interface OpsiQoCortexPlan {
  id: string;
  command: string;
  agents: string[];
  steps: OpsiQoCortexStep[];
  effectiveMaxActionLevel: OpsiQoActionLevel;
  shadowMode: boolean;
  requiresHumanCheckpoint: boolean;
  executionBoundary: string;
  createdAt: string;
}

export interface OpsiQoExplainability {
  evidence: string[];
  policy: string[];
  reasoningSummary: string;
  missingInformation: string[];
  confidence: number;
  humanDecisionRequired: boolean;
  limitations: string[];
}

export interface IntelligentFormField {
  id: string;
  label: string;
  value?: string | number;
  required: boolean;
  status: 'prefilled' | 'missing' | 'optional';
  source?: string;
  explanation: string;
}

export interface IntelligentFormPreview {
  kind: 'leave_request' | 'onboarding' | 'position' | 'workflow' | 'hr_service';
  title: string;
  fields: IntelligentFormField[];
  knownCount: number;
  missingRequiredCount: number;
  note: string;
}

export interface NaturalAnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit: 'count' | 'fte' | 'currency' | 'percent';
  helper: string;
  evidenceRef: string;
  change?: number;
}

export interface NaturalAnalyticsAnswer {
  question: string;
  summary: string;
  metrics: NaturalAnalyticsMetric[];
  dataQualityScore: number;
  warnings: string[];
  historyPoints: number;
  generatedAt: string;
  governanceNotice: string;
}

export interface ComplianceRadarItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'info' | 'good';
  title: string;
  summary: string;
  count?: number;
  href: string;
  evidence: string[];
  suggestedActions: Array<{label:string;href:string}>;
}

export interface ComplianceRadarDashboard {
  status: 'not_assessed' | 'attention_required' | 'watch' | 'healthy';
  headline: string;
  metrics: {
    workers: number;
    requirements: number;
    complianceRate: number | null;
    gaps: number;
    expiring: number;
    policiesDue: number;
    policiesOverdue: number;
  };
  items: ComplianceRadarItem[];
  workerGaps: Array<{workerId:string;displayName:string;employeeNumber:string;gaps:number;expiring:number;score:number|null}>;
  generatedAt: string;
  governanceNotice: string;
}

export interface EmployeeConciergeDashboard {
  employee: {displayName:string;position?:string;orgUnit?:string;manager?:string;linked:boolean};
  services: Array<{id:string;code:string;name:string;description:string;category:string}>;
  knowledge: Array<{id:string;title:string;summary:string;category:string}>;
  quickActions: Array<{label:string;description:string;href:string;permission?:string}>;
  openHrRequests: number;
  pendingLeaveRequests: number;
  leaveAvailableHours: number;
  generatedAt: string;
  privacyNotice: string;
}

export interface ManagerCopilotDashboard {
  managerWorkerId?: string;
  teamSize: number;
  priorities: Array<{title:string;summary:string;severity:string;href:string;dueAt?:string}>;
  team: Array<{workerId:string;displayName:string;employeeNumber:string;status:string;positionTitle?:string;orgUnitName?:string}>;
  oneOnOnePreparation: string[];
  suggestedActions: Array<{label:string;href:string;reason:string}>;
  generatedAt: string;
  governanceNotice: string;
}
