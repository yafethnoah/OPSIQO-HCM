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
  employeeNumber: string;
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
