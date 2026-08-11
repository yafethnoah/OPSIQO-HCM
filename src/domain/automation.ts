import type { WorkflowTrigger } from './workflow';

export type DomainEventType = Exclude<WorkflowTrigger, 'manual'>;
export type DomainEventStatus = 'pending' | 'processing' | 'processed' | 'failed';

export interface DomainEvent {
  id: string;
  orgId: string;
  type: DomainEventType;
  entityType: string;
  entityId: string;
  actorUid: string;
  payload?: Record<string, unknown>;
  status: DomainEventStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  lastError?: string;
}

export interface AutomationRunSummary {
  runId: string;
  orgId: string;
  startedAt: string;
  completedAt: string;
  scheduledChanges: { scanned: number; applied: number; failed: number; skipped: number };
  secondaryAssignments: { scanned: number; applied: number; failed: number; skipped: number };
  separationGovernance: { scannedTasks: number; overdue: number; ready: number; closed: number; blocked: number; notifications: number };
  domainEvents: { scanned: number; processed: number; failed: number; workflowRunsStarted: number; deduplicated: number };
  workflowSla: { scanned: number; overdue: number; escalated: number; unchanged: number };
  onboardingTasks: { scanned: number; overdue: number; notifications: number };
  documentGovernance: { scanned: number; expired: number; expiring: number; pendingDisposal: number; retentionCalculated: number; notifications: number };
  policyGovernance: { scanned: number; dueSoon: number; overdue: number; notifications: number };
  leaveAccruals: { workers: number; leaveTypes: number; balances: number };
  timeGovernance: { workers: number; evaluated: number; exceptions: number; timesheets: number };
  performanceGovernance: { reviewsScanned:number; overdueSelf:number; overdueManager:number; overdueCalibration:number; pipsScanned:number; overduePipMilestones:number; notifications:number };
  learningGovernance: { assignmentsScanned:number; overdueAssignments:number; certificatesScanned:number; certificatesExpiring:number; certificatesExpired:number; skillsExpired:number; notifications:number };
  careerGovernance: { criticalPositionsScanned:number; reviewDue:number; uncoveredCriticalPositions:number; notifications:number };
  compensationGovernance: { cyclesScanned:number; cyclesApplied:number; recommendationsApplied:number; failed:number; highPayEquityFlags:number };
  employeeRelationsGovernance: { casesScanned:number; overdueInvestigations:number; overdueOutcomeNotices:number; overdueActions:number; accommodationsDue:number; notifications:number };
  safetyGovernance: { incidentsScanned:number; reportingOverdue:number; investigationsOverdue:number; actionsOverdue:number; rtwReviewsDue:number; inspectionsDue:number; committeeRecommendationsOverdue:number; monthlyInspectionGap:number; notifications:number };
  experienceGovernance: { surveysClosed:number; ticketsScanned:number; firstResponseBreaches:number; resolutionBreaches:number; notifications:number };
  workforcePlanningGovernance: { plansScanned:number; approvedDemandOverdue:number; overBudgetScenarios:number; notifications:number };
  peopleAnalyticsGovernance: { snapshotCreated:number; modelsScanned:number; forecastsRun:number; insufficientHistory:number; notifications:number };
  aiGovernance: { approvedPlans:number; overdueTasks:number };
  diagnosticGovernance: { assessmentsScanned:number; reassessmentsDue:number; overdueRemediationTasks:number; highCriticalOpenFindings:number; notifications:number };
  lifecycleDiagnostics: { score: number; critical: number; high: number; warning: number; sampled: boolean };
  notificationDelivery: { scanned: number; sent: number; failed: number; skipped: number };
}
