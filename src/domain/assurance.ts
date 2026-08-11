export type AssuranceEvidenceClassification='internal'|'confidential'|'highly_confidential';
export type AssuranceEvidenceStatus='active'|'superseded'|'quarantined'|'expired';
export type AssuranceEvidenceSourceType='system_record'|'employee_document'|'policy_version'|'governance_control'|'diagnostic_result'|'regulatory_record'|'external_reference';
export type AssuranceIntegrityStatus='unverified'|'verified'|'mismatch';
export type AssurancePlanType='internal_audit'|'control_testing'|'compliance_assurance'|'external_audit_readiness';
export type AssurancePlanStatus='draft'|'in_review'|'approved'|'in_progress'|'completed'|'closed'|'cancelled';
export type AssuranceTestStatus='planned'|'in_progress'|'submitted'|'approved'|'cancelled';
export type AssuranceTestResult='not_tested'|'effective'|'partially_effective'|'ineffective'|'not_applicable';
export type AssuranceRequestStatus='open'|'in_progress'|'submitted'|'accepted'|'returned'|'closed'|'cancelled';
export type AssuranceFindingSeverity='low'|'medium'|'high'|'critical';
export type AssuranceFindingStatus='open'|'action_planned'|'risk_accepted'|'validated'|'closed';
export type AssuranceCapaStatus='draft'|'in_review'|'approved'|'in_progress'|'completed'|'verified'|'closed'|'cancelled';
export type AssuranceReportStatus='draft'|'in_review'|'approved'|'superseded';

export interface AssuranceEvidence {
  id:string;
  code:string;
  title:string;
  description:string;
  sourceType:AssuranceEvidenceSourceType;
  sourceEntityType?:string;
  sourceEntityId?:string;
  sourceUrl?:string;
  storagePath?:string;
  contentSha256?:string;
  evidenceDate:string;
  ownerRole:string;
  classification:AssuranceEvidenceClassification;
  status:AssuranceEvidenceStatus;
  legalHold:boolean;
  legalHoldReason?:string;
  retentionUntil?:string;
  integrityHash:string;
  integrityStatus:AssuranceIntegrityStatus;
  lastIntegrityVerifiedAt?:string;
  lastLedgerHash:string;
  lastLedgerSequence:number;
  createdBy:string;
  createdAt:string;
  updatedBy:string;
  updatedAt:string;
  supersededByEvidenceId?:string;
}

export interface AssuranceEvidenceLedgerEntry {
  id:string;
  evidenceId:string;
  sequence:number;
  eventType:'created'|'integrity_verified'|'quarantined'|'restored'|'legal_hold_set'|'legal_hold_released'|'superseded'|'expired';
  eventAt:string;
  actorUid:string;
  previousHash:string;
  recordIntegrityHash:string;
  entryHash:string;
  note?:string;
}

export interface AssurancePlan {
  id:string;
  code:string;
  title:string;
  planType:AssurancePlanType;
  objective:string;
  scopeNote:string;
  scopeControlIds:string[];
  scopeObligationIds:string[];
  ownerRole:string;
  reviewerRole:string;
  startDate:string;
  endDate:string;
  samplingMethod:'risk_based'|'random'|'stratified'|'judgmental'|'full_population';
  defaultSampleSize:number;
  status:AssurancePlanStatus;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
  startedBy?:string;
  startedAt?:string;
  completedBy?:string;
  completedAt?:string;
  closedBy?:string;
  closedAt?:string;
}

export interface AssuranceControlTest {
  id:string;
  planId:string;
  controlId:string;
  controlCode:string;
  controlTitle:string;
  testProcedure:string;
  expectedEvidence:string;
  ownerUid?:string;
  dueDate:string;
  status:AssuranceTestStatus;
  result:AssuranceTestResult;
  evidenceIds:string[];
  sampleId?:string;
  testerRationale?:string;
  exceptionCount:number;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
}

