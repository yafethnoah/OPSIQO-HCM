import type { OpsiQoActionLevel } from './opsiqo-one';
import type { WorkflowTrigger, WorkflowStep } from './workflow';

export type CustomAgentStatus='draft'|'in_review'|'active'|'retired';
export type CustomAgentAutonomyLevel='assistive'|'supervised_prepare';
export type CustomAgentTriggerMode='manual'|'event_detected'|'scheduled_review';
export type CustomAgentSimulationStatus='not_run'|'passed'|'failed';
export type CustomAgentSystemRecordState='versioned'|'legacy_unversioned';

export interface CustomAgentDefinition {
  id:string; name:string; purpose:string; instructions:string; capabilities:string[]; keywords:string[];
  requiredAnyPermissions:string[]; maxActionLevel:Exclude<OpsiQoActionLevel,'execute'>; hardMaxActionLevel:'prepare';
  humanOversight:true; status:CustomAgentStatus; createdBy:string; createdAt:string; updatedBy:string; updatedAt:string;
  ownerUid?:string; stewardUid?:string; autonomyLevel?:CustomAgentAutonomyLevel; allowedTools?:string[]; allowedActionTypes?:string[];
  triggerModes?:CustomAgentTriggerMode[]; contextSources?:string[]; evidenceRequirements?:string[];
  requiresHumanApprovalForConsequentialActions?:true; executionAuthority?:'none'; currentVersion?:number; currentVersionId?:string;
  systemRecordState?:CustomAgentSystemRecordState; latestSimulationStatus?:CustomAgentSimulationStatus;
  latestSimulationId?:string; latestSimulationAt?:string; latestSimulationBy?:string; latestSimulationVersion?:number;
  submittedAt?:string; activatedBy?:string; activatedAt?:string; retiredBy?:string; retiredAt?:string;
}

export type RegisteredCustomAgentDefinition = CustomAgentDefinition & {
  ownerUid:string; stewardUid:string; autonomyLevel:CustomAgentAutonomyLevel; allowedTools:string[]; allowedActionTypes:string[];
  triggerModes:CustomAgentTriggerMode[]; contextSources:string[]; evidenceRequirements:string[];
  requiresHumanApprovalForConsequentialActions:true; executionAuthority:'none'; currentVersion:number; currentVersionId:string;
  systemRecordState:CustomAgentSystemRecordState; latestSimulationStatus:CustomAgentSimulationStatus;
};

export interface CustomAgentVersion {
  id:string; agentId:string; version:number; fingerprint:string; createdBy:string; createdAt:string;
  name:string; purpose:string; instructions:string; capabilities:string[]; keywords:string[]; requiredAnyPermissions:string[];
  maxActionLevel:Exclude<OpsiQoActionLevel,'execute'>; hardMaxActionLevel:'prepare'; autonomyLevel:CustomAgentAutonomyLevel;
  allowedTools:string[]; allowedActionTypes:string[]; triggerModes:CustomAgentTriggerMode[]; contextSources:string[];
  evidenceRequirements:string[]; requiresHumanApprovalForConsequentialActions:true; executionAuthority:'none';
}

export interface CustomAgentSimulationRecord {
  id:string; agentId:string; version:number; versionId:string; status:'passed'|'failed'; createdBy:string; createdAt:string;
  checks:Array<{id:string;passed:boolean;evidence:string}>; fingerprint:string; authoritativeWritesPerformed:false;
}

export interface CustomAgentExecutionRecord {
  id:string; agentId:string; version:number; versionId:string; kind:'simulation'|'lifecycle'|'versioning';
  event:string; outcome:'prepared'|'passed'|'blocked'|'approved'|'retired'; createdBy:string; createdAt:string;
  humanApprovalRequired:boolean; authoritativeHrWritesPerformed:false; evidenceRefs:string[];
}

export interface AgentSystemRecordHistory {
  agent:RegisteredCustomAgentDefinition; versions:CustomAgentVersion[]; simulations:CustomAgentSimulationRecord[]; executions:CustomAgentExecutionRecord[];
  governanceNotice:string;
}

export interface AgentBuilderDashboard {
  agents:RegisteredCustomAgentDefinition[]; canManage:boolean; canApprove:boolean; safetyNotice:string; systemOfRecordNotice:string;
}

export type MemorySourceType='policy'|'knowledge_article'|'workflow'|'learning_course';
export interface OrganizationalMemoryCitation {
  id:string; sourceType:MemorySourceType; title:string; excerpt:string; href:string; version?:string; updatedAt:string; score:number;
}
export interface OrganizationalMemoryDashboard {
  query:string; citations:OrganizationalMemoryCitation[]; sourceCounts:{policies:number;knowledgeArticles:number;workflows:number;learningCourses:number};
  generatedAt:string; governanceNotice:string;
}

export interface PolicyIntelligenceSignal {
  id:string; policyId?:string; severity:'high'|'medium'|'info'|'good'; category:'review'|'lifecycle'|'acknowledgement'|'editorial'|'overlap'|'workflow';
  title:string; summary:string; href:string; evidence:string[];
}
export interface PolicyIntelligenceDashboard {
  metrics:{policies:number;published:number;draftOrReview:number;reviewOverdue:number;reviewDueSoon:number;acknowledgementRequired:number;policyTriggeredWorkflows:number};
  signals:PolicyIntelligenceSignal[]; generatedAt:string; governanceNotice:string;
}

export interface AutomationPackWorkflow {
  name:string; description:string; trigger:WorkflowTrigger; conditionMode:'all'|'any'; conditions:Array<{field:string;operator:'eq'|'neq'|'contains'|'in'|'exists'|'gt'|'gte'|'lt'|'lte';value?:string|number|boolean|string[]}>; steps:WorkflowStep[];
}
export interface AutomationMarketplacePack {
  id:string; version:number; name:string; category:string; description:string; operationalBoundary:string; workflows:AutomationPackWorkflow[];
}
export interface AutomationPackInstall { id:string; packId:string; packVersion:number; workflowIds:string[]; installedBy:string; installedAt:string; status:'installed_disabled'; }
export interface AutomationMarketplaceDashboard { packs:Array<AutomationMarketplacePack&{installed:boolean;install?:AutomationPackInstall}>; canInstall:boolean; governanceNotice:string; }
