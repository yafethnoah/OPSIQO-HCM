export type DocumentCategory =
  | 'employment'
  | 'identity'
  | 'payroll_tax'
  | 'compensation'
  | 'leave'
  | 'performance'
  | 'learning'
  | 'health_safety'
  | 'employee_relations'
  | 'policy'
  | 'other';

export type DocumentClassification = 'internal' | 'confidential' | 'highly_confidential';
export type DocumentVisibility = 'hr_only' | 'employee_and_hr' | 'manager_employee_hr';
export type DocumentStatus = 'active' | 'superseded' | 'expired' | 'pending_disposal' | 'disposed' | 'quarantined';
export type ScanStatus = 'not_scanned' | 'clean' | 'blocked';

export interface EmployeeDocument {
  id: string;
  workerId: string;
  title: string;
  category: DocumentCategory;
  classification: DocumentClassification;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  currentVersionId: string;
  versionCount: number;
  issueDate?: string;
  expiryDate?: string;
  retentionRuleId?: string;
  retentionUntil?: string;
  legalHold: boolean;
  legalHoldReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocumentVersion {
  id: string;
  documentId: string;
  workerId: string;
  version: number;
  fileName: string;
  contentType: string;
  size: number;
  storagePath: string;
  sha256: string;
  scanStatus: ScanStatus;
  uploadedBy: string;
  uploadedAt: string;
  supersededAt?: string;
}

export type PolicyStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'superseded' | 'archived';
export type PolicyAudience = 'all_employees' | 'managers' | 'hr' | 'custom';

export interface Policy {
  id: string;
  code: string;
  title: string;
  ownerUid: string;
  currentPublishedVersionId?: string;
  latestVersionNumber: number;
  status: PolicyStatus;
  acknowledgementRequired: boolean;
  onboardingRequired: boolean;
  audience: PolicyAudience;
  audienceOrgUnitIds?: string[];
  audienceEmploymentTypes?: string[];
  reviewFrequencyMonths?: number;
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  versionNumber: number;
  versionLabel: string;
  content: string;
  contentSha256: string;
  status: PolicyStatus;
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  supersededAt?: string;
}

export interface PolicyAcknowledgement {
  id: string;
  workerId: string;
  policyId: string;
  policyVersionId: string;
  policyVersionLabel: string;
  acknowledgedAt: string;
  method: 'authenticated_employee_portal' | 'secure_prehire_portal' | 'admin_recorded';
  signerUid?: string;
  signerName?: string;
  contentSha256: string;
}

export type RetentionTrigger = 'document_created' | 'document_expiry' | 'employment_end' | 'manual';
export type RetentionAction = 'review' | 'delete' | 'anonymize';
export interface RetentionRule {
  id: string;
  name: string;
  category: DocumentCategory;
  trigger: RetentionTrigger;
  retentionDays: number;
  action: RetentionAction;
  legalBasisNote: string;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RequirementType = 'document' | 'policy_ack' | 'training';
export interface ComplianceRequirement {
  id: string;
  name: string;
  requirementType: RequirementType;
  required: boolean;
  documentCategory?: DocumentCategory;
  policyId?: string;
  appliesTo: 'all_employees' | 'managers' | 'custom';
  orgUnitIds?: string[];
  employmentTypes?: string[];
  expiryWarningDays?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerComplianceRow {
  workerId: string;
  displayName: string;
  employeeNumber: string;
  required: number;
  compliant: number;
  overdue: number;
  expiring: number;
  score: number | null;
}