export interface AssuranceEvidenceRequest {
  id:string;
  requestNumber:string;
  planId?:string;
  testId?:string;
  title:string;
  requestDetail:string;
  requestedFromRole:string;
  requestedByRole:string;
  dueDate:string;
  status:AssuranceRequestStatus;
  evidenceIds:string[];
  responseNote?:string;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  acceptedBy?:string;
  acceptedAt?:string;
  closedBy?:string;
  closedAt?:string;
}

export interface AssuranceSample {
  id:string;
  planId:string;
  testId:string;
  methodology:'random'|'systematic_hash'|'judgmental'|'full_population';
  populationDescription:string;
  populationCount:number;
  populationDigest:string;
  sampleSize:number;
  selectionSeed:string;
  selectedEntityRefs:string[];
  selectionDigest:string;
  generatedBy:string;
  generatedAt:string;
}

export interface AssuranceFinding {
  id:string;
  code:string;
  planId:string;
  testId?:string;
  title:string;
  severity:AssuranceFindingSeverity;
  condition:string;
  criteria:string;
  cause:string;
  effectRisk:string;
  recommendation:string;
  ownerRole:string;
  dueDate:string;
  status:AssuranceFindingStatus;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  acceptedRiskReason?:string;
  riskAcceptedBy?:string;
  riskAcceptedAt?:string;
  validatedBy?:string;
  validatedAt?:string;
  closedBy?:string;
  closedAt?:string;
}

export interface AssuranceCapaPlan {
  id:string;
  findingId:string;
  correctiveAction:string;
  preventiveAction:string;
  ownerRole:string;
  dueDate:string;
  kpi:string;
  status:AssuranceCapaStatus;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
  completedBy?:string;
  completedAt?:string;
  verificationNote?:string;
  verifiedBy?:string;
  verifiedAt?:string;
  closedBy?:string;
  closedAt?:string;
}

export interface AssuranceCalendarItem {
  id:string;
  date:string;
  type:'plan_end'|'test_due'|'evidence_request_due'|'finding_due'|'capa_due'|'governance_source_review'|'attestation_due'|'regulatory_source_review'|'policy_review'|'legal_review_due';
  title:string;
  status:'upcoming'|'due'|'overdue'|'complete';
  priority:AssuranceFindingSeverity;
  entityType:string;
  entityId:string;
}

export interface AssuranceReadiness {
  score:number;
  level:'emerging'|'developing'|'managed'|'advanced';
  evidenceCoverage:number;
  approvedTestEffectiveness:number;
  overduePenalty:number;
  openHighCriticalFindings:number;
  explanation:string;
}

export interface AssuranceReport {
  id:string;
  title:string;
  reportingDate:string;
  audience:'executive'|'board'|'audit_committee'|'hr_leadership';
  status:AssuranceReportStatus;
  readiness:AssuranceReadiness;
  metrics:AssuranceDashboard['metrics'];
  keyFindingIds:string[];
  managementCommentary:string;
  createdBy:string;
  createdAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
}

export interface AssuranceDashboard {
  evidence:AssuranceEvidence[];
  plans:AssurancePlan[];
  tests:AssuranceControlTest[];
  requests:AssuranceEvidenceRequest[];
  samples:AssuranceSample[];
  findings:AssuranceFinding[];
  capaPlans:AssuranceCapaPlan[];
  reports:AssuranceReport[];
  calendar:AssuranceCalendarItem[];
  readiness:AssuranceReadiness;
  metrics:{
    activeEvidence:number;
    evidenceIntegrityIssues:number;
    approvedPlans:number;
    testsDue:number;
    ineffectiveTests:number;
    evidenceRequestsOverdue:number;
    openFindings:number;
    highCriticalFindings:number;
    capaOverdue:number;
    reportsAwaitingApproval:number;
  };
  assuranceHeatmap:Array<{category:string;open:number;overdue:number;highCritical:number}>;
  operatingNotice:string;
}
