import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const projectId = 'opsiqo-phase1-rules-test';
const orgId = 'org-rules';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });
});

afterAll(async () => { await testEnv?.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `organizations/${orgId}/memberships/employee-1`), { uid:'employee-1', workerId:'worker-1', role:'employee', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/memberships/manager-1`), { uid:'manager-1', workerId:'worker-2', role:'manager', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/memberships/hr-1`), { uid:'hr-1', workerId:'worker-3', role:'hr_admin', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/memberships/hrp-1`), { uid:'hrp-1', workerId:'worker-4', role:'hr_partner', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/workflowDefinitions/wf-1`), { id:'wf-1', name:'Existing workflow', trigger:'manual', enabled:true });
    await setDoc(doc(db, `organizations/${orgId}/workflowRuns/wfr-1`), { id:'wfr-1', workflowId:'wf-1', status:'running' });
    await setDoc(doc(db, `organizations/${orgId}/workflowStepRuns/wfs-1`), { id:'wfs-1', workflowRunId:'wfr-1', status:'pending' });
    await setDoc(doc(db, `organizations/${orgId}/workers/worker-1`), { id:'worker-1', displayName:'Employee One' });
    await setDoc(doc(db, `organizations/${orgId}/workers/worker-99`), { id:'worker-99', employeeNumber:'PRIVATE-99', displayName:'Directory Colleague', hireDate:'2025-01-01' });
    await setDoc(doc(db, `organizations/${orgId}/workerDirectory/worker-1`), { id:'worker-1', displayName:'Employee One', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/workerDirectory/worker-99`), { id:'worker-99', displayName:'Directory Colleague', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/assignments/assignment-own`), { id:'assignment-own', workerId:'worker-1', managerWorkerId:'worker-2' });
    await setDoc(doc(db, `organizations/${orgId}/assignments/assignment-other`), { id:'assignment-other', workerId:'worker-99', managerWorkerId:'worker-88' });
    await setDoc(doc(db, `organizations/${orgId}/people/person-1`), { id:'person-1', authUid:'employee-1', legalFirstName:'Employee', legalLastName:'One' });
    await setDoc(doc(db, `organizations/${orgId}/people/person-2`), { id:'person-2', authUid:'other-user', legalFirstName:'Other', legalLastName:'Person' });
    await setDoc(doc(db, `organizations/${orgId}/employments/employment-1`), { id:'employment-1', workerId:'worker-1' });
    await setDoc(doc(db, `organizations/${orgId}/employments/employment-99`), { id:'employment-99', workerId:'worker-99' });
    await setDoc(doc(db, `organizations/${orgId}/auditLogs/audit-1`), { id:'audit-1', action:'test' });
    await setDoc(doc(db, `organizations/${orgId}/domainEvents/event-1`), { id:'event-1', status:'pending' });
    await setDoc(doc(db, `organizations/${orgId}/automationRuns/run-1`), { id:'run-1', status:'completed' });
    await setDoc(doc(db, `organizations/${orgId}/secondaryAssignmentPlans/plan-1`), { id:'plan-1', workerId:'worker-1', status:'scheduled', effectiveDate:'2026-09-01' });
    await setDoc(doc(db, `organizations/${orgId}/settings/notifications`), { id:'notifications', inAppEnabled:true });
    await setDoc(doc(db, `organizations/${orgId}/notifications/n-employee`), { id:'n-employee', targetUid:'employee-1', status:'unread', createdAt:'2026-08-10T00:00:00Z' });
    await setDoc(doc(db, `organizations/${orgId}/requisitions/req-manager`), { id:'req-manager', title:'Manager requisition', hiringManagerWorkerId:'worker-2', status:'open', createdAt:'2026-08-10T00:00:00Z' });
    await setDoc(doc(db, `organizations/${orgId}/requisitions/req-other`), { id:'req-other', title:'Other requisition', hiringManagerWorkerId:'worker-99', status:'open', createdAt:'2026-08-10T00:00:00Z' });
    await setDoc(doc(db, `organizations/${orgId}/candidates/cand-1`), { id:'cand-1', displayName:'Candidate One', email:'candidate@example.com' });
    await setDoc(doc(db, `organizations/${orgId}/applications/app-1`), { id:'app-1', requisitionId:'req-manager', candidateId:'cand-1', stage:'applied' });
    await setDoc(doc(db, `organizations/${orgId}/offers/offer-1`), { id:'offer-1', applicationId:'app-1', candidateId:'cand-1', status:'draft' });
    await setDoc(doc(db, `organizations/${orgId}/onboardingCases/case-1`), { id:'case-1', candidateDisplayName:'Candidate One', managerWorkerId:'worker-2', status:'in_progress' });
    await setDoc(doc(db, `organizations/${orgId}/onboardingTasks/task-1`), { id:'task-1', caseId:'case-1', title:'Private onboarding task', status:'pending' });
    await setDoc(doc(db, `organizations/${orgId}/prehireDocuments/doc-1`), { id:'doc-1', caseId:'case-1', fileName:'signed.pdf', storagePath:'private/path' });
    await setDoc(doc(db, `prehireAccessIndex/hash-1`), { orgId, caseId:'case-1', status:'active', expiresAt:'2026-09-01T00:00:00Z' });
    await setDoc(doc(db, `organizations/${orgId}/employeeDocuments/gov-doc-1`), { id:'gov-doc-1', workerId:'worker-1', title:'Employment Agreement', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/policies/policy-1`), { id:'policy-1', code:'HR-001', title:'Conduct', status:'published' });
    await setDoc(doc(db, `organizations/${orgId}/retentionRules/rule-1`), { id:'rule-1', name:'Employment records', enabled:true });
    await setDoc(doc(db, `organizations/${orgId}/complianceRequirements/req-1`), { id:'req-1', name:'Agreement', requirementType:'document' });
    await setDoc(doc(db, `organizations/${orgId}/leaveRequests/leave-1`), { id:'leave-1', workerId:'worker-1', status:'pending' });
    await setDoc(doc(db, `organizations/${orgId}/timeEntries/time-1`), { id:'time-1', workerId:'worker-1', status:'complete' });
    await setDoc(doc(db, `organizations/${orgId}/timesheets/sheet-1`), { id:'sheet-1', workerId:'worker-1', status:'submitted' });
    await setDoc(doc(db, `organizations/${orgId}/timePolicies/policy-time-1`), { id:'policy-time-1', name:'Ontario reference' });
    await setDoc(doc(db, `organizations/${orgId}/separationCases/sep-1`), { id:'sep-1', workerId:'worker-1', managerWorkerId:'worker-2', status:'pending_approval', reasonDetail:'Private legal detail' });
    await setDoc(doc(db, `organizations/${orgId}/separationTasks/sep-task-1`), { id:'sep-task-1', caseId:'sep-1', workerId:'worker-1', title:'Private offboarding task', status:'pending' });
    await setDoc(doc(db, `organizations/${orgId}/exitInterviews/exit-1`), { id:'exit-1', caseId:'sep-1', workerId:'worker-1', confidentialNote:'Private feedback' });
    await setDoc(doc(db, `organizations/${orgId}/notificationTemplates/template-1`), { id:'template-1', code:'TEST', name:'Test', subject:'Test', body:'Test', enabled:true });
    await setDoc(doc(db, `organizations/${orgId}/lifecycleDiagnosticRuns/diag-1`), { id:'diag-1', score:100, createdAt:'2026-08-10T00:00:00Z' });
    await setDoc(doc(db, `organizations/${orgId}/replacementRequisitionIndex/sep-1`), { caseId:'sep-1', status:'completed', requisitionId:'req-manager' });
    await setDoc(doc(db, `organizations/${orgId}/performanceCycles/cycle-1`), { id:'cycle-1', name:'2026 Cycle', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/performanceGoals/goal-1`), { id:'goal-1', workerId:'worker-1', title:'Goal', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/performanceReviews/review-1`), { id:'review-1', workerId:'worker-1', managerWorkerId:'worker-2', status:'awaiting_manager' });
    await setDoc(doc(db, `organizations/${orgId}/feedbackResponses/feedback-1`), { id:'feedback-1', requestId:'feedback-req', workerId:'worker-1', raterUid:'manager-1' });
    await setDoc(doc(db, `organizations/${orgId}/performanceImprovementPlans/pip-1`), { id:'pip-1', workerId:'worker-1', managerWorkerId:'worker-2', status:'active' });
    await setDoc(doc(db, `organizations/${orgId}/skills/skill-1`), { id:'skill-1', code:'DATA', name:'People Analytics', enabled:true });
    await setDoc(doc(db, `organizations/${orgId}/workerSkills/worker-1_skill-1`), { id:'worker-1_skill-1', workerId:'worker-1', skillId:'skill-1', level:3, status:'self_reported' });
    await setDoc(doc(db, `organizations/${orgId}/courses/course-1`), { id:'course-1', code:'DATA301', title:'Analytics', status:'published' });
    await setDoc(doc(db, `organizations/${orgId}/learningAssignments/learn-1`), { id:'learn-1', workerId:'worker-1', courseId:'course-1', status:'assigned' });
    await setDoc(doc(db, `organizations/${orgId}/learningCertificates/cert-1`), { id:'cert-1', workerId:'worker-1', courseId:'course-1', status:'valid' });
    await setDoc(doc(db, `organizations/${orgId}/careerProfiles/worker-1`), { id:'worker-1', workerId:'worker-1', targetPositionIds:['pos-2'], visibility:'employee_manager_hr' });
    await setDoc(doc(db, `organizations/${orgId}/internalMobilityInterests/worker-1_pos-2`), { id:'worker-1_pos-2', workerId:'worker-1', positionId:'pos-2', status:'interested' });
    await setDoc(doc(db, `organizations/${orgId}/criticalPositions/pos-2`), { id:'pos-2', positionId:'pos-2', criticality:'critical', vacancyRisk:'medium' });
    await setDoc(doc(db, `organizations/${orgId}/successorNominations/pos-2_worker-1`), { id:'pos-2_worker-1', positionId:'pos-2', workerId:'worker-1', status:'confirmed', readiness:'within_1_year' });
    await setDoc(doc(db, `organizations/${orgId}/talentAssessments/worker-1_2026`), { id:'worker-1_2026', workerId:'worker-1', potentialRating:2, performanceBand:'solid' });

  });

});

describe('Firestore tenant and role boundaries', () => {
  it('separates the privacy-minimized worker directory from private worker records', async () => {
    const employeeDb = testEnv.authenticatedContext('employee-1').firestore();
    const managerDb = testEnv.authenticatedContext('manager-1').firestore();
    const hrDb = testEnv.authenticatedContext('hr-1').firestore();
    await assertSucceeds(getDoc(doc(employeeDb, `organizations/${orgId}/workerDirectory/worker-99`)));
    await assertSucceeds(getDoc(doc(employeeDb, `organizations/${orgId}/workers/worker-1`)));
    await assertFails(getDoc(doc(employeeDb, `organizations/${orgId}/workers/worker-99`)));
    await assertSucceeds(getDoc(doc(hrDb, `organizations/${orgId}/workers/worker-99`)));
    await assertFails(setDoc(doc(employeeDb, `organizations/${orgId}/workerDirectory/worker-1`), { id:'worker-1', displayName:'Tampered' }));
    await assertSucceeds(getDoc(doc(employeeDb, `organizations/${orgId}/assignments/assignment-own`)));
    await assertSucceeds(getDoc(doc(managerDb, `organizations/${orgId}/assignments/assignment-own`)));
    await assertFails(getDoc(doc(employeeDb, `organizations/${orgId}/assignments/assignment-other`)));
  });

  it('lets an employee read only their linked person record', async () => {
    const db = testEnv.authenticatedContext('employee-1').firestore();
    await assertSucceeds(getDoc(doc(db, `organizations/${orgId}/people/person-1`)));
    await assertFails(getDoc(doc(db, `organizations/${orgId}/people/person-2`)));
  });

  it('limits direct employment reads to HR or the employee who owns the record', async () => {
    const employeeDb = testEnv.authenticatedContext('employee-1').firestore();
    const managerDb = testEnv.authenticatedContext('manager-1').firestore();
    const hrDb = testEnv.authenticatedContext('hr-1').firestore();
    await assertSucceeds(getDoc(doc(employeeDb, `organizations/${orgId}/employments/employment-1`)));
    await assertFails(getDoc(doc(employeeDb, `organizations/${orgId}/employments/employment-99`)));
    await assertFails(getDoc(doc(managerDb, `organizations/${orgId}/employments/employment-1`)));
    await assertSucceeds(getDoc(doc(hrDb, `organizations/${orgId}/employments/employment-1`)));
    await assertFails(getDoc(doc(managerDb, `organizations/${orgId}/auditLogs/audit-1`)));
  });

  it('keeps workflow definitions, runs and step internals behind governed server APIs', async () => {
    const managerDb = testEnv.authenticatedContext('manager-1').firestore();
    const hrDb = testEnv.authenticatedContext('hr-1').firestore();
    for (const db of [managerDb, hrDb]) {
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workflowDefinitions/wf-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workflowRuns/wfr-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workflowStepRuns/wfs-1`)));
    }
  });

  it('keeps domain-event writes server-only even for HR admins', async () => {
    const db = testEnv.authenticatedContext('hr-1').firestore();
    await assertSucceeds(getDoc(doc(db, `organizations/${orgId}/domainEvents/event-1`)));
    await assertFails(setDoc(doc(db, `organizations/${orgId}/domainEvents/client-event`), { id:'client-event', status:'pending' }));
  });

  it('keeps scheduled secondary-assignment plans server-write-only', async () => {
    const employeeDb = testEnv.authenticatedContext('employee-1').firestore();
    const hrDb = testEnv.authenticatedContext('hr-1').firestore();
    await assertFails(getDoc(doc(employeeDb, `organizations/${orgId}/secondaryAssignmentPlans/plan-1`)));
    await assertSucceeds(getDoc(doc(hrDb, `organizations/${orgId}/secondaryAssignmentPlans/plan-1`)));
    await assertFails(setDoc(doc(hrDb, `organizations/${orgId}/secondaryAssignmentPlans/client-plan`), { id:'client-plan' }));
  });

  it('allows a targeted employee notification while keeping notification settings admin-scoped', async () => {
    const employeeDb = testEnv.authenticatedContext('employee-1').firestore();
    const hrDb = testEnv.authenticatedContext('hr-1').firestore();
    await assertSucceeds(getDoc(doc(employeeDb, `organizations/${orgId}/notifications/n-employee`)));
    await assertFails(getDoc(doc(employeeDb, `organizations/${orgId}/settings/notifications`)));
    await assertSucceeds(getDoc(doc(hrDb, `organizations/${orgId}/settings/notifications`)));
  });

  it('keeps automation-run evidence server-only while allowing HR admins to inspect it', async () => {
    const db = testEnv.authenticatedContext('hr-1').firestore();
    await assertSucceeds(getDoc(doc(db, `organizations/${orgId}/automationRuns/run-1`)));
    await assertFails(setDoc(doc(db, `organizations/${orgId}/automationRuns/client-run`), { id:'client-run', status:'completed' }));
  });

  it('aligns direct Firestore administration with API RBAC for HR partners', async () => {
    const db = testEnv.authenticatedContext('hrp-1').firestore();
    await assertFails(setDoc(doc(db, `organizations/${orgId}/orgUnits/unit-client`), { id:'unit-client', name:'Unauthorized unit' }));
    await assertFails(setDoc(doc(db, `organizations/${orgId}/workflowDefinitions/wf-client`), { id:'wf-client', name:'Unauthorized workflow', trigger:'manual', enabled:true }));
  });

  it('does not expose administrator-targeted notifications to HR partners', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `organizations/${orgId}/notifications/n-admin`), { id:'n-admin', targetRole:'hr_admin', status:'unread', createdAt:'2026-08-10T00:00:00Z' });
    });
    const db = testEnv.authenticatedContext('hrp-1').firestore();
    await assertFails(getDoc(doc(db, `organizations/${orgId}/notifications/n-admin`)));
  });

  it('limits direct requisition reads to the hiring manager while keeping candidate PII behind the server API', async () => {
    const managerDb = testEnv.authenticatedContext('manager-1').firestore();
    const hrDb = testEnv.authenticatedContext('hr-1').firestore();
    await assertSucceeds(getDoc(doc(managerDb, `organizations/${orgId}/requisitions/req-manager`)));
    await assertFails(getDoc(doc(managerDb, `organizations/${orgId}/requisitions/req-other`)));
    await assertFails(getDoc(doc(managerDb, `organizations/${orgId}/candidates/cand-1`)));
    await assertSucceeds(getDoc(doc(hrDb, `organizations/${orgId}/candidates/cand-1`)));
  });

  it('keeps recruiting writes server-only and compensation HR-scoped', async () => {
    const managerDb = testEnv.authenticatedContext('manager-1').firestore();
    const hrDb = testEnv.authenticatedContext('hr-1').firestore();
    await assertFails(setDoc(doc(hrDb, `organizations/${orgId}/applications/client-app`), { id:'client-app' }));
    await assertFails(getDoc(doc(managerDb, `organizations/${orgId}/offers/offer-1`)));
    await assertSucceeds(getDoc(doc(hrDb, `organizations/${orgId}/offers/offer-1`)));
  });

  it('keeps prehire case data and documents HR-scoped and server-write-only', async () => {
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    await assertFails(getDoc(doc(managerDb, `organizations/${orgId}/onboardingCases/case-1`)));
    await assertSucceeds(getDoc(doc(hrDb, `organizations/${orgId}/onboardingCases/case-1`)));
    await assertFails(getDoc(doc(managerDb, `organizations/${orgId}/prehireDocuments/doc-1`)));
    await assertSucceeds(getDoc(doc(hrDb, `organizations/${orgId}/prehireDocuments/doc-1`)));
    await assertFails(setDoc(doc(hrDb, `organizations/${orgId}/onboardingTasks/client-task`), { id:'client-task' }));
  });

  it('never exposes the global hashed prehire access index to clients', async () => {
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    await assertFails(getDoc(doc(hrDb, `prehireAccessIndex/hash-1`)));
    await assertFails(setDoc(doc(hrDb, `prehireAccessIndex/client-hash`), { orgId, caseId:'case-1', status:'active' }));
  });

  it('keeps governed document, policy, retention and compliance records behind the server API', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    await assertFails(getDoc(doc(employeeDb, `organizations/${orgId}/employeeDocuments/gov-doc-1`)));
    await assertFails(getDoc(doc(hrDb, `organizations/${orgId}/employeeDocuments/gov-doc-1`)));
    await assertFails(getDoc(doc(employeeDb, `organizations/${orgId}/policies/policy-1`)));
    await assertFails(setDoc(doc(hrDb, `organizations/${orgId}/retentionRules/client-rule`), { id:'client-rule' }));
    await assertFails(setDoc(doc(hrDb, `organizations/${orgId}/complianceRequirements/client-req`), { id:'client-req' }));
  });


  it('keeps leave, time-entry, timesheet and payroll data behind the scoped server API', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/leaveRequests/leave-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/timeEntries/time-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/timesheets/sheet-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/timePolicies/client-policy`), { id:'client-policy' }));
    }
  });

  it('keeps separation, offboarding and exit-interview evidence behind the scoped server API', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/separationCases/sep-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/separationTasks/sep-task-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/exitInterviews/exit-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/separationCases/client-sep`), { id:'client-sep' }));
    }
  });


  it('keeps lifecycle diagnostics, template registry and replacement dedupe state behind server APIs', async () => {
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    for(const db of [hrDb,managerDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/notificationTemplates/template-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/lifecycleDiagnosticRuns/diag-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/replacementRequisitionIndex/sep-1`)));
    }
  });


  it('keeps performance reviews, 360 evidence and PIPs behind scoped server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/performanceReviews/review-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/feedbackResponses/feedback-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/performanceImprovementPlans/pip-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/performanceGoals/client-goal`), { id:'client-goal', workerId:'worker-1' }));
    }
  });


  it('keeps skills, learning assignments, certificates and learning administration behind server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/skills/skill-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workerSkills/worker-1_skill-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/learningAssignments/learn-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/learningCertificates/cert-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/courses/client-course`), { id:'client-course', code:'BAD', status:'published' }));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/learningPathCodeIndex/client-path`)));
    }
  });


  it('keeps career profiles, succession nominations and talent assessments behind scoped server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/careerProfiles/worker-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/internalMobilityInterests/worker-1_pos-2`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/criticalPositions/pos-2`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/successorNominations/pos-2_worker-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/talentAssessments/worker-1_2026`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/careerProfiles/client-profile`), { id:'client-profile', workerId:'worker-1' }));
    }
  });


  it('keeps compensation, pay-equity and salary-structure evidence behind scoped server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workerCompensationCurrent/worker-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/salaryBands/band-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/compensationRecommendations/cycle_worker-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/payEquityJobClasses/CLASS-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/requisitionCompensationDisclosures/req-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/workerCompensationCurrent/client-pay`), { workerId:'worker-1', annualizedBasePay:999999 }));
    }
  });

  it('keeps employee-relations, investigation, accommodation and legal-hold evidence behind server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/employeeRelationsCases/er-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/employeeRelationsEvidence/ev-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/employeeRelationsInterviews/int-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/employeeAccommodationPlans/ac-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/employeeRelationsFindings/client-finding`), { id:'client-finding' }));
    }
  });

  it('keeps safety incidents, investigations, RTW and committee records behind scoped server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/safetyIncidents/inc-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/safetyInvestigations/inv-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/returnToWorkPlans/rtw-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/safetyCommitteeProfiles/primary`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/safetyCommitteeRecommendations/rec-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/safetyCorrectiveActions/client-action`), { id:'client-action' }));
    }
  });


  it('keeps survey responses, anonymous participation indexes and HR service records behind server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/surveyResponses/resp-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/surveyParticipationIndex/hash-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/hrServiceTickets/ticket-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/serviceTicketComments/comment-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/employeeSurveys/client-survey`), { id:'client-survey' }));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/knowledgeArticles/client-article`), { id:'client-article' }));
    }
  });


  it('keeps workforce plans, scenarios, snapshots and demand behind the server API', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workforcePlans/plan-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workforceSnapshots/snap-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workforceScenarios/scenario-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workforceDemand/demand-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/workforcePlans/client-plan`), { id:'client-plan' }));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/workforcePlanCodeIndex/PLAN_2027`)));
    }
  });


  it('keeps metric definitions, analytics snapshots and forecast evidence behind server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/analyticsMetrics/metric-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/analyticsSnapshots/daily_2026-08-10`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/analyticsForecastModels/model-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/analyticsForecastRuns/run-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/analyticsSnapshots/client-snapshot`), { id:'client-snapshot' }));
    }
  });


  it('keeps HR diagnostic frameworks, assessments, findings and remediation behind server APIs', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/diagnosticFrameworks/framework-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/diagnosticControls/control-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/diagnosticAssessments/assessment-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/diagnosticControlResults/result-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/diagnosticFindings/finding-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/diagnosticRemediationPlans/plan-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/diagnosticAssessments/client-assessment`), { id:'client-assessment' }));
    }
  });

});

describe('v2.3 enterprise governance collections',()=>{
  it('keeps control, attestation, exception and risk records server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      await assertFails(getDoc(doc(db, `organizations/${orgId}/governanceControls/control-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/governanceAttestations/att-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/governanceExceptions/exception-1`)));
      await assertFails(getDoc(doc(db, `organizations/${orgId}/governanceRisks/risk-1`)));
      await assertFails(setDoc(doc(db, `organizations/${orgId}/governanceControls/client-write`), {id:'client-write'}));
    }
  });
});


describe('v2.4 policy and regulatory change collections',()=>{
  it('keeps source snapshots, changes, obligations, impacts, campaigns and legal review server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    for(const db of [employeeDb,managerDb,hrDb]){
      for(const [collection,id] of [['regulatorySources','source-1'],['regulatorySourceSnapshots','snapshot-1'],['regulatoryChanges','change-1'],['regulatoryObligations','obligation-1'],['policyImpactAssessments','impact-1'],['policyReattestationCampaigns','campaign-1'],['legalReviewQueue','review-1']]){
        await assertFails(getDoc(doc(db, `organizations/${orgId}/${collection}/${id}`)));
      }
      await assertFails(setDoc(doc(db, `organizations/${orgId}/regulatoryChanges/client-write`), {id:'client-write'}));
    }
  });
});

describe('v2.5 compliance evidence, audit and assurance collections',()=>{
  it('keeps assurance evidence, ledger, plans, tests, requests, sampling, findings, CAPA and reports server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['assuranceEvidence','evidence-1'],['assuranceEvidenceLedger','ledger-1'],['assuranceEvidenceCodeIndex','code-1'],['assurancePlanCodeIndex','plan-code-1'],['assuranceFindingCodeIndex','finding-code-1'],['assurancePlans','plan-1'],['assuranceTests','test-1'],['assuranceEvidenceRequests','request-1'],['assuranceSamples','sample-1'],['assuranceFindings','finding-1'],['assuranceCapaPlans','capa-1'],['assuranceReports','report-1']];
    for(const db of [employeeDb,managerDb,hrDb]){
      for(const [collection,id] of collections)await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));
      await assertFails(setDoc(doc(db,`organizations/${orgId}/assuranceEvidence/client-write`),{id:'client-write'}));
      await assertFails(setDoc(doc(db,`organizations/${orgId}/assuranceFindings/client-write`),{id:'client-write'}));
    }
  });
});

describe('v2.6 privacy, data governance and AI assurance collections',()=>{
  it('keeps privacy inventories, assessments, requests, incidents, vendors, transfers and AI-risk records server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['privacyDataAssets','asset-1'],['privacyDataAssetCodeIndex','asset-code-1'],['privacyProcessingActivities','processing-1'],['privacyProcessingCodeIndex','processing-code-1'],['privacyRetentionSchedules','retention-1'],['privacyRetentionCodeIndex','retention-code-1'],['privacyAssessments','assessment-1'],['privacyAssessmentCodeIndex','assessment-code-1'],['privacyRequests','request-1'],['privacyIncidents','incident-1'],['privacyVendors','vendor-1'],['privacyVendorCodeIndex','vendor-code-1'],['privacyTransfers','transfer-1'],['privacyTransferCodeIndex','transfer-code-1'],['privacyAiUseCases','use-case-1'],['privacyAiUseCaseCodeIndex','use-case-code-1'],['privacyAiModelRisks','model-risk-1'],['privacyAiModelRiskCodeIndex','model-risk-code-1']];
    for(const db of [employeeDb,managerDb,hrDb]){
      for(const [collection,id] of collections)await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));
      await assertFails(setDoc(doc(db,`organizations/${orgId}/privacyIncidents/client-write`),{id:'client-write'}));
      await assertFails(setDoc(doc(db,`organizations/${orgId}/privacyAiUseCases/client-write`),{id:'client-write'}));
    }
  });
});


describe('v2.7 workforce resilience, continuity and crisis collections',()=>{
  it('keeps critical-role, BIA, continuity, incident, recovery, exercise and report records server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['resilienceCriticalRoles','role-1'],['resilienceCriticalRoleCodeIndex','role-code'],['resilienceImpactAnalyses','bia-1'],['resilienceImpactCodeIndex','bia-code'],['resilienceContinuityPlans','plan-1'],['resilienceContinuityPlanCodeIndex','plan-code'],['resilienceIncidents','incident-1'],['resilienceRecoveryPlans','recovery-1'],['resilienceRecoveryPlanCodeIndex','recovery-code'],['resilienceExercises','exercise-1'],['resilienceExerciseCodeIndex','exercise-code'],['resilienceReports','report-1']];
    for(const db of [employeeDb,managerDb,hrDb]){
      for(const [collection,id] of collections)await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));
      await assertFails(setDoc(doc(db,`organizations/${orgId}/resilienceIncidents/client-write`),{id:'client-write'}));
      await assertFails(setDoc(doc(db,`organizations/${orgId}/resilienceCriticalRoles/client-write`),{id:'client-write'}));
    }
  });
});

describe('v2.8 human capital strategy collections',()=>{
  it('keeps strategy objectives, capability gaps, scenarios, initiatives, risk appetite and reports server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['strategyObjectives','objective-1'],['strategyObjectiveCodeIndex','objective-code'],['strategyCapabilityGaps','gap-1'],['strategyCapabilityCodeIndex','gap-code'],['strategyScenarios','scenario-1'],['strategyScenarioCodeIndex','scenario-code'],['strategyInitiatives','initiative-1'],['strategyInitiativeCodeIndex','initiative-code'],['strategyRiskAppetite','appetite-1'],['strategyReports','report-1']];
    for(const db of [employeeDb,managerDb,hrDb]){for(const [collection,id] of collections)await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));await assertFails(setDoc(doc(db,`organizations/${orgId}/strategyObjectives/client-write`),{id:'client-write'}));}
  });
});

describe('v2.9 organization design and operating model collections',()=>{
  it('keeps snapshots, role architecture, decision rights, scenarios, restructuring, KPIs and reports server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['orgDesignSnapshots','snapshot-1'],['orgDesignSnapshotCodeIndex','snapshot-code'],['orgDesignRoleProfiles','role-1'],['orgDesignRoleProfileCodeIndex','role-code'],['orgDesignDecisionRights','decision-1'],['orgDesignDecisionCodeIndex','decision-code'],['orgDesignScenarios','scenario-1'],['orgDesignScenarioCodeIndex','scenario-code'],['orgDesignRestructuringProposals','proposal-1'],['orgDesignRestructuringCodeIndex','proposal-code'],['orgDesignKpis','kpi-1'],['orgDesignKpiCodeIndex','kpi-code'],['orgDesignReports','report-1']];
    for(const db of [employeeDb,managerDb,hrDb]){for(const [collection,id] of collections)await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));await assertFails(setDoc(doc(db,`organizations/${orgId}/orgDesignRestructuringProposals/client-write`),{id:'client-write'}));}
  });
});

describe('v3.0 enterprise HCM command-center collections',()=>{
  it('keeps actions, data-quality snapshots, SLOs, release assessments and reports server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['commandCenterActions','action-1'],['commandCenterActionCodeIndex','action-code'],['commandCenterDataQualitySnapshots','dq-1'],['commandCenterSlos','slo-1'],['commandCenterSloCodeIndex','slo-code'],['commandCenterReleaseAssessments','release-1'],['commandCenterReports','report-1']];
    for(const db of [employeeDb,managerDb,hrDb]){for(const [collection,id] of collections)await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));await assertFails(setDoc(doc(db,`organizations/${orgId}/commandCenterActions/client-write`),{id:'client-write'}));}
  });
});


describe('v3.2 enterprise integration runtime and data exchange collections',()=>{
  it('keeps connector, contract, run, staging, idempotency, exception and event records server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['integrationConnectors','connector-1'],['integrationConnectorCodeIndex','connector-code'],['integrationContracts','contract-1'],['integrationContractCodeIndex','contract-code'],['integrationRuns','run-1'],['integrationIdempotencyIndex','idempotency-1'],['integrationStagingRecords','stage-1'],['integrationDeadLetters','dlq-1'],['integrationReconciliations','rec-1'],['integrationEvents','event-1'],['integrationAdapterProfiles','profile-1'],['integrationAdapterCodeIndex','profile-code'],['integrationRuntimeStates','runtime-1'],['integrationSchedules','schedule-1'],['integrationScheduleCodeIndex','schedule-code'],['integrationWebhookReceipts','receipt-1'],['integrationWebhookSignatureIndex','signature-1'],['integrationReplayRequests','replay-1'],['integrationSandboxRuns','sandbox-1']];
    for(const db of [employeeDb,managerDb,hrDb]){for(const [collection,id] of collections)await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));await assertFails(setDoc(doc(db,`organizations/${orgId}/integrationStagingRecords/client-write`),{id:'client-write'}));}
  });
});


describe('v3.3 enterprise identity, SSO and provisioning collections',()=>{
  it('keeps federation, access, reconciliation, session and provisioning records server-only',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['identityProviders','provider-1'],['identityProviderCodeIndex','provider-code'],['identityProviderTests','test-1'],['identityRoleMappings','mapping-1'],['identityRoleMappingCodeIndex','mapping-code'],['identityAccounts','account-1'],['identityAccessRequests','request-1'],['identityAccessReviews','review-1'],['identityAccessReviewCodeIndex','review-code'],['identityAccessReviewItems','review-item-1'],['identityProvisioningRequests','provisioning-1'],['identityReconciliations','reconciliation-1'],['identitySessionEvidence','session-1']];
    for(const db of [employeeDb,managerDb,hrDb]){
      for(const [collection,id] of collections)await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));
      await assertFails(setDoc(doc(db,`organizations/${orgId}/identityAccounts/client-write`),{id:'client-write'}));
      await assertFails(setDoc(doc(db,`organizations/${orgId}/identityAccessRequests/client-write`),{id:'client-write'}));
    }
  });
});


describe('v3.4 security operations collections',()=>{
  it('denies direct browser access to v3.4 security operations collections', async () => {
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['securityEvents','event-1'],['securityEventSignatureIndex','signature-1'],['securityIncidents','incident-1'],['securityIncidentCodeIndex','incident-code'],['securityPrivilegedAccess','priv-1'],['securityPrivilegedAccessCodeIndex','priv-code'],['securityBreakGlass','bg-1'],['securityBreakGlassCodeIndex','bg-code'],['securityKeyRotations','rotation-1'],['securityKeyRotationCodeIndex','rotation-code'],['securityRecertifications','recert-1'],['securityRecertificationCodeIndex','recert-code'],['securityPostureSnapshots','snapshot-1'],['securitySiemExports','siem-export-1']];
    for(const db of [employeeDb,managerDb,hrDb]){
      for(const [collection,id] of collections){
        await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));
        await assertFails(setDoc(doc(db,`organizations/${orgId}/${collection}/${id}`),{id}));
      }
    }
  });

});

describe('v3.5 platform reliability collections',()=>{
  it('denies direct browser access to v3.5 platform reliability and supply-chain collections',async()=>{
    const employeeDb=testEnv.authenticatedContext('employee-1').firestore();
    const managerDb=testEnv.authenticatedContext('manager-1').firestore();
    const hrDb=testEnv.authenticatedContext('hr-1').firestore();
    const collections=[['platformSboms','sbom-1'],['platformSupplyChainScans','scan-1'],['platformSupplyChainScanCodeIndex','scan-code'],['platformBuildProvenance','prov-1'],['platformBuildProvenanceCodeIndex','prov-code'],['platformBackupPolicies','backup-1'],['platformBackupPolicyCodeIndex','backup-code'],['platformBackupEvidence','backup-evidence-1'],['platformDrPlans','dr-1'],['platformDrPlanCodeIndex','dr-code'],['platformDrExercises','exercise-1'],['platformConfigBaselines','baseline-1'],['platformConfigBaselineCodeIndex','baseline-code'],['platformDriftSnapshots','drift-1'],['platformIncidents','incident-1'],['platformIncidentCodeIndex','incident-code'],['platformServiceObjectives','slo-1'],['platformServiceObjectiveCodeIndex','slo-code'],['platformReliabilitySnapshots','snapshot-1']];
    for(const db of [employeeDb,managerDb,hrDb])for(const [collection,id]of collections){await assertFails(getDoc(doc(db,`organizations/${orgId}/${collection}/${id}`)));await assertFails(setDoc(doc(db,`organizations/${orgId}/${collection}/${id}`),{id}));}
  });
});
