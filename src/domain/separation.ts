export type SeparationType = 'resignation' | 'retirement' | 'employer_initiated' | 'layoff' | 'contract_end' | 'death' | 'other';
export type SeparationCaseStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'ready_to_close' | 'closed' | 'cancelled';
export type SeparationTaskStatus = 'pending' | 'in_progress' | 'completed' | 'waived' | 'overdue';
export type SeparationTaskOwner = 'hr' | 'manager' | 'it' | 'payroll' | 'benefits' | 'employee' | 'facilities';
export type SeparationTaskPhase = 'pre_exit' | 'effective_date' | 'post_exit';

export interface SeparationCase {
  id: string;
  workerId: string;
  positionId?: string;
  orgUnitId?: string;
  managerWorkerId?: string;
  separationType: SeparationType;
  effectiveDate: string;
  lastWorkingDate: string;
  reasonCategory: string;
  reasonDetail?: string;
  employeeInitiated: boolean;
  regrettable: boolean;
  rehireEligible?: boolean;
  status: SeparationCaseStatus;
  progress: number;
  requiredClosureTasks: number;
  completedClosureTasks: number;
  legalReviewRequired: boolean;
  legalReviewStatus: 'not_required' | 'pending' | 'completed';
  legalReviewNote?: string;
  noticeMethod?: 'working_notice' | 'pay_in_lieu' | 'combination' | 'not_applicable' | 'pending_review';
  statutoryNoticeWeeks?: number;
  contractualNoticeWeeks?: number;
  severanceReview?: 'not_reviewed' | 'not_applicable' | 'potentially_applicable' | 'confirmed';
  massTerminationReview?: 'not_reviewed' | 'not_applicable' | 'potentially_applicable' | 'confirmed';
  payPeriodEndDate?: string;
  roeTargetDate?: string;
  finalPayTargetDate?: string;
  autoCloseOnEffectiveDate: boolean;
  replacementDecision: 'pending' | 'replace' | 'do_not_replace' | 'redesign';
  replacementNote?: string;
  replacementRequisitionId?: string;
  replacementRequestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  closedBy?: string;
  closedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeparationTask {
  id: string;
  caseId: string;
  workerId: string;
  code: 'hr_checklist' | 'knowledge_transfer' | 'it_deprovision' | 'time_leave_review' | 'asset_return' | 'final_payroll' | 'roe' | 'benefits' | 'exit_interview' | 'replacement' | 'retention';
  title: string;
  description?: string;
  ownerType: SeparationTaskOwner;
  ownerRole?: string;
  phase: SeparationTaskPhase;
  required: boolean;
  blockingClosure: boolean;
  dueAt?: string;
  status: SeparationTaskStatus;
  completionNote?: string;
  completedBy?: string;
  completedAt?: string;
  waivedBy?: string;
  waivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeparationAsset {
  id: string;
  caseId: string;
  workerId: string;
  assetTag?: string;
  name: string;
  category?: string;
  status: 'assigned' | 'returned' | 'lost' | 'damaged' | 'written_off';
  returnDueAt?: string;
  returnedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExitInterview {
  id: string;
  caseId: string;
  workerId: string;
  overallExperience?: number;
  managerExperience?: number;
  reasonForLeaving?: string;
  whatWorkedWell?: string;
  whatCouldImprove?: string;
  destination?: string;
  wouldRecommend?: boolean;
  wouldReturn?: boolean;
  confidentialNote?: string;
  themes: string[];
  submittedBy: string;
  submittedAt: string;
}

export interface SeparationDashboard {
  metrics: {
    openCases: number;
    pendingApproval: number;
    dueWithin14Days: number;
    overdueTasks: number;
    closedYtd: number;
    voluntaryYtd: number;
    regrettableYtd: number;
  };
  reasonMix: Array<{ reasonCategory: string; count: number }>;
  openCases: SeparationCase[];
  overdueTasks: SeparationTask[];
}
