export type ResilienceRiskLevel='low'|'medium'|'high'|'critical';
export type GovernedStatus='draft'|'in_review'|'approved'|'retired';
export type ContinuityPlanStatus='draft'|'in_review'|'approved'|'activated'|'retired';
export type CrisisStatus='reported'|'activated'|'stabilizing'|'recovering'|'resolved'|'closed';
export type ExerciseStatus='draft'|'scheduled'|'completed'|'reviewed'|'closed';
export type RecoveryStatus='draft'|'in_review'|'approved'|'in_progress'|'completed'|'verified'|'closed';

export interface CriticalRoleResilience {
  id:string; code:string; title:string; positionId?:string; orgUnitId?:string; ownerRole:string;
  businessProcesses:string[]; essentialSkills:string[]; dependencyRoleIds:string[];
  criticality:ResilienceRiskLevel; vacancyImpactDays:number; minimumCoverage:number; currentCoverage:number;
  readySuccessors:number; singlePointOfFailure:boolean; remoteCapability:'full'|'partial'|'none';
  contingencyNote:string; nextReviewDate:string; status:GovernedStatus; operationalIndicatorOnly:true;
  createdBy:string; createdAt:string; updatedAt:string; submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface WorkforceImpactAnalysis {
  id:string; code:string; processName:string; ownerRole:string; scope:string; criticalRoleIds:string[];
  maximumTolerableDowntimeHours:number; recoveryTimeObjectiveHours:number; minimumStaffing:number; currentStaffing:number;
  dependencies:string[]; peopleImpact:number; serviceImpact:number; financialImpact:number; regulatoryReputationImpact:number;
  riskScore:number; riskLevel:ResilienceRiskLevel; priority:'P1'|'P2'|'P3'|'P4'; assumptions:string;
  status:GovernedStatus; operationalIndicatorOnly:true; createdBy:string; createdAt:string; updatedAt:string;
  submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface ContinuityPlan {
  id:string; code:string; title:string; ownerRole:string; impactAnalysisIds:string[]; criticalRoleIds:string[];
  scenarioTypes:string[]; activationCriteria:string; incidentCommandRoles:string[]; minimumStaffing:number;
  alternateWorkArrangements:string; communicationChannels:string[]; recoveryObjectives:string[];
  nextExerciseDate:string; nextReviewDate:string; status:ContinuityPlanStatus; operationalIndicatorOnly:true;
  createdBy:string; createdAt:string; updatedAt:string; submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
  activatedBy?:string; activatedAt?:string; activationReason?:string;
}

export interface CrisisCommunication { id:string; audience:string; channel:string; message:string; recordedBy:string; recordedAt:string; }
export interface CrisisStaffingGap { id:string; role:string; required:number; available:number; mitigation:string; }
export interface CrisisIncident {
  id:string; incidentNumber:string; title:string; incidentType:'facility'|'technology'|'cyber'|'public_health'|'weather'|'supply_chain'|'workforce'|'security'|'other';
  severity:ResilienceRiskLevel; description:string; declaredAt:string; ownerRole:string; incidentCommanderRole:string;
  affectedUnits:string[]; continuityPlanIds:string[]; staffingGaps:CrisisStaffingGap[]; communications:CrisisCommunication[];
  stabilizationNote?:string; recoveryNote?:string; status:CrisisStatus; operationalIndicatorOnly:true;
  createdBy:string; createdAt:string; updatedAt:string; activatedBy?:string; activatedAt?:string; resolvedBy?:string; resolvedAt?:string; closedBy?:string; closedAt?:string;
}

export interface RecoveryMilestone { id:string; title:string; ownerRole:string; dueDate:string; status:'not_started'|'in_progress'|'completed'|'blocked'; evidenceNote?:string; completedAt?:string; }
export interface ResilienceRecoveryPlan {
  id:string; code:string; title:string; sourceType:'incident'|'exercise'|'continuity_review'|'critical_role'; sourceId:string;
  ownerRole:string; targetRecoveryDate:string; objectives:string[]; milestones:RecoveryMilestone[]; residualRisk:ResilienceRiskLevel;
  status:RecoveryStatus; operationalIndicatorOnly:true; createdBy:string; createdAt:string; updatedAt:string;
  submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string; verifiedBy?:string; verifiedAt?:string; closedBy?:string; closedAt?:string;
}

export interface ResilienceExercise {
  id:string; code:string; title:string; planId:string; exerciseType:'tabletop'|'simulation'|'drill'|'functional';
  exerciseDate:string; scenario:string; objectives:string[]; participantRoles:string[]; targetRecoveryHours:number;
  actualRecoveryHours?:number; recoveryTargetMet?:boolean; gaps:string[]; lessons:string[]; actionItems:string[];
  ownerRole:string; reviewerRole:string; status:ExerciseStatus; operationalIndicatorOnly:true;
  createdBy:string; createdAt:string; updatedAt:string; completedBy?:string; completedAt?:string; reviewedBy?:string; reviewedAt?:string; closedBy?:string; closedAt?:string;
}

export interface ResilienceReport {
  id:string; title:string; reportingDate:string; audience:'executive'|'board'|'hr_leadership'|'incident_command';
  readiness:{score:number;level:'fragile'|'developing'|'managed'|'resilient'}; commentary:string; status:'draft'|'in_review'|'approved'|'superseded';
  operationalIndicatorOnly:true; createdBy:string; createdAt:string; submittedBy?:string; submittedAt?:string; approvedBy?:string; approvedAt?:string;
}

export interface ResilienceDashboard {
  criticalRoles:CriticalRoleResilience[]; impactAnalyses:WorkforceImpactAnalysis[]; continuityPlans:ContinuityPlan[];
  incidents:CrisisIncident[]; recoveryPlans:ResilienceRecoveryPlan[]; exercises:ResilienceExercise[]; reports:ResilienceReport[];
  metrics:{criticalRoles:number;singlePointsOfFailure:number;coverageGaps:number;p1Processes:number;approvedContinuityPlans:number;activeCrises:number;highCriticalCrises:number;overdueRecoveryMilestones:number;exercisesDue:number;};
  heatmap:Array<{category:string;open:number;overdue:number;highCritical:number}>;
  resilienceReadiness:{score:number;level:'fragile'|'developing'|'managed'|'resilient';explanation:string};
  operatingNotice:string;
}
