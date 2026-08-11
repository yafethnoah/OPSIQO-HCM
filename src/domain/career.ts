export type CareerHorizon='now'|'within_1_year'|'1_2_years'|'exploring';
export type MobilityStatus='open'|'selective'|'not_open';
export type CareerInterestStatus='interested'|'applied'|'withdrawn'|'converted';
export type PositionCriticality='important'|'high'|'critical';
export type SuccessionReadiness='ready_now'|'within_1_year'|'1_2_years'|'over_2_years'|'not_ready';
export type NominationStatus='nominated'|'confirmed'|'removed';
export type PotentialLevel=1|2|3;

export interface CareerProfile{
  id:string;workerId:string;headline?:string;aspirationSummary?:string;targetPositionIds:string[];careerHorizon:CareerHorizon;
  mobilityStatus:MobilityStatus;preferredLocations:string[];openToRemote:boolean;openToRelocation:boolean;developmentPriorities:string[];
  visibility:'employee_manager_hr'|'hr_only';createdBy:string;createdAt:string;updatedAt:string;
}
export interface CareerReadinessPolicy{
  id:'default';skillsWeightPct:number;performanceWeightPct:number;learningWeightPct:number;minimumPerformanceRating:number;
  updatedBy:string;updatedAt:string;
}
export interface RoleReadinessEvidence{
  requiredSkillCount:number;skillsMet:number;verifiedSkillCoveragePct:number;evidenceCompletenessPct:number;latestPerformanceRating?:number;latestPerformanceAt?:string;performanceMeetsReference?:boolean;
  relevantLearningCompleted:number;relevantLearningTotal:number;missingSkills:{skillId:string;skillName:string;requiredLevel:number;verifiedLevel:number;criticality:string}[];
}
export interface RoleReadiness{
  workerId:string;positionId:string;positionTitle:string;scoreAvailable:boolean;overallScore?:number;skillsScore?:number;performanceScore?:number;learningScore?:number;
  evidence:RoleReadinessEvidence;generatedAt:string;disclaimer:string;
}
export interface InternalMobilityInterest{
  id:string;workerId:string;positionId:string;requisitionId?:string;status:CareerInterestStatus;note?:string;candidateId?:string;applicationId?:string;appliedAt?:string;convertedWorkerId?:string;convertedAt?:string;createdBy:string;createdAt:string;updatedAt:string;
}
export interface InternalOpportunity{
  positionId:string;positionTitle:string;positionCode:string;orgUnitId:string;location?:string;positionStatus:string;requisitionId?:string;requisitionNumber?:string;
  readiness?:RoleReadiness;interest?:InternalMobilityInterest;
}
export interface CriticalPositionPlan{
  id:string;positionId:string;criticality:PositionCriticality;lossImpact:string;vacancyRisk:'low'|'medium'|'high';targetSuccessors:number;
  reviewDueDate:string;ownerWorkerId?:string;businessContinuityNote?:string;createdBy:string;createdAt:string;updatedAt:string;
}
export interface SuccessorNomination{
  id:string;positionId:string;workerId:string;readiness:SuccessionReadiness;status:NominationStatus;nominationReason:string;evidence:string[];
  developmentPriorities:string[];nominatedBy:string;nominatedAt:string;confirmedBy?:string;confirmedAt?:string;updatedAt:string;
}
export interface TalentAssessment{
  id:string;workerId:string;cycleLabel:string;potentialRating:PotentialLevel;potentialEvidence:string;learningAgilityRating:PotentialLevel;aspirationRating:PotentialLevel;
  mobilityRating:PotentialLevel;leadershipBreadthRating:PotentialLevel;performanceBand:'low'|'solid'|'high'|'insufficient_evidence';nineBoxCell?:string;
  assessedBy:string;assessedAt:string;calibrationNote?:string;updatedAt:string;
}
export interface SuccessionRisk{
  positionId:string;positionTitle:string;criticality:PositionCriticality;vacancyRisk:string;confirmedSuccessors:number;readyNow:number;targetSuccessors:number;
  coverageStatus:'covered'|'partial'|'uncovered';
}
export interface CareerDashboard{
  scope:'self'|'team'|'organization';metrics:{key:string;label:string;value:number|string;helper:string}[];profiles:CareerProfile[];readiness:RoleReadiness[];
  opportunities:InternalOpportunity[];interests:InternalMobilityInterest[];criticalPositions:CriticalPositionPlan[];nominations:SuccessorNomination[];
  talentAssessments:TalentAssessment[];successionRisks:SuccessionRisk[];readinessPolicy:CareerReadinessPolicy;
  workerDirectory:{id:string;displayName:string;employeeNumber:string;status:string;primaryPositionId?:string}[];
  positionDirectory:{id:string;title:string;positionCode:string;status:string;orgUnitId:string;location?:string}[];generatedAt:string;
}
