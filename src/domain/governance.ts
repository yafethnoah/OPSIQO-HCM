export type GovernanceControlCategory='statutory'|'policy'|'operational'|'privacy'|'ai'|'security'|'risk';
export type GovernanceControlStatus='draft'|'in_review'|'active'|'retired';
export type GovernanceRiskLevel='low'|'medium'|'high'|'critical';
export type GovernanceAttestationStatus='pending'|'submitted'|'approved'|'overdue'|'cancelled';
export type GovernanceAttestationResponse='confirmed'|'exception_reported'|'not_confirmed';
export type GovernanceExceptionStatus='draft'|'in_review'|'approved'|'expired'|'closed'|'cancelled';
export type GovernanceRiskStatus='open'|'mitigating'|'accepted'|'closed';

export interface GovernanceControl {
  id:string;
  code:string;
  title:string;
  category:GovernanceControlCategory;
  jurisdiction:string;
  controlObjective:string;
  evidenceRequirement:string;
  ownerRole:string;
  accountableRole:string;
  status:GovernanceControlStatus;
  sourceTitle:string;
  sourceUrl?:string;
  sourceReviewedAt:string;
  sourceReviewCadenceMonths:number;
  sourceNextReviewDate:string;
  legalConclusionProhibited:boolean;
  linkedPolicyId?:string;
  linkedDiagnosticControlId?:string;
  createdBy:string;
  createdAt:string;
  updatedBy:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
  retiredBy?:string;
  retiredAt?:string;
  reviewNote?:string;
}

export interface GovernanceAttestation {
  id:string;
  controlId:string;
  controlCode:string;
  title:string;
  periodLabel:string;
  assignedRole:string;
  dueDate:string;
  statement:string;
  status:GovernanceAttestationStatus;
  response?:GovernanceAttestationResponse;
  responseNote?:string;
  evidenceRefs:string[];
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
}

export interface GovernanceException {
  id:string;
  controlId:string;
  controlCode:string;
  title:string;
  rationale:string;
  riskLevel:GovernanceRiskLevel;
  mitigation:string;
  ownerRole:string;
  startDate:string;
  expiryDate:string;
  status:GovernanceExceptionStatus;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  submittedBy?:string;
  submittedAt?:string;
  approvedBy?:string;
  approvedAt?:string;
  closedBy?:string;
  closedAt?:string;
}

export interface GovernanceRisk {
  id:string;
  code:string;
  title:string;
  description:string;
  sourceType:'governance_control'|'diagnostic_finding'|'exception'|'manual';
  sourceId?:string;
  ownerRole:string;
  likelihood:1|2|3|4|5;
  impact:1|2|3|4|5;
  score:number;
  level:GovernanceRiskLevel;
  treatmentPlan:string;
  dueDate?:string;
  status:GovernanceRiskStatus;
  acceptedRiskReason?:string;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  acceptedBy?:string;
  acceptedAt?:string;
  closedBy?:string;
  closedAt?:string;
}

export interface GovernanceDashboard {
  controls:GovernanceControl[];
  attestations:GovernanceAttestation[];
  exceptions:GovernanceException[];
  risks:GovernanceRisk[];
  metrics:{
    activeControls:number;
    sourceReviewsOverdue:number;
    sourceReviewsDue30:number;
    attestationsPending:number;
    attestationsOverdue:number;
    openExceptions:number;
    exceptionsExpiring30:number;
    highCriticalRisks:number;
    acceptedRisks:number;
  };
  categoryCoverage:Array<{category:GovernanceControlCategory;active:number;overdue:number}>;
  operatingNotice:string;
}
