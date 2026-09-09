import type { Permission, Role } from '@/domain/security';

export type IntelligenceSensitivity = 'public'|'internal'|'confidential'|'restricted';
export type VerificationStatus = 'verified'|'corroborated'|'inferred'|'conflicting'|'unverified';
export type AutonomyLevel = 0|1|2|3|4;
export type IntelligenceRisk = 'low'|'moderate'|'high'|'consequential';
export type ActionStatus = 'detected'|'prepared'|'awaiting_approval'|'authorized'|'executing'|'completed'|'blocked'|'cancelled'|'reconciliation_required';

export interface WorkGraphRef { type:string; id:string; label?:string }
export interface WorkGraphRelationship {
  id:string;
  source:WorkGraphRef;
  relation:string;
  target:WorkGraphRef;
  validFrom:string;
  validTo?:string;
  provenance:string[];
  confidence:number;
  verificationStatus:VerificationStatus;
  sensitivity:IntelligenceSensitivity;
  readPermissions:Permission[];
  createdAt:string;
  updatedAt:string;
}

export interface ContextEvidence {
  id:string;
  title:string;
  summary:string;
  source:string;
  href?:string;
  asOf?:string;
  confidence:number;
  verificationStatus:VerificationStatus;
  sensitivity:IntelligenceSensitivity;
}
export interface GovernedContextBundle {
  purpose:string;
  organizationId:string;
  actorRole:Role;
  evidence:ContextEvidence[];
  allowedDomains:string[];
  deniedEvidence:number;
  evidenceCompleteness:number;
  generatedAt:string;
  limits:{ maxItems:number; maxCharacters:number };
}

export interface NextBestAction {
  actionId:string;
  organizationId:string;
  title:string;
  why:string;
  affectedObject:WorkGraphRef;
  evidenceRefs:string[];
  policyRefs:string[];
  regulatoryRefs:string[];
  responsibleRole:string;
  deadline?:string;
  urgency:'routine'|'soon'|'urgent'|'critical';
  risk:IntelligenceRisk;
  confidence:number;
  autonomyLevel:AutonomyLevel;
  approvalRequired:boolean;
  expectedOutcome:string;
  reversible:boolean;
  toolOrWorkflow:string;
  status:ActionStatus;
  sourceEventId?:string;
  createdAt:string;
  updatedAt:string;
}

export interface AutonomyDecision {
  level:AutonomyLevel;
  risk:IntelligenceRisk;
  allowed:boolean;
  reason:string;
  humanCheckpoint:boolean;
  humanDecisionRequired:boolean;
  reversible:boolean;
  segregationOfDutiesRequired:boolean;
}

export type SagaStatus = 'planned'|'ready'|'running'|'waiting_for_human'|'retry_wait'|'reconciliation_required'|'completed'|'failed'|'cancelled';
export interface DurableSagaRecord {
  executionId:string;
  correlationId:string;
  organizationId:string;
  planId:string;
  planVersion:number;
  status:SagaStatus;
  retryCount:number;
  nextAttemptAt?:string;
  timeoutAt?:string;
  confirmedStepIds:string[];
  lastBlockedReasons:string[];
  lastReceipts:unknown[];
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  completedAt?:string;
  cancelledAt?:string;
  cancellationReason?:string;
}

export type ZeroEntryState = 'known'|'inferred'|'missing'|'conflicting'|'requires_attestation';
export interface ZeroEntryCandidate<T=unknown>{value:T|null;state:ZeroEntryState;source?:string;confidence:number;reason:string}
export interface ZeroEntryField<T=unknown>{key:string;label:string;required:boolean;highRisk:boolean;selected:ZeroEntryCandidate<T>;candidates:ZeroEntryCandidate<T>[]}

export interface ParsingEvidence { source:string; locator?:string; quote?:string; page?:number }
export interface AssuredParsedField<T=unknown> {
  field:string;
  value:T|null;
  confidence:number;
  evidence:ParsingEvidence[];
  required:boolean;
  highRisk:boolean;
  verificationStatus:VerificationStatus;
  blockers:string[];
}
export interface ParsingImprovementDiff<T=unknown>{field:string;before:AssuredParsedField<T>;after:AssuredParsedField<T>;confidenceDelta:number;changed:boolean;requiresHumanReview:boolean}

