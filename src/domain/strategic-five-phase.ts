export type StrategicFivePhaseId = 1 | 2 | 3 | 4 | 5;
export type StrategicCapabilityState = 'implemented' | 'partial' | 'missing';
export type GccCountryCode = 'SA' | 'AE';
export type CountryPackStatus = 'draft' | 'validation' | 'approved' | 'active' | 'archived';
export type AgentActionClass = 'green' | 'amber' | 'red';
export type AutopilotLevel = 1 | 2 | 3 | 4 | 5;
export type MetricStatus = 'draft' | 'approved' | 'deprecated';

export interface StrategicChecklistItem {
  id: string;
  label: string;
  state: StrategicCapabilityState;
  evidence?: string;
}

export interface StrategicFivePhaseAssessment {
  id: StrategicFivePhaseId;
  name: string;
  objective: string;
  score: number;
  status: 'advanced' | 'in_progress' | 'major_gap';
  checklist: StrategicChecklistItem[];
}

export interface StrategicCountryPack {
  country: GccCountryCode;
  name: string;
  version: string;
  status: CountryPackStatus;
  officialSources: string[];
  statutoryRuleSetRef?: string;
  legalReviewRef?: string;
  payrollValidationRef?: string;
  goldenTestEvidenceRef?: string;
  arabicQaEvidenceRef?: string;
  governmentConnectorEvidenceRef?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface StrategicMetricDefinition {
  id: string;
  code: string;
  name: string;
  businessDefinition: string;
  formula: string;
  grain: string;
  sourceEntities: string[];
  owner: string;
  freshnessSlaMinutes: number;
  status: MetricStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface StrategicAgentActionPolicy {
  key: string;
  label: string;
  actionClass: AgentActionClass;
  minimumAutopilotLevel: AutopilotLevel;
  humanApprovalRequired: boolean;
  hardBoundary: string;
}

export interface StrategicAutomationPolicy {
  autopilotLevel: AutopilotLevel;
  updatedBy?: string;
  updatedAt?: string;
}

export interface StrategicFivePhaseDashboard {
  generatedAt: string;
  phases: StrategicFivePhaseAssessment[];
  overallScore: number;
  countryPacks: StrategicCountryPack[];
  metricRegistryCount: number;
  approvedMetricCount: number;
  automationPolicy: StrategicAutomationPolicy;
  actionPolicies: StrategicAgentActionPolicy[];
  guardrails: string[];
  nextPriorities: string[];
}