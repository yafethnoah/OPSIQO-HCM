export type PerformanceCycleStatus = 'draft' | 'active' | 'self_review' | 'manager_review' | 'calibration' | 'closed' | 'cancelled';
export type GoalStatus = 'draft' | 'active' | 'at_risk' | 'completed' | 'cancelled';
export type GoalType = 'smart' | 'okr' | 'development';
export type ReviewStatus = 'not_started' | 'self_in_progress' | 'awaiting_manager' | 'manager_in_progress' | 'awaiting_calibration' | 'completed';
export type PipStatus = 'draft' | 'pending_hr_approval' | 'active' | 'completed' | 'unsuccessful' | 'cancelled';
export type DevelopmentPlanStatus = 'active' | 'completed' | 'cancelled';

export interface RatingScalePoint { value:number; label:string; description?:string; }
export interface PerformanceCycle {
  id:string; name:string; description?:string; status:PerformanceCycleStatus;
  periodStart:string; periodEnd:string; selfReviewDueAt?:string; managerReviewDueAt?:string; calibrationDueAt?:string;
  ratingScale:RatingScalePoint[]; goalWeightPct:number; competencyWeightPct:number; minimum360Responses:number;
  createdBy:string; activatedBy?:string; activatedAt?:string; closedBy?:string; closedAt?:string; createdAt:string; updatedAt:string;
}
export interface PerformanceGoal {
  id:string; workerId:string; cycleId?:string; title:string; description?:string; type:GoalType; status:GoalStatus;
  weightPct:number; progressPct:number; startDate:string; dueDate:string; metric?:string; targetValue?:string; currentValue?:string;
  parentGoalId?:string; evidence?:string; createdBy:string; completedAt?:string; createdAt:string; updatedAt:string;
}
export interface CompetencyDefinition {
  id:string; code:string; name:string; description?:string; category?:string; behaviors:string[]; enabled:boolean; createdBy:string; createdAt:string; updatedAt:string;
}
export interface CompetencyExpectation {
  id:string; positionId:string; competencyId:string; requiredLevel:number; weightPct:number; createdBy:string; createdAt:string; updatedAt:string;
}
export interface ReviewAssessmentItem { key:string; label:string; rating?:number; comment?:string; evidence?:string; }
export interface PerformanceReview {
  id:string; cycleId:string; workerId:string; managerWorkerId?:string; status:ReviewStatus;
  selfOverallRating?:number; selfSummary?:string; selfItems:ReviewAssessmentItem[]; selfSubmittedAt?:string;
  managerOverallRating?:number; managerSummary?:string; managerItems:ReviewAssessmentItem[]; managerSubmittedAt?:string;
  calibratedRating?:number; calibrationNote?:string; calibratedBy?:string; calibratedAt?:string;
  finalRating?:number; goalScore?:number; competencyScore?:number; createdAt:string; updatedAt:string;
}
export interface PerformanceCheckIn {
  id:string; workerId:string; managerWorkerId:string; cycleId?:string; occurredAt:string; topics:string[];
  employeeNote?:string; managerNote?:string; commitments?:string[]; nextCheckInAt?:string; createdBy:string; createdAt:string; updatedAt:string;
}
export interface FeedbackRequest {
  id:string; cycleId?:string; workerId:string; requestedBy:string; raterUids:string[]; raterWorkerIds:string[];
  questions:string[]; anonymous:boolean; minimumResponses:number; status:'open'|'released'|'closed'; dueAt?:string; releasedAt?:string; createdAt:string; updatedAt:string;
}
export interface FeedbackResponse {
  id:string; requestId:string; workerId:string; raterUid:string; raterWorkerId?:string; answers:{question:string;rating?:number;comment?:string}[]; submittedAt:string;
}
export interface FeedbackAssignment { id:string; workerId:string; cycleId?:string; questions:string[]; anonymous:boolean; dueAt?:string; status:'open'; submitted:boolean; }
export interface FeedbackSummary {
  requestId:string; workerId:string; responseCount:number; minimumResponses:number; releasable:boolean; averageRating?:number; comments:string[]; releasedAt?:string;
}
export interface DevelopmentAction { id:string; title:string; description?:string; dueDate?:string; status:'planned'|'in_progress'|'completed'|'cancelled'; evidence?:string; }
export interface DevelopmentPlan {
  id:string; workerId:string; cycleId?:string; title:string; objective:string; status:DevelopmentPlanStatus; actions:DevelopmentAction[];
  ownerWorkerId:string; managerWorkerId?:string; createdBy:string; createdAt:string; updatedAt:string;
}
export interface PipMilestone { id:string; expectation:string; successMeasure:string; dueDate:string; status:'pending'|'met'|'not_met'|'waived'; evidence?:string; }
export interface PerformanceImprovementPlan {
  id:string; workerId:string; managerWorkerId:string; status:PipStatus; title:string; reason:string; expectations:string; startDate:string; endDate:string;
  milestones:PipMilestone[]; supportMeasures:string[]; reviewCadence:string; initiatedBy:string; hrApprovedBy?:string; hrApprovedAt?:string;
  outcomeNote?:string; closedAt?:string; createdAt:string; updatedAt:string;
}
export interface PerformanceDashboard {
  scope:'self'|'team'|'organization'; activeCycle?:PerformanceCycle; metrics:{key:string;label:string;value:number|string;helper:string}[];
  goals:PerformanceGoal[]; reviews:PerformanceReview[]; checkIns:PerformanceCheckIn[]; developmentPlans:DevelopmentPlan[]; pips:PerformanceImprovementPlan[];
  competencies:CompetencyDefinition[]; expectations:CompetencyExpectation[]; feedbackSummaries:FeedbackSummary[]; feedbackAssignments:FeedbackAssignment[];
  workerDirectory:{id:string;displayName:string;employeeNumber:string;status:string}[]; positionDirectory:{id:string;title:string;positionCode:string;status:string}[];
  ratingDistribution:{rating:number;count:number}[]; generatedAt:string;
}
