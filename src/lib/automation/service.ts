import { randomUUID } from 'crypto';
import type { AutomationRunSummary } from '@/domain/automation';
import { adminDb } from '@/lib/firebase/admin';
import { processDueEmployeeChanges, processDueSecondaryAssignmentPlans } from '@/lib/hr/service';
import { processPendingDomainEvents } from '@/lib/events/service';
import { processWorkflowSla } from './workflow-sla';
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
import { systemActor } from './system-actor';

const now = () => new Date().toISOString();

export async function runPhase1Automation(orgId: string, initiatedBy = 'system:scheduler'): Promise<AutomationRunSummary> {
  const db = adminDb();
  const runId = randomUUID();
  const startedAt = now();
  const runRef = db.doc(`organizations/${orgId}/automationRuns/${runId}`);
  await runRef.create({ id: runId, orgId, type: 'phase4_operational_cycle', initiatedBy, status: 'running', startedAt, createdAt: startedAt, updatedAt: startedAt });

  try {
    // Apply effective-dated HR changes first so their durable events can be dispatched in the same cycle.
    const scheduledChanges = await processDueEmployeeChanges(orgId);
    const secondaryAssignments = await processDueSecondaryAssignmentPlans(orgId);
    const separationGovernance = await processSeparationGovernance(orgId);
    const domainEvents = await processPendingDomainEvents(orgId);
    const workflowSla = await processWorkflowSla(orgId);
    const onboardingTasks = await processOnboardingDueTasks(orgId);
    const documentGovernance = await processDocumentGovernance(orgId);
    const policyGovernance = await processPolicyGovernance(orgId);
    const leaveAccruals = await processLeaveAccruals(orgId);
    const timeGovernance = await processTimeGovernance(orgId);
    const performanceGovernance = await processPerformanceGovernance(orgId);
    const learningGovernance = await processLearningGovernance(orgId);
    const careerGovernance = await processCareerGovernance(orgId);
    const compensationGovernance = await processCompensationGovernance(orgId);
    const employeeRelationsGovernance = await processEmployeeRelationsGovernance(orgId);
    const safetyGovernance = await processSafetyGovernance(orgId);
    const experienceGovernance = await processExperienceGovernance(orgId);
    const workforcePlanningGovernance = await processWorkforcePlanningGovernance(orgId);
    const peopleAnalyticsGovernance = await processPeopleAnalyticsGovernance(orgId);
    const aiGovernance = await processAiGovernance(orgId);
    const diagnosticGovernance = await processDiagnosticGovernance(orgId);
    const diagnostic = await lifecycleDiagnostics(systemActor(orgId, 'system:lifecycle-diagnostics'));
    const lifecycleDiagnosticsSummary = { score: diagnostic.score, critical: diagnostic.counts.critical, high: diagnostic.counts.high, warning: diagnostic.counts.warning, sampled: diagnostic.sampled };
    const notificationDelivery = await processNotificationDelivery(orgId);
    const completedAt = now();
    const summary: AutomationRunSummary = { runId, orgId, startedAt, completedAt, scheduledChanges, secondaryAssignments, separationGovernance, domainEvents, workflowSla, onboardingTasks, documentGovernance, policyGovernance, leaveAccruals, timeGovernance, performanceGovernance, learningGovernance, careerGovernance, compensationGovernance, employeeRelationsGovernance, safetyGovernance, experienceGovernance, workforcePlanningGovernance, peopleAnalyticsGovernance, aiGovernance, diagnosticGovernance, lifecycleDiagnostics: lifecycleDiagnosticsSummary, notificationDelivery };
    await runRef.set({ status: 'completed', completedAt, summary, updatedAt: completedAt }, { merge: true });
    return summary;
  } catch (error) {
    const completedAt = now();
    const message = error instanceof Error ? error.message : 'Unknown automation-cycle error';
    await runRef.set({ status: 'failed', completedAt, lastError: message.slice(0, 2000), updatedAt: completedAt }, { merge: true });
    throw error;
  }
}

export async function listAutomationRuns(orgId: string, limit = 30) {
  const safe = Math.max(1, Math.min(limit, 100));
  const snap = await adminDb().collection(`organizations/${orgId}/automationRuns`).orderBy('startedAt', 'desc').limit(safe).get();
  return snap.docs.map((d) => d.data());
}
