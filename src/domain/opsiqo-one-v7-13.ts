import type { OpsiQoActionLevel } from './opsiqo-one';
import type { WorkflowTrigger, WorkflowStep } from './workflow';

export type CustomAgentStatus='draft'|'in_review'|'active'|'retired';
export interface CustomAgentDefinition {
  id:string; name:string; purpose:string; instructions:string; capabilities:string[]; keywords:string[];
  requiredAnyPermissions:string[]; maxActionLevel:Exclude<OpsiQoActionLevel,'execute'>; hardMaxActionLevel:'prepare';
  humanOversight:true; status:CustomAgentStatus; createdBy:string; createdAt:string; updatedBy:string; updatedAt:string;
  submittedAt?:string; activatedBy?:string; activatedAt?:string; retiredBy?:string; retiredAt?:string;
}
export interface AgentBuilderDashboard { agents:CustomAgentDefinition[]; canManage:boolean; canApprove:boolean; safetyNotice:string; }

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
