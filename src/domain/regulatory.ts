export type RegulatorySourceType='legislation'|'regulation'|'regulator_guidance'|'government_guidance'|'standard'|'other';
export type RegulatorySourceStatus='active'|'paused'|'retired';
export type RegulatoryChangeStatus='new'|'triaged'|'impact_assessing'|'legal_review'|'implementation_planned'|'implemented'|'no_action_required'|'closed';
export type RegulatoryMateriality='low'|'medium'|'high'|'critical';
export type RegulatoryChangeType='source_content_changed'|'enacted'|'amended'|'guidance_changed'|'consultation'|'correction'|'other';
export type RegulatoryObligationStatus='draft'|'in_review'|'approved'|'retired';
export type PolicyImpactLevel='none'|'minor'|'material'|'urgent';
export type PolicyImpactStatus='draft'|'in_review'|'approved'|'implemented'|'closed';
export type ReattestationCampaignStatus='draft'|'in_review'|'approved'|'active'|'closed'|'cancelled';
export type LegalReviewStatus='open'|'in_review'|'cleared'|'returned'|'cancelled';

export interface RegulatorySource {
  id:string;
  code:string;
  jurisdiction:string;
  authority:string;
  title:string;
  sourceUrl:string;
  sourceType:RegulatorySourceType;
  ownerRole:string;
  status:RegulatorySourceStatus;
  reviewCadenceDays:number;
  monitorCadenceDays:number;
  nextCheckDate:string;
  lastReviewedAt?:string;
  nextReviewDate:string;
  lastCheckedAt?:string;
  lastCheckStatus?:'ok'|'changed'|'unreachable'|'blocked';
  currentFingerprint?:string;
  observedFingerprint?:string;
  observedAt?:string;
  changePending:boolean;
  legalConclusionProhibited:true;
  linkedGovernanceControlIds:string[];
  createdBy:string;
  createdAt:string;
  updatedBy:string;
  updatedAt:string;
  lastReviewNote?:string;
}

export interface RegulatoryChange {
  id:string;
  sourceId:string;
  sourceCode:string;
  title:string;
  changeType:RegulatoryChangeType;
  materiality:RegulatoryMateriality;
  summary:string;
  sourceUrl:string;
  detectedAt:string;
  effectiveDate?:string;
  status:RegulatoryChangeStatus;
  legalReviewRequired:boolean;
  affectedPolicyIds:string[];
  affectedControlIds:string[];
  priorFingerprint?:string;
  observedFingerprint?:string;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  triagedBy?:string;
  triagedAt?:string;
  triageNote?:string;
  closedBy?:string;
  closedAt?:string;
}

export interface RegulatoryObligation {
  id:string;
  code:string;
  sourceId:string;
  sourceCode:string;
  changeId?:string;
  jurisdiction:string;
  statement:string;
  applicabilityNote:string;
  effectiveDate?:string;
  ownerRole:string;
  legalReviewRequired:boolean;
  legalConclusionProhibited:true;
  linkedPolicyIds:string[];
  linkedControlIds:string[];
  status:RegulatoryObligationStatus;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
  retiredBy?:string;
  retiredAt?:string;
}

export interface PolicyImpactAssessment {
  id:string;
  changeId:string;
  policyId:string;
  policyCode:string;
  policyTitle:string;
  currentPublishedVersionId?:string;
  impactLevel:PolicyImpactLevel;
  rationale:string;
  recommendedAction:'revise_policy'|'update_control'|'training_or_communication'|'seek_legal_review'|'no_action';
  ownerRole:string;
  dueDate:string;
  legalReviewRequired:boolean;
  status:PolicyImpactStatus;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
  revisionPolicyVersionId?:string;
  revisionCreatedAt?:string;
  implementedBy?:string;
  implementedAt?:string;
}

export interface PolicyReattestationCampaign {
  id:string;
  policyId:string;
  policyCode:string;
  policyTitle:string;
  policyVersionId:string;
  policyVersionLabel:string;
  contentSha256:string;
  title:string;
  audience:'all_employees'|'managers'|'hr'|'custom';
  targetWorkerIds:string[];
  dueDate:string;
  status:ReattestationCampaignStatus;
  expectedCount:number;
  completedCount:number;
  overdueCount:number;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
  activatedBy?:string;
  activatedAt?:string;
  closedBy?:string;
  closedAt?:string;
}

export interface LegalReviewQueueItem {
  id:string;
  entityType:'regulatory_change'|'regulatory_obligation'|'policy_impact'|'policy_version'|'other';
  entityId:string;
  title:string;
  reason:string;
  sourceUrl?:string;
  priority:RegulatoryMateriality;
  dueDate:string;
  status:LegalReviewStatus;
  assignedReviewerUid?:string;
  outcomeNote?:string;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  reviewedBy?:string;
  reviewedAt?:string;
}

export interface RegulatoryDashboard {
  sources:RegulatorySource[];
  changes:RegulatoryChange[];
  obligations:RegulatoryObligation[];
  policyImpacts:PolicyImpactAssessment[];
  campaigns:PolicyReattestationCampaign[];
  legalReviews:LegalReviewQueueItem[];
  metrics:{
    activeSources:number;
    sourceChecksOverdue:number;
    pendingChangeSignals:number;
    highCriticalChanges:number;
    obligationsAwaitingApproval:number;
    policyImpactsOpen:number;
    campaignsActive:number;
    reattestationsOverdue:number;
    legalReviewsOpen:number;
  };
  heatmap:Array<{category:string;open:number;highCritical:number;overdue:number}>;
  operatingNotice:string;
}
