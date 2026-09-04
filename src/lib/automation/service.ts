import { randomUUID } from 'crypto';
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { AutomationLaneResult, AutomationRunSummary } from '@/domain/automation';
import { adminDb } from '@/lib/firebase/admin';
import { processDueEmployeeChanges, processDueSecondaryAssignmentPlans } from '@/lib/hr/service';
import { processPendingDomainEvents } from '@/lib/events/service';
import { processWorkflowSla } from './workflow-sla';
import { processWorkflowNotificationSteps } from '@/lib/workflow/service';
import { processNotificationDelivery } from '@/lib/notifications/service';
import { processOnboardingDueTasks } from '@/lib/onboarding/service';
import { processDocumentGovernance, processPolicyGovernance } from '@/lib/compliance/service';
import { processLeaveAccruals, processTimeGovernance } from '@/lib/time/service';
import { processSeparationGovernance } from '@/lib/separation/service';
import { lifecycleDiagnostics } from '@/lib/lifecycle/service';
import { processPerformanceGovernance } from '@/lib/performance/service';
import { processLearningGovernance } from '@/lib/learning/service';
import { processCareerGovernance } from '@/lib/career/service';
import { processCompensationGovernance } from '@/lib/compensation/service';
import { processEmployeeRelationsGovernance } from '@/lib/employee-relations/service';
import { processSafetyGovernance } from '@/lib/safety/service';
import { processExperienceGovernance } from '@/lib/experience/service';
import { processWorkforcePlanningGovernance } from '@/lib/workforce-planning/service';
import { processPeopleAnalyticsGovernance } from '@/lib/people-analytics/service';
import { processAiGovernance } from '@/lib/ai-intelligence/service';
import { processDiagnosticGovernance } from '@/lib/hr-diagnostic/service';
import { processInvitationGovernance } from '@/lib/membership/service';
import { processLibraryImportAutomation } from '@/lib/data-import/library-import';
import { processIntegrationSchedules } from '@/lib/integration/runtime-service';
import { processIntegrationGovernance } from '@/lib/integration/service';
import { processIdentityGovernance } from '@/lib/identity/service';
import { processSecurityGovernance } from '@/lib/security-operations/service';
import { processPrivacyGovernance } from '@/lib/privacy/service';
import { processRegulatoryGovernance } from '@/lib/regulatory/service';
import { processGovernanceControlCenter } from '@/lib/governance/service';
import { processAssuranceGovernance } from '@/lib/assurance/service';
import { processOrgDesignGovernance } from '@/lib/org-design/service';
import { processResilienceGovernance } from '@/lib/resilience/service';
import { processStrategyGovernance } from '@/lib/strategy/service';
import { processPlatformReliabilityGovernance } from '@/lib/platform-reliability/service';
import { processCommandCenterGovernance } from '@/lib/enterprise-command/service';
import { systemActor } from './system-actor';
import { AUTOMATED_CAPABILITY_COUNT, HUMAN_APPROVAL_BOUNDARY_COUNT } from './catalog';

const now = () => new Date().toISOString();

type LaneCategory = AutomationLaneResult['category'];

function cleanDetails(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}


export async function listAutomationOrganizationIds(maxOrganizations = 5000): Promise<string[]> {
  const db = adminDb();
  const ids: string[] = [];
  const pageSize = 200;
  let last: QueryDocumentSnapshot | undefined;
  while (ids.length <= maxOrganizations) {
    const remainingWithSentinel = maxOrganizations + 1 - ids.length;
    let query: Query = db.collection('organizations').orderBy('__name__').limit(Math.min(pageSize, remainingWithSentinel));
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;
    ids.push(...snap.docs.map(doc => doc.id));
    if (ids.length > maxOrganizations) {
      throw new Error(`Automation organization enumeration exceeded its reviewed safety limit of ${maxOrganizations}; increase the limit before claiming complete multi-tenant coverage.`);
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < Math.min(pageSize, remainingWithSentinel)) break;
  }
  return ids;
}

