export type OnboardingCaseStatus = 'in_progress' | 'ready_for_activation' | 'activated' | 'cancelled' | 'completed';
export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'waived' | 'overdue';
export type OnboardingTaskType = 'form' | 'document' | 'policy_ack' | 'task' | 'approval' | 'orientation' | 'training' | 'check_in';
export type OnboardingPhase = 'pre_start' | 'day_1' | 'day_7' | 'day_30' | 'day_60' | 'day_90';
export type OnboardingOwnerType = 'candidate' | 'hr' | 'manager' | 'it' | 'payroll' | 'employee';

export interface PrehireProfile {
  legalFirstName: string;
  legalLastName: string;
  preferredName?: string;
  personalEmail: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  updatedAt?: string;
}

export interface OnboardingActivationSnapshot {
  capturedAt: string;
  capturedBy: string;
  requiredPreStartTasks: number;
  completedRequiredPreStartTasks: number;
  blockingTaskIds: string[];
  workEmail: string;
  employmentType: 'permanent' | 'temporary' | 'contractor' | 'intern' | 'volunteer';
  startDate: string;
  documentEvidence: Array<{
    taskId: string;
    documentId: string;
    sha256: string;
    scanStatus: 'not_scanned' | 'clean' | 'blocked';
    verificationStatus: 'unverified' | 'verified' | 'rejected';
  }>;
}

export interface OnboardingCase {
  id: string;
  offerId: string;
  applicationId: string;
  candidateId: string;
  requisitionId: string;
  positionId: string;
  orgUnitId: string;
  managerWorkerId: string;
  candidateDisplayName: string;
  candidateEmail: string;
  employeeNumber?: string;
  workEmail: string;
  employmentType: 'permanent' | 'temporary' | 'contractor' | 'intern' | 'volunteer';
  startDate: string;
  status: OnboardingCaseStatus;
  progress: number;
  requiredPreStartTasks: number;
  completedRequiredPreStartTasks: number;
  workerId?: string;
  activatedAt?: string;
  activatedBy?: string;
  activationSnapshot?: OnboardingActivationSnapshot;
  accessExpiresAt: string;
  accessStatus: 'active' | 'revoked' | 'expired';
  accessSendCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  profile: PrehireProfile;
}

export interface OnboardingTask {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  taskType: OnboardingTaskType;
  phase: OnboardingPhase;
  ownerType: OnboardingOwnerType;
  ownerRole?: string;
  required: boolean;
  blockingActivation: boolean;
  status: OnboardingTaskStatus;
  dueAt?: string;
  policyId?: string;
  policyVersion?: string;
  policyVersionId?: string;
  policyContentSha256?: string;
  completedAt?: string;
  completedBy?: string;
  completionNote?: string;
  reconciledAfterActivation?: boolean;
  reconciledAt?: string;
  reconciledBy?: string;
  legacyVerificationRequired?: boolean;
  legacyVerificationFlaggedAt?: string;
  legacyVerificationFlaggedBy?: string;
  legacyReconciliation?: {
    sourceRelease: 'H51.68';
    previousStatus?: OnboardingTaskStatus;
    previousCompletedAt?: string | null;
    previousCompletedBy?: string | null;
    reason: string;
    reconciliationId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PrehireDocument {
  id: string;
  caseId: string;
  taskId: string;
  fileName: string;
  contentType: string;
  size: number;
  storagePath: string;
  sha256: string;
  scanStatus: 'not_scanned' | 'clean' | 'blocked';
  scanEvidenceRef?: string | null;
  legacyNote?: string;
  legacyNormalizedAt?: string;
  legacyNormalizedBy?: string;
  verificationStatus?: 'unverified' | 'verified' | 'rejected';
  verificationNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  scanRecordedBy?: string;
  scanRecordedAt?: string;
  uploadedAt: string;
  uploadedBy: 'candidate' | string;
}

export interface OnboardingPolicy {
  id: string;
  title: string;
  version: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  onboardingRequired: boolean;
  governedVersionId?: string;
  contentSha256?: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export type OnboardingLegacyRepairActionType =
  | 'normalize_legacy_scan_note'
  | 'reset_premature_lifecycle_task'
  | 'flag_unverified_document_task'
  | 'duplicate_evidence_review';

export interface OnboardingLegacyRepairAction {
  type: OnboardingLegacyRepairActionType;
  targetType: 'prehireDocument' | 'onboardingTask' | 'evidenceGroup';
  targetId: string;
  description: string;
  before: Record<string, unknown>;
  proposed: Record<string, unknown>;
  writeRequired: boolean;
}

export interface OnboardingLegacyReconciliation {
  id: string;
  caseId: string;
  sourceRelease: 'H51.68';
  status: 'previewed' | 'applied';
  fingerprint: string;
  actions: OnboardingLegacyRepairAction[];
  createdAt: string;
  createdBy: string;
  appliedAt?: string;
  appliedBy?: string;
  reason?: string;
}
