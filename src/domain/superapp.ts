export type SuperAppMode='employee'|'manager';
export type SuperAppAttentionSeverity='info'|'medium'|'high'|'critical';
export type SuperAppDataState='available'|'partial'|'unavailable'|'not_permitted'|'not_assessed';

export interface SuperAppAction{
 id:string;label:string;description:string;href:string;
 permission?:string;roles?:string[];audience:'all'|'employee'|'manager';
 category:'work'|'growth'|'pay'|'help'|'team'|'approvals'|'ai';
}
export interface SuperAppAttentionItem{
 id:string;type:string;severity:SuperAppAttentionSeverity;
 title:string;summary:string;href:string;dueAt?:string;
 count?:number;priorityScore:number;
}
export interface SuperAppPreference{
 id:string;uid:string;homeMode:'auto'|'employee'|'manager';
 pinnedActionIds:string[];compactMode:boolean;
 locale:'auto'|'en'|'fr'|'es'|'ar';timeZone:string;
 updatedBy:string;updatedAt:string;
}
export interface SuperAppHealthItem{state:SuperAppDataState;message?:string}
export interface SuperAppHealth{
 profile:SuperAppHealthItem;notifications:SuperAppHealthItem;leave:SuperAppHealthItem;
 time:SuperAppHealthItem;learning:SuperAppHealthItem;compliance:SuperAppHealthItem;
 performance:SuperAppHealthItem;compensation:SuperAppHealthItem;service:SuperAppHealthItem;
 documents:SuperAppHealthItem;team:SuperAppHealthItem;teamCompliance:SuperAppHealthItem;
 teamLeaveApprovals:SuperAppHealthItem;teamTimeApprovals:SuperAppHealthItem;
}
export interface SuperAppEmployeeSummary{
 linked:boolean;
 worker?:{id:string;displayName:string;employeeNumber:string;status:string;hireDate?:string};
 assignment?:{positionTitle?:string;orgUnitName?:string;managerName?:string};
 leave:{availableHours:number;pendingRequests:number};
 time:{draftTimesheets:number;submittedTimesheets:number;openExceptions:number};
 learning:{active:number;overdue:number;certificates:number};
 compliance:{assessed:boolean;score?:number;gaps:number;expiring:number};
 performance:{activeGoals:number;awaitingSelfReview:number};
 rewards?:{currency:string;totalRewardsValue:number;asOfDate:string};
 service:{openTickets:number};
 notifications:{unread:number;highPriority:number;recentOnly:boolean};
 documents:{visibleCount:number};
}
export interface SuperAppManagerSummary{
 teamSize:number;active:number;onLeave:number;
 pendingLeaveApprovals:number;submittedTimesheets:number;
 awaitingManagerReviews:number;overdueLearning:number;
 teamComplianceGaps:number;teamComplianceRate?:number;
 teamComplianceAssessed:number;teamComplianceTotal:number;
}
export interface SuperAppDashboard{
 mode:SuperAppMode;role:string;workerId?:string;
 employee:SuperAppEmployeeSummary;
 manager?:SuperAppManagerSummary;
 team:Array<{workerId:string;displayName:string;employeeNumber:string;status:string;positionTitle?:string;orgUnitName?:string}>;
 attention:SuperAppAttentionItem[];
 actions:SuperAppAction[];
 preference:SuperAppPreference;
 health:SuperAppHealth;
 concierge:{
  mode:'guided'|'ai_copilot';
  title:string;message:string;
  suggestions:Array<{label:string;href:string}>;
 };
 privacy:{
  apiOfflineCache:false;documentOfflineCache:false;payrollOfflineCache:false;
  staticAssetCacheOnly:true;consequentialApprovalByConcierge:false;
 };
 generatedAt:string;
}