export async function runPhase1Automation(orgId: string, initiatedBy = 'system:scheduler'): Promise<AutomationRunSummary> {
  const db = adminDb();
  const runId = randomUUID();
  const startedAt = now();
  const runRef = db.doc(`organizations/${orgId}/automationRuns/${runId}`);
  await runRef.create({
    id: runId,
    runId,
    orgId,
    type: 'opsiqo_v7_7_automation_cycle',
    initiatedBy,
    status: 'running',
    startedAt,
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  const lanes: AutomationLaneResult[] = [];

  async function lane<T>(name: string, category: LaneCategory, action: () => Promise<T>, fallback: T): Promise<T> {
    const laneStartedAt = now();
    const startMs = Date.now();
    try {
      const result = await action();
      const completedAt = now();
      lanes.push({
        lane: name,
        category,
        status: 'completed',
        startedAt: laneStartedAt,
        completedAt,
        durationMs: Date.now() - startMs,
        details: cleanDetails(result),
      });
      return result;
    } catch (error) {
      const completedAt = now();
      lanes.push({
        lane: name,
        category,
        status: 'failed',
        startedAt: laneStartedAt,
        completedAt,
        durationMs: Date.now() - startMs,
        error: (error instanceof Error ? error.message : 'Unknown automation lane failure').slice(0, 1000),
      });
      return fallback;
    }
  }

  // Administrative execution lanes. These only execute changes that were already
  // authorized/configured by humans or perform reversible housekeeping/monitoring.
  const scheduledChanges = await lane('effective_hr_changes', 'operational', () => processDueEmployeeChanges(orgId), { scanned: 0, applied: 0, failed: 0, skipped: 0 });
  const secondaryAssignments = await lane('secondary_assignment_changes', 'operational', () => processDueSecondaryAssignmentPlans(orgId), { scanned: 0, applied: 0, failed: 0, skipped: 0 });
  const separationGovernance = await lane('separation_governance', 'operational', () => processSeparationGovernance(orgId), { scannedTasks: 0, overdue: 0, ready: 0, closed: 0, blocked: 0, notifications: 0 });
  const invitationGovernance = await lane('invitation_lifecycle', 'security', () => processInvitationGovernance(orgId), { scanned: 0, expired: 0, expiringSoon: 0, tokenIndexesDeleted: 0, notifications: 0 });
  const onboardingTasks = await lane('onboarding_deadlines', 'operational', () => processOnboardingDueTasks(orgId), { scanned: 0, overdue: 0, notifications: 0 });
  await lane('governed_import_analysis', 'operational', () => processLibraryImportAutomation(orgId), { scanned: 0, analyzed: 0, analysisFailed: 0, draftsCreated: 0, employeeDocumentsPromoted: 0, zipChildrenCreated: 0, skippedHumanConfiguration: 0 });

  const documentGovernance = await lane('document_governance', 'governance', () => processDocumentGovernance(orgId), { scanned: 0, expired: 0, expiring: 0, pendingDisposal: 0, retentionCalculated: 0, notifications: 0 });
  const policyGovernance = await lane('policy_governance', 'governance', () => processPolicyGovernance(orgId), { scanned: 0, dueSoon: 0, overdue: 0, notifications: 0 });
  const leaveAccruals = await lane('leave_accruals', 'operational', () => processLeaveAccruals(orgId), { workers: 0, leaveTypes: 0, balances: 0 });
  const timeGovernance = await lane('time_governance', 'operational', () => processTimeGovernance(orgId), { workers: 0, evaluated: 0, exceptions: 0, timesheets: 0 });
  const performanceGovernance = await lane('performance_governance', 'governance', () => processPerformanceGovernance(orgId), { reviewsScanned: 0, overdueSelf: 0, overdueManager: 0, overdueCalibration: 0, pipsScanned: 0, overduePipMilestones: 0, notifications: 0 });
  const learningGovernance = await lane('learning_governance', 'governance', () => processLearningGovernance(orgId), { assignmentsScanned: 0, overdueAssignments: 0, certificatesScanned: 0, certificatesExpiring: 0, certificatesExpired: 0, skillsExpired: 0, notifications: 0 });
  const careerGovernance = await lane('career_succession_governance', 'governance', () => processCareerGovernance(orgId), { criticalPositionsScanned: 0, reviewDue: 0, uncoveredCriticalPositions: 0, notifications: 0 });
  const compensationGovernance = await lane('approved_compensation_execution', 'operational', () => processCompensationGovernance(orgId), { cyclesScanned: 0, cyclesApplied: 0, recommendationsApplied: 0, failed: 0, highPayEquityFlags: 0 });
  const employeeRelationsGovernance = await lane('employee_relations_governance', 'governance', () => processEmployeeRelationsGovernance(orgId), { casesScanned: 0, overdueInvestigations: 0, overdueOutcomeNotices: 0, overdueActions: 0, accommodationsDue: 0, notifications: 0 });
  const safetyGovernance = await lane('safety_governance', 'governance', () => processSafetyGovernance(orgId), { incidentsScanned: 0, reportingOverdue: 0, investigationsOverdue: 0, actionsOverdue: 0, rtwReviewsDue: 0, inspectionsDue: 0, committeeRecommendationsOverdue: 0, monthlyInspectionGap: 0, notifications: 0 });
  const experienceGovernance = await lane('experience_service_governance', 'governance', () => processExperienceGovernance(orgId), { surveysClosed: 0, ticketsScanned: 0, firstResponseBreaches: 0, resolutionBreaches: 0, notifications: 0 });
  const workforcePlanningGovernance = await lane('workforce_planning_governance', 'governance', () => processWorkforcePlanningGovernance(orgId), { plansScanned: 0, approvedDemandOverdue: 0, overBudgetScenarios: 0, notifications: 0 });
  const peopleAnalyticsGovernance = await lane('people_analytics_governance', 'analytics', () => processPeopleAnalyticsGovernance(orgId), { snapshotCreated: 0, modelsScanned: 0, forecastsRun: 0, insufficientHistory: 0, notifications: 0 });
  const aiGovernance = await lane('ai_action_plan_governance', 'governance', () => processAiGovernance(orgId), { approvedPlans: 0, overdueTasks: 0 });
  const diagnosticGovernance = await lane('hr_diagnostic_governance', 'governance', () => processDiagnosticGovernance(orgId), { assessmentsScanned: 0, reassessmentsDue: 0, overdueRemediationTasks: 0, highCriticalOpenFindings: 0, notifications: 0 });

  // Approved, inbound-only integration schedules are safe to automate because the
  // runtime already enforces profile approval, leases, idempotency and outbound blocking.
  await lane('integration_schedules', 'integration', () => processIntegrationSchedules(orgId), { due: 0, claimed: 0, succeeded: 0, partial: 0, failed: 0 });
  await lane('integration_governance', 'integration', () => processIntegrationGovernance(orgId), { connectors: 0, degradedFailing: 0, openDeadLetters: 0, reconciliationVariances: 0, notifications: 0 });

  // Enterprise governance lanes automate monitoring, expiry, evidence quarantine and
  // reminders. They deliberately do not make employment, legal or approval decisions.
  await lane('identity_governance', 'security', () => processIdentityGovernance(orgId), { staleProviderTests: 0, pendingPrivilegedAccess: 0, overdueReviews: 0, orphanAccounts: 0, notifications: 0 });
  await lane('security_governance', 'security', () => processSecurityGovernance(orgId), { criticalOpenIncidents: 0, expiredPrivilegedAccess: 0, breakGlassRotationOverdue: 0, keyRotationsOverdue: 0, recertificationsOverdue: 0, notifications: 0, expiredReplayIndexesRemoved: 0 });
  await lane('privacy_governance', 'security', () => processPrivacyGovernance(orgId), { retentionReviewsDue: 0, assessmentsOverdue: 0, requestsOverdue: 0, incidentsPendingDecision: 0, vendorReviewsDue: 0, aiReassessmentsDue: 0, notifications: 0 });
  await lane('regulatory_monitoring', 'governance', () => processRegulatoryGovernance(orgId), { sourcesScanned: 0, sourcesChecked: 0, changesDetected: 0, checksFailed: 0, reattestationsRefreshed: 0, legalReviewsOverdue: 0, notifications: 0 });
  await lane('governance_control_center', 'governance', () => processGovernanceControlCenter(orgId), { controlsScanned: 0, sourceReviewsDue: 0, attestationsOverdue: 0, exceptionsExpiring: 0, highCriticalRisks: 0, notifications: 0 });
  await lane('assurance_governance', 'governance', () => processAssuranceGovernance(orgId), { evidenceChecked: 0, integrityIssues: 0, evidenceExpired: 0, testsOverdue: 0, requestsOverdue: 0, findingsOverdue: 0, capaOverdue: 0, notifications: 0 });
  await lane('organization_design_governance', 'governance', () => processOrgDesignGovernance(orgId), { structureRisks: 0, restructuringReviews: 0, kpiBreaches: 0, notifications: 0 });
  await lane('resilience_governance', 'governance', () => processResilienceGovernance(orgId), { criticalRoleReviews: 0, coverageGaps: 0, continuityReviews: 0, exercisesDue: 0, recoveryMilestonesOverdue: 0, notifications: 0 });
  await lane('strategy_governance', 'governance', () => processStrategyGovernance(orgId), { objectiveReviews: 0, capabilityRisks: 0, overdueInitiatives: 0, riskAppetiteBreaches: 0, notifications: 0 });
  await lane('platform_reliability_governance', 'security', () => processPlatformReliabilityGovernance(orgId), { backupEvidenceOverdue: 0, restoreTestsFailing: 0, drExercisesOverdue: 0, configDriftsHighCritical: 0, openCriticalIncidents: 0, sloBreaches: 0, supplyChainFindings: 0, notifications: 0 });
  await lane('enterprise_command_governance', 'governance', () => processCommandCenterGovernance(orgId), { overdueActions: 0, sloBreaches: 0, blockedReleaseAssessments: 0, notifications: 0 });

  const diagnostic = await lane('lifecycle_diagnostics', 'analytics', () => lifecycleDiagnostics(systemActor(orgId, 'system:lifecycle-diagnostics')), null as Awaited<ReturnType<typeof lifecycleDiagnostics>> | null);
  const lifecycleDiagnosticsSummary = diagnostic
    ? { score: diagnostic.score, critical: diagnostic.counts.critical, high: diagnostic.counts.high, warning: diagnostic.counts.warning, sampled: diagnostic.sampled }
    : { score: -1, critical: 0, high: 0, warning: 0, sampled: false };

  // Event dispatch intentionally runs after governance producers so all new events can
  // enter workflows in the same automation cycle.
  const domainEvents = await lane('domain_event_dispatch', 'operational', () => processPendingDomainEvents(orgId, 200), { scanned: 0, processed: 0, failed: 0, workflowRunsStarted: 0, deduplicated: 0 });
  await lane('workflow_notification_steps', 'operational', () => processWorkflowNotificationSteps(orgId, 500), { scanned: 0, delivered: 0, completed: 0, failed: 0, passes: 0 });
  const workflowSla = await lane('workflow_sla', 'operational', () => processWorkflowSla(orgId, 500), { scanned: 0, overdue: 0, escalated: 0, unchanged: 0 });
  const notificationDelivery = await lane('notification_delivery', 'operational', () => processNotificationDelivery(orgId), { scanned: 0, sent: 0, failed: 0, skipped: 0 });

  const completedAt = now();
  const failedLanes = lanes.filter(item => item.status === 'failed').length;
  const coverage = {
    automatedLanes: lanes.length,
    automatedCapabilities: AUTOMATED_CAPABILITY_COUNT,
    completedLanes: lanes.filter(item => item.status === 'completed').length,
    failedLanes,
    humanApprovalBoundaries: HUMAN_APPROVAL_BOUNDARY_COUNT,
  };
  const summary: AutomationRunSummary = {
    runId,
    lanes,
    coverage,
    orgId,
    startedAt,
    completedAt,
    scheduledChanges,
    secondaryAssignments,
    separationGovernance,
    domainEvents,
    workflowSla,
    onboardingTasks,
    documentGovernance,
    policyGovernance,
    leaveAccruals,
    timeGovernance,
    performanceGovernance,
    learningGovernance,
    careerGovernance,
    compensationGovernance,
    employeeRelationsGovernance,
    safetyGovernance,
    experienceGovernance,
    workforcePlanningGovernance,
    peopleAnalyticsGovernance,
    aiGovernance,
    diagnosticGovernance,
    lifecycleDiagnostics: lifecycleDiagnosticsSummary,
    invitationGovernance,
    notificationDelivery,
  };

  const status = failedLanes ? 'partial' : 'completed';
  await runRef.set({ status, completedAt, summary, updatedAt: completedAt, failedLanes }, { merge: true });
  return summary;
}

export async function listAutomationRuns(orgId: string, limit = 30) {
  const safe = Math.max(1, Math.min(limit, 100));
  const snap = await adminDb().collection(`organizations/${orgId}/automationRuns`).orderBy('startedAt', 'desc').limit(safe).get();
  return snap.docs.map((d) => d.data());
}
