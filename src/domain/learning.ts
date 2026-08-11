export type SkillVerificationStatus='self_reported'|'manager_verified'|'evidence_verified'|'expired';
export type SkillCriticality='required'|'important'|'preferred';
export type CourseStatus='draft'|'published'|'archived';
export type CourseDelivery='self_paced'|'instructor_led'|'blended'|'external';
export type LearningAssignmentStatus='assigned'|'in_progress'|'completed'|'failed'|'waived'|'expired';
export type CertificateStatus='valid'|'expiring'|'expired'|'revoked';

export interface SkillDefinition{
  id:string;code:string;name:string;description?:string;category?:string;enabled:boolean;
  proficiencyLabels:{level:number;label:string;description?:string}[];
  evidenceRequired:boolean;createdBy:string;createdAt:string;updatedAt:string;
}
export interface PositionSkillRequirement{
  id:string;positionId:string;skillId:string;requiredLevel:number;criticality:SkillCriticality;weightPct:number;
  createdBy:string;createdAt:string;updatedAt:string;
}
export interface WorkerSkill{
  id:string;workerId:string;skillId:string;level:number;status:SkillVerificationStatus;source:'self'|'manager'|'assessment'|'course'|'import';
  evidenceNote?:string;evidenceDocumentId?:string;assessedAt:string;expiresAt?:string;verifiedBy?:string;verifiedAt?:string;
  createdBy:string;createdAt:string;updatedAt:string;
}
export interface CourseSkillMapping{skillId:string;targetLevel:number;weightPct:number;}
export interface CourseAssessmentQuestion{id:string;prompt:string;options:string[];correctOption:number;points:number;}
export interface LearningCourse{
  id:string;code:string;title:string;description?:string;status:CourseStatus;delivery:CourseDelivery;durationMinutes:number;
  provider?:string;url?:string;skillMappings:CourseSkillMapping[];assessmentQuestions:CourseAssessmentQuestion[];passingScorePct?:number;
  certificateValidityDays?:number;mandatory:boolean;createdBy:string;publishedAt?:string;createdAt:string;updatedAt:string;
}
export type LearningCourseView=Omit<LearningCourse,'assessmentQuestions'> & {assessmentQuestions:Array<Omit<CourseAssessmentQuestion,'correctOption'>>};
export interface LearningPath{
  id:string;code:string;title:string;description?:string;courseIds:string[];targetPositionIds:string[];targetSkillIds:string[];
  status:'draft'|'published'|'archived';createdBy:string;createdAt:string;updatedAt:string;
}
export interface LearningAssignment{
  id:string;workerId:string;courseId:string;pathId?:string;reason:'skill_gap'|'development'|'compliance'|'manager'|'self';
  status:LearningAssignmentStatus;assignedBy:string;assignedAt:string;dueAt?:string;startedAt?:string;completedAt?:string;
  progressPct:number;attempts:number;scorePct?:number;completionEvidence?:string;waiveReason?:string;lastAttemptAt?:string;createdAt:string;updatedAt:string;
}
export interface LearningCertificate{
  id:string;workerId:string;courseId:string;assignmentId:string;certificateNumber:string;verificationCode:string;status:CertificateStatus;
  issuedAt:string;expiresAt?:string;revokedAt?:string;revokedBy?:string;createdAt:string;updatedAt:string;
}
export interface SkillGap{
  workerId:string;positionId?:string;skillId:string;skillName:string;requiredLevel:number;currentLevel:number;verifiedLevel:number;gap:number;
  criticality:SkillCriticality;verificationStatus?:SkillVerificationStatus;recommendedCourseIds:string[];
}
export interface LearningRecommendation{workerId:string;skillId:string;courseId:string;reason:string;priority:'high'|'medium'|'low';}
export interface LearningDashboard{
  scope:'self'|'team'|'organization';metrics:{key:string;label:string;value:number|string;helper:string}[];
  skills:SkillDefinition[];requirements:PositionSkillRequirement[];workerSkills:WorkerSkill[];gaps:SkillGap[];recommendations:LearningRecommendation[];
  courses:LearningCourseView[];paths:LearningPath[];assignments:LearningAssignment[];certificates:LearningCertificate[];
  workerDirectory:{id:string;displayName:string;employeeNumber:string;status:string}[];positionDirectory:{id:string;title:string;positionCode:string;status:string}[];
  generatedAt:string;
}
