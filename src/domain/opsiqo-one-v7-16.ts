import type { OpsiQoActionLevel } from './opsiqo-one';

export interface ProgramProject {
  id:string;
  code:string;
  name:string;
  fundingSourceId:string;
  orgUnitId?:string;
  startDate:string;
  endDate:string;
  status:'planned'|'active'|'closed';
  notes?:string;
  createdBy:string;
  createdAt:string;
  updatedBy:string;
  updatedAt:string;
}

export interface ProgramWorkforceRow {
  allocationId:string;
  projectId?:string;
  projectCode:string;
  projectName:string;
  fundingSourceId:string;
  fundingCode:string;
  fundingName:string;
  workerId:string;
  workerName:string;
  employmentType?:string;
  positionId?:string;
  positionTitle?:string;
  orgUnitId?:string;
  orgUnitName?:string;
  allocationPct:number;
  plannedAnnualAmount:number|null;
  currency:string;
  startDate:string;
  endDate?:string;
}

export interface ProgramWorkforceDashboard {
  projects:ProgramProject[];
  rows:ProgramWorkforceRow[];
  metrics:{
    activeProjects:number;
    activeFundingSources:number;
    fundedWorkers:number;
    linkedPositions:number;
    explicitPlannedAnnualCost:number|null;
    uncostedAllocations:number;
  };
  signals:Array<{id:string;severity:'high'|'medium'|'info';title:string;summary:string;href:string}>;
  generatedAt:string;
  methodologyNotice:string;
}

export interface MeetingWorkflowPromotionResult {
  draftId:string;
  workflowId:string;
  workflowName:string;
  promotedActionCount:number;
  workflowEnabled:false;
  requiresSeparateActivation:true;
  templateId?:'action_register'|'sequenced_follow_up'|'review_gate';
}

export interface SafeExecutionReceipt {
  id:string;
  action:'notifications.mark_visible_read';
  actionLevel:'execute';
  risk:'low';
  affectedCount:number;
  executedBy:string;
  executedAt:string;
  evidence:string[];
  humanDecisionRequired:false;
  boundary:string;
}

export interface AccessibilityEvidence {
  criterion:string;
  status:'implemented'|'manual_review_required';
  evidence:string;
}

export interface AccessibilityReadinessDashboard {
  target:'WCAG 2.2 AA';
  evidence:AccessibilityEvidence[];
  implemented:number;
  manualReviewRequired:number;
  generatedAt:string;
  certificationBoundary:string;
}

export interface TranslationCoverageDashboard {
  supportedLocales:Array<'en'|'fr'|'es'|'ar'>;
  rtlLocales:Array<'ar'>;
  surfaces:Array<{id:string;label:string;coverage:'complete'|'foundation'|'legacy_review_required'}>;
  aiLanguagePreservesEvidence:true;
  generatedAt:string;
  boundary:string;
}

export interface SafeActionDefinition {
  id:string;
  title:string;
  description:string;
  requiredPermissions:string[];
  maxActionLevel:OpsiQoActionLevel;
  risk:'low';
}
