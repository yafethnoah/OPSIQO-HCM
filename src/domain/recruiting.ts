export type RequisitionStatus = 'draft' | 'pending_approval' | 'approved' | 'open' | 'on_hold' | 'filled' | 'closed' | 'cancelled';
export type ApplicationStage = 'applied' | 'screening' | 'interview' | 'assessment' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined' | 'withdrawn';

export interface Requisition {
  id: string;
  requisitionNumber: string;
  title: string;
  positionId: string;
  orgUnitId: string;
  hiringManagerWorkerId: string;
  employmentType: 'permanent' | 'temporary' | 'contractor' | 'intern' | 'volunteer';
  headcount: number;
  openingsRemaining: number;
  location?: string;
  description?: string;
  requirements?: string[];
  status: RequisitionStatus;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  openedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  emailLower: string;
  phone?: string;
  location?: string;
  source?: string;
  linkedinUrl?: string;
  resumeText?: string;
  consentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  requisitionId: string;
  candidateId: string;
  stage: ApplicationStage;
  dispositionReason?: string;
  dispositionNote?: string;
  dispositionAction?: 'reject' | 'withdraw';
  disposedBy?: string;
  disposedAt?: string;
  ownerUid?: string;
  source?: string;
  appliedAt: string;
  consentAt: string;
  updatedAt: string;
  hiredWorkerId?: string;
  hiredAt?: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  requisitionId: string;
  candidateId: string;
  interviewType: 'screening' | 'structured' | 'panel' | 'technical' | 'final';
  scheduledAt: string;
  durationMinutes: number;
  interviewerUids: string[];
  interviewerWorkerIds?: string[];
  location?: string;
  meetingUrl?: string;
  status: InterviewStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScorecardRating {
  criterion: string;
  rating: number;
  evidence?: string;
}

export interface InterviewScorecard {
  id: string;
  interviewId: string;
  applicationId: string;
  evaluatorUid: string;
  recommendation: 'strong_yes' | 'yes' | 'mixed' | 'no' | 'strong_no';
  ratings: ScorecardRating[];
  overallComment?: string;
  submittedAt: string;
  updatedAt: string;
}


export interface InterviewQuestionAnchor { rating: 1 | 3 | 5; description: string; }
export interface InterviewQuestion {
  id: string;
  type: 'core' | 'behavioral' | 'situational' | 'technical' | 'verification' | 'candidate_questions';
  competency: string;
  question: string;
  probes: string[];
  expectedEvidence: string[];
  anchors: InterviewQuestionAnchor[];
  standardized: boolean;
  source: 'requisition' | 'ats_gap' | 'system';
}
export interface InterviewKit {
  id: string;
  interviewId: string;
  applicationId: string;
  requisitionId: string;
  candidateId: string;
  version: number;
  status: 'draft' | 'locked';
  generationMode: 'deterministic' | 'governed_ai';
  questions: InterviewQuestion[];
  decisionBoundary: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lockedBy?: string;
  lockedAt?: string;
}
export interface InterviewPanelSummary {
  interviewId: string;
  scorecardCount: number;
  averageRating?: number;
  recommendationCounts: Record<string, number>;
  varianceWarning: boolean;
  ratingSpread?: number;
  decisionBoundary: string;
}

export interface Offer {
  id: string;
  applicationId: string;
  requisitionId: string;
  candidateId: string;
  status: OfferStatus;
  currency: string;
  baseSalary?: number;
  hourlyRate?: number;
  bonusTargetPct?: number;
  startDate: string;
  expiresAt?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
