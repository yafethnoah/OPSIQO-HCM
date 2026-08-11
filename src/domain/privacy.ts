export type PrivacyRiskLevel='low'|'medium'|'high'|'critical';
export type PrivacyLifecycleStatus='draft'|'in_review'|'approved'|'retired';
export type PrivacyDataSensitivity='internal'|'confidential'|'sensitive'|'highly_sensitive';
export type PrivacyAssessmentType='privacy_impact'|'dpia'|'aia'|'transfer_impact'|'vendor_privacy';
export type PrivacyAssessmentStatus='draft'|'in_review'|'approved'|'mitigation_required'|'closed';
export type PrivacyRequestType='access'|'correction'|'deletion'|'objection'|'consent_withdrawal'|'complaint'|'other';
export type PrivacyRequestStatus='received'|'identity_verification'|'in_progress'|'extended'|'fulfilled'|'denied'|'closed';
export type PrivacyIncidentStatus='reported'|'triage'|'contained'|'investigating'|'notification_review'|'remediating'|'closed';
export type PrivacyNotificationDecision='pending_human_review'|'notify_regulator'|'notify_individuals'|'notify_both'|'no_notification';
export type VendorPrivacyStatus='draft'|'in_review'|'approved'|'restricted'|'retired';
export type TransferStatus='draft'|'in_review'|'approved'|'suspended'|'retired';
export type AiUseCaseStatus='draft'|'in_review'|'approved'|'restricted'|'suspended'|'retired';
export type AiModelRiskStatus='draft'|'in_review'|'approved'|'reassessment_due'|'retired';

export interface PrivacyDataAsset {
  id:string; code:string; name:string; systemName:string; description:string; ownerRole:string;
  dataCategories:string[]; dataSubjectCategories:string[]; sensitivity:PrivacyDataSensitivity;
  storageLocations:string[]; processingCountries:string[]; vendorIds:string[]; retentionScheduleId?:string;
  legalHoldAware:true; status:'active'|'inactive'|'retired'; createdBy:string; createdAt:string; updatedBy:string; updatedAt:string;
}