export type LearningCategory='column_mapping'|'terminology'|'template_choice'|'routing_preference'|'language_preference'|'approved_default';
export interface TenantLearningMemory {id:string;category:LearningCategory;key:string;value:string;status:'proposed'|'approved'|'retired';evidenceCount:number;approvedBy?:string;approvedAt?:string;createdBy:string;createdAt:string;updatedAt:string;previousValue?:string}

export type TodayPersona='hr'|'manager'|'employee'|'recruiter'|'executive'|'it_identity';
export interface RoleTodayDashboard {persona:TodayPersona;heading:string;items:NextBestAction[];generatedAt:string;privacyNote:string}

export interface ComplianceImpactCase {id:string;changeRef:string;summary:string;impactedObjects:WorkGraphRef[];evidenceRefs:string[];status:'identified'|'human_legal_review'|'accepted'|'dismissed'|'implemented';requiredMessage:string;createdAt:string}
export interface AnalyticsActionPlan {id:string;insight:string;drivers:string[];confidence:number;evidenceRefs:string[];recommendedAction:string;simulationAvailable:boolean;adverseIndividualAutomationProhibited:true;status:'draft'|'reviewed'|'approved'|'completed'|'cancelled'}

export interface DigitalTwinAssumption {name:string;value:number;unit:string;source:string}
export interface DigitalTwinScenario {id:string;name:string;scenarioType:'growth'|'turnover_shock'|'hiring_freeze'|'vacancy_reduction'|'cost_change'|'skills_gap';baseline:{headcount:number;fte:number;vacancies:number;employerCost:number};assumptions:DigitalTwinAssumption[];projection:{headcount:number;fte:number;vacancies:number;employerCost:number;deltaHeadcount:number;deltaCost:number};confidence:number;modelVersion:string;namedWorkerDecisionsProhibited:true;generatedAt:string}

export interface IntegrationIntelligence {readinessScore:number;readinessLevel:string;activeConnectors:number;failedRuns24h:number;openDeadLetters:number;reconciliationVariances:number;openCircuits:number;overdueSchedules:number;recommendations:string[];credentialsExposed:false;generatedAt:string}

export interface AiActivityRecord {id:string;organizationId:string;actorId:string;agentId:string;modelProvider?:string;modelName?:string;promptVersion?:string;inputCategories:string[];contextSources:string[];toolsCalled:string[];permissionResult:'allowed'|'blocked';recommendation?:string;confidence?:number;humanEdits?:boolean;approvalResult?:string;executionResult?:string;failureCode?:string;reversalResult?:string;latencyMs?:number;tokenCost?:number;monetaryCost?:number;outcome?:string;incidentId?:string;createdAt:string}
export interface TevvMetric {code:string;name:string;value:number;threshold:number;operator:'gte'|'lte'|'eq';passed:boolean;critical:boolean}
export interface TevvEvaluation {id:string;suiteVersion:string;metrics:TevvMetric[];passed:boolean;criticalFailures:string[];generatedAt:string}
export interface AgentSecurityAssessment {allowed:boolean;reasons:string[];sanitizedText:string;detectedInjection:boolean;detectedSecrets:boolean;blockedDestination?:string}

export interface AiControlTowerDashboard {
  generatedAt:string;
  inventory:{totalAgents:number;enabledAgents:number;shadowModeAgents:number;customAgents:number;automationPacks:number};
  governance:{executeCapAgents:number;nextActionsAwaitingApproval:number;humanDecisionActions:number};
  security:{promptInjectionEvents:number;blockedToolCalls:number;accessViolations:number};
  quality:{latestTevvPassed:boolean|null;criticalFailures:string[];averageConfidencePct:number|null;evidenceCompletenessPct:number|null};
  operations:{aiRuns:number;failedRuns:number;blockedRuns:number;activeSagas:number;reconciliationRequired:number;completedActions:number};
  value:{estimatedHoursSaved:number|null;estimatedCostAvoided:number|null;currency:string|null;status:string};
  cost:{trackedTokenCost:number|null;trackedMonetaryCost:number|null;status:'measured'|'not_configured'};
  integration:{readinessScore:number|null;exceptions:number|null};
  notices:string[];
}
