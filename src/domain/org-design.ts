export type OrgDesignRiskLevel='low'|'medium'|'high'|'critical';
export type OrgDesignLifecycle='draft'|'in_review'|'approved'|'retired';
export interface OrgDesignLayerMetric {layer:number;positions:number;managerPositions:number;}
export interface OrgDesignSnapshot {
  id:string;code:string;name:string;ownerRole:string;asOfDate:string;narrowSpanThreshold:number;wideSpanThreshold:number;targetMaxLayers:number;targetManagementRatioPct:number;
  activePositions:number;managerPositions:number;individualContributorPositions:number;vacantPositions:number;maxLayers:number;averageSpan:number;medianSpan:number;narrowSpanManagers:number;wideSpanManagers:number;managementRatioPct:number;orphanReportingLines:number;cyclePositionIds:string[];layers:OrgDesignLayerMetric[];
  estimatedAnnualStructureCost:number;assumedManagerAnnualCost:number;assumedIndividualContributorAnnualCost:number;structuralHealthScore:number;riskLevel:OrgDesignRiskLevel;status:OrgDesignLifecycle;operationalIndicatorOnly:true;
  createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;
}
export interface OrgDesignRoleProfile {
  id:string;code:string;title:string;jobFamily:string;level:string;rolePurpose:string;accountabilities:string[];decisionScope:string[];requiredCapabilities:string[];positionIds:string[];ownerRole:string;status:OrgDesignLifecycle;operationalIndicatorOnly:true;createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;
}
export interface OrgDesignDecisionRight {
  id:string;code:string;decision:string;category:string;accountableRoleCode:string;responsibleRoleCodes:string[];consultedRoleCodes:string[];informedRoleCodes:string[];approvalAuthority:string;escalationRoleCode?:string;evidenceRequired:string[];ownerRole:string;status:OrgDesignLifecycle;operationalIndicatorOnly:true;createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;
}
export interface OrgDesignScenario {
  id:string;code:string;name:string;baselineSnapshotId:string;ownerRole:string;horizonMonths:number;assumptions:string[];targetMaxLayers:number;targetManagerPositions:number;targetFte:number;targetAnnualStructureCost:number;estimatedAnnualSavings:number;targetAverageSpan:number;implementationComplexity:number;businessBenefit:number;peopleRisk:number;scenarioScore:number;status:OrgDesignLifecycle;planningOnly:true;createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;
}
export interface OrgDesignRestructuringProposal {
  id:string;code:string;title:string;scenarioId:string;ownerRole:string;rationale:string;affectedPositionCount:number;affectedOrgUnitCount:number;estimatedFteChange:number;estimatedAnnualCostDelta:number;windowStart:string;windowEnd:string;consultationReviewStatus:'pending'|'not_required'|'completed';employeeRelationsReviewStatus:'pending'|'not_required'|'completed';legalReviewStatus:'pending'|'not_required'|'completed';privacyReviewStatus:'pending'|'not_required'|'completed';reviewNote?:string;reviewEvidenceRefs:string[];reviewUpdatedBy?:string;reviewUpdatedAt?:string;changeManagementPlan:string[];risks:string[];status:'draft'|'in_review'|'approved_for_planning'|'retired';planningOnly:true;noIndividualDecisionAuthority:true;createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;
}
export interface OrgDesignKpi {
  id:string;code:string;name:string;category:'spans_layers'|'decision_velocity'|'management_ratio'|'role_clarity'|'cost'|'effectiveness'|'other';unit:string;direction:'higher_better'|'lower_better'|'range';baseline:number;target:number;current:number;tolerance:number;ownerRole:string;nextReviewDate:string;breach:boolean;status:OrgDesignLifecycle;operationalIndicatorOnly:true;createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;
}
export interface OrgDesignReport {id:string;title:string;reportingDate:string;audience:'executive'|'board'|'hr_leadership'|'organization_committee';readiness:{score:number;level:'fragile'|'developing'|'effective'|'optimized'};commentary:string;status:'draft'|'in_review'|'approved'|'superseded';operationalIndicatorOnly:true;createdBy:string;createdAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;}
export interface OrgDesignDashboard {
  snapshots:OrgDesignSnapshot[];roleProfiles:OrgDesignRoleProfile[];decisionRights:OrgDesignDecisionRight[];scenarios:OrgDesignScenario[];restructuring:OrgDesignRestructuringProposal[];kpis:OrgDesignKpi[];reports:OrgDesignReport[];
  metrics:{latestStructuralHealth:number;latestMaxLayers:number;latestAverageSpan:number;managementRatioPct:number;narrowSpanManagers:number;wideSpanManagers:number;decisionRightsApprovedPct:number;kpiBreaches:number;highRiskScenarios:number;restructuringInReview:number;};
  heatmap:Array<{category:string;open:number;overdue:number;highCritical:number}>;orgDesignReadiness:{score:number;level:'fragile'|'developing'|'effective'|'optimized';explanation:string};operatingNotice:string;
}
