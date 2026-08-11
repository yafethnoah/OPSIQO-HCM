export type SafetyIncidentType='injury'|'illness'|'near_miss'|'exposure'|'first_aid'|'workplace_violence'|'property_damage'|'environmental'|'fatality'|'other';
export type SafetySeverity='low'|'moderate'|'serious'|'critical'|'fatal';
export type SafetyIncidentStatus='reported'|'triage'|'investigating'|'corrective_action'|'rtw_monitoring'|'closed'|'cancelled';
export type SafetyReviewStatus='not_reviewed'|'not_required'|'potentially_required'|'required'|'submitted';
export type HazardStatus='open'|'controlled'|'escalated'|'closed';
export type CorrectiveActionStatus='open'|'in_progress'|'completed'|'waived'|'overdue';
export type HierarchyControl='elimination'|'substitution'|'engineering'|'administrative'|'ppe'|'other';

export interface SafetyIncident {
 id:string; referenceNumber:string; type:SafetyIncidentType; title:string; description:string; severity:SafetySeverity; status:SafetyIncidentStatus;
 reporterUid:string; reporterWorkerId?:string; affectedWorkerId?:string; location?:string; occurredAt:string; reportedAt:string;
 immediateActions:string[]; medicalAttention:boolean; lostTime:boolean; modifiedWork:boolean; firstAidOnly:boolean;
 scenePreservationRequired:boolean; sceneReleasedAt?:string; sceneReleasedBy?:string;
 mlitsdReview:SafetyReviewStatus; mlitsdNoticeTargetAt?:string; mlitsdWrittenReportTargetAt?:string; mlitsdNoticeSubmittedAt?:string; mlitsdReference?:string; mlitsdReviewNote?:string;
 committeeNoticeReview:SafetyReviewStatus; committeeNoticeTargetAt?:string; committeeNoticeSentAt?:string;
 wsibReview:SafetyReviewStatus; wsibReportTargetAt?:string; wsibSubmittedAt?:string; wsibClaimNumber?:string; wsibReviewNote?:string;
 ohsaNoticeReportEvidenceRetentionUntil?:string;
 investigationRequired:boolean; investigationTargetAt?:string; investigationStartedAt?:string; investigationCompletedAt?:string;
 rootCauseSummary?:string; closureSummary?:string; createdAt:string; updatedAt:string; closedAt?:string; closedBy?:string;
}
export interface SafetyHazard {id:string;referenceNumber:string;title:string;description:string;location?:string;category:string;likelihood:1|2|3|4|5;consequence:1|2|3|4|5;riskScore:number;status:HazardStatus;reportedBy:string;reportedWorkerId?:string;linkedIncidentId?:string;existingControls:string[];recommendedControls:string[];ownerUid?:string;dueAt?:string;createdAt:string;updatedAt:string;closedAt?:string;}
export interface SafetyInvestigation {id:string;incidentId:string;leadUid:string;teamUids:string[];method:'five_whys'|'fishbone'|'barrier_analysis'|'other';facts:string[];contributingFactors:string[];rootCauses:string[];recommendations:string[];startedAt:string;completedAt?:string;completedBy?:string;createdAt:string;updatedAt:string;}
export interface SafetyCorrectiveAction {id:string;incidentId?:string;hazardId?:string;title:string;description?:string;controlType:HierarchyControl;ownerUid?:string;ownerRole?:string;dueAt?:string;blockingClosure:boolean;status:CorrectiveActionStatus;completionEvidence?:string;completedAt?:string;completedBy?:string;createdAt:string;updatedAt:string;}
export interface ReturnToWorkPlan {id:string;incidentId:string;workerId:string;status:'draft'|'active'|'modified'|'completed'|'cancelled';functionalAbilities:string[];limitations:string[];temporaryDuties:string[];hoursSchedule?:string;contactCadence?:string;startDate?:string;reviewDate?:string;endDate?:string;wsibClaimNumber?:string;privacyNote:string;createdBy:string;createdAt:string;updatedAt:string;}
export interface SafetyInspection {id:string;referenceNumber:string;location:string;inspectionType:'workplace'|'equipment'|'ergonomic'|'fire'|'first_aid'|'ppe'|'other';scheduledFor?:string;conductedAt?:string;conductedByUids:string[];status:'scheduled'|'in_progress'|'completed'|'cancelled';summary?:string;findingsCount:number;createdBy:string;createdAt:string;updatedAt:string;}
export interface SafetyInspectionFinding {id:string;inspectionId:string;title:string;description:string;riskScore:number;hazardId?:string;status:'open'|'resolved';createdAt:string;updatedAt:string;}
export interface SafetyCommitteeProfile {id:string;workplaceName:string;regularWorkerCount:number;governanceType:'none'|'hsr'|'jhsc'|'review_required';requirementSource:string;reviewNote?:string;certifiedWorkerMemberUid?:string;certifiedEmployerMemberUid?:string;meetingFrequency?:string;nextMeetingDate?:string;updatedBy:string;updatedAt:string;}
export interface SafetyCommitteeMeeting {id:string;profileId:string;meetingDate:string;memberUids:string[];minutesDocumentId?:string;recommendations:string[];employerResponses:string[];createdBy:string;createdAt:string;}
export interface SafetyCommitteeRecommendation {id:string;meetingId:string;recommendation:string;status:'open'|'responded'|'closed';responseDueAt:string;employerResponse?:string;implementationTarget?:string;respondedAt?:string;respondedBy?:string;createdAt:string;updatedAt:string;}
export interface SafetyDashboard {metrics:{openIncidents:number;criticalIncidents:number;openHazards:number;highRiskHazards:number;overdueActions:number;rtwActive:number;reportingReviews:number;inspectionsDue:number};incidents:SafetyIncident[];hazards:SafetyHazard[];actions:SafetyCorrectiveAction[];}