export interface PrivacyProcessingActivity {
  id:string; code:string; title:string; purpose:string; businessFunction:string; ownerRole:string;
  dataAssetIds:string[]; dataCategories:string[]; dataSubjectCategories:string[]; recipients:string[];
  processingCountries:string[]; vendorIds:string[]; retentionScheduleId?:string;
  authorityBasisNote:string; authorityBasisReviewRequired:true; necessityProportionalityNote:string;
  safeguards:string[]; automatedDecisioning:boolean; consequentialEmploymentUse:boolean;
  status:PrivacyLifecycleStatus; legalConclusionProhibited:true;
  createdBy:string; createdAt:string; updatedAt:string; submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface PrivacyRetentionSchedule {
  id:string; code:string; recordCategory:string; description:string; trigger:string; retentionDays:number;
  disposition:'delete'|'anonymize'|'archive'|'manual_review'; ownerRole:string; sourceNote:string; jurisdiction:string;
  nextReviewDate:string; legalHoldAware:true; status:PrivacyLifecycleStatus; legalConclusionProhibited:true;
  createdBy:string; createdAt:string; updatedAt:string; submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface PrivacyAssessmentRisk { id:string; title:string; description:string; likelihood:number; impact:number; inherentScore:number; mitigation:string; residualLikelihood:number; residualImpact:number; residualScore:number; }
export interface PrivacyAssessment {
  id:string; code:string; assessmentType:PrivacyAssessmentType; title:string; entityType:string; entityId:string;
  jurisdiction:string; scope:string; dataFlowSummary:string; risks:PrivacyAssessmentRisk[]; overallInherentRisk:PrivacyRiskLevel;
  overallResidualRisk:PrivacyRiskLevel; ownerRole:string; reviewerRole:string; dueDate:string; status:PrivacyAssessmentStatus;
  legalReviewRequired:boolean; legalConclusionProhibited:true; createdBy:string; createdAt:string; updatedAt:string;
  submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string; approvalNote?:string; closedBy?:string; closedAt?:string;
}

export interface PrivacyRequest {
  id:string; requestNumber:string; requestType:PrivacyRequestType; requesterReference:string; jurisdiction:string;
  receivedDate:string; dueDate:string; identityVerification:'pending'|'verified'|'failed'|'not_required'; status:PrivacyRequestStatus;
  assignedRole:string; scope:string; evidenceIds:string[]; responseNote?:string; extensionReason?:string; extendedDueDate?:string;
  denialReason?:string; legalReviewRequired:boolean; legalConclusionProhibited:true; createdBy:string; createdAt:string; updatedAt:string;
  fulfilledBy?:string; fulfilledAt?:string; closedBy?:string; closedAt?:string;
}

export interface PrivacyIncident {
  id:string; incidentNumber:string; title:string; incidentType:'unauthorized_access'|'loss'|'disclosure'|'cybersecurity'|'misdirection'|'vendor'|'other';
  discoveredAt:string; occurredAt?:string; status:PrivacyIncidentStatus; severity:PrivacyRiskLevel; ownerRole:string;
  description:string; dataCategories:string[]; dataSubjectCategories:string[]; estimatedIndividualsAffected:number;
  sensitiveDataInvolved:boolean; containmentAction:string; investigationNote?:string; rootCause?:string; remediation?:string;
  notificationDecision:PrivacyNotificationDecision; notificationDecisionRationale?:string; notificationDecisionBy?:string; notificationDecisionAt?:string;
  regulatorNotifiedAt?:string; individualsNotifiedAt?:string; legalReviewRequired:true; legalConclusionProhibited:true;
  createdBy:string; createdAt:string; updatedAt:string; closedBy?:string; closedAt?:string;
}

export interface PrivacyVendor {
  id:string; code:string; vendorName:string; serviceDescription:string; ownerRole:string; dataCategories:string[];
  processingCountries:string[]; subprocessors:string[]; dpaStatus:'missing'|'draft'|'executed'|'not_applicable';
  securityReviewStatus:'not_started'|'in_progress'|'passed'|'conditional'|'failed'; privacyTermsNote:string;
  likelihood:number; impact:number; riskScore:number; riskLevel:PrivacyRiskLevel; nextReviewDate:string; status:VendorPrivacyStatus;
  legalConclusionProhibited:true; createdBy:string; createdAt:string; updatedAt:string; submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface PrivacyTransfer {
  id:string; code:string; title:string; dataAssetIds:string[]; vendorId?:string; fromCountry:string; toCountries:string[];
  dataCategories:string[]; purpose:string; safeguardsNote:string; transferMechanismNote:string; assessmentId?:string;
  ownerRole:string; status:TransferStatus; qualifiedReviewRequired:true; legalConclusionProhibited:true;
  createdBy:string; createdAt:string; updatedAt:string; submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface PrivacyAiUseCase {
  id:string; code:string; title:string; purpose:string; ownerRole:string; modelProfileId?:string; provider?:string; model?:string;
  personalDataCategories:string[]; dataSubjectCategories:string[]; processingCountries:string[];
  automatedDecisioning:boolean; consequentialEmploymentUse:boolean; humanOversight:string; prohibitedUses:string[];
  assessmentId?:string; riskLevel:PrivacyRiskLevel; status:AiUseCaseStatus; legalConclusionProhibited:true;
  createdBy:string; createdAt:string; updatedAt:string; submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface PrivacyAiModelRisk {
  id:string; code:string; aiUseCaseId:string; provider:string; model:string; purpose:string;
  privacyRisk:number; securityRisk:number; biasRisk:number; explainabilityRisk:number; humanOversightRisk:number;
  overallScore:number; riskLevel:PrivacyRiskLevel; mitigations:string[]; evidenceNote:string; nextReviewDate:string;
  status:AiModelRiskStatus; legalConclusionProhibited:true; createdBy:string; createdAt:string; updatedAt:string;
  submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface PrivacyDashboard {
  assets:PrivacyDataAsset[]; processing:PrivacyProcessingActivity[]; retentionSchedules:PrivacyRetentionSchedule[];
  assessments:PrivacyAssessment[]; requests:PrivacyRequest[]; incidents:PrivacyIncident[]; vendors:PrivacyVendor[];
  transfers:PrivacyTransfer[]; aiUseCases:PrivacyAiUseCase[]; aiModelRisks:PrivacyAiModelRisk[];
  metrics:{activeAssets:number;approvedProcessing:number;retentionReviewsOverdue:number;highCriticalAssessments:number;openPrivacyRequests:number;requestsOverdue:number;openIncidents:number;notificationReviewsPending:number;highRiskVendors:number;transfersAwaitingApproval:number;aiUseCasesAwaitingApproval:number;highRiskAiModels:number;};
  heatmap:Array<{category:string;open:number;overdue:number;highCritical:number}>;
  privacyReadiness:{score:number;level:'emerging'|'developing'|'managed'|'advanced';explanation:string};
  operatingNotice:string;
}
