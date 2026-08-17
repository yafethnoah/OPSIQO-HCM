import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { Assignment, Employment, Position, Worker } from '@/domain/hr';
import type { Application, Requisition } from '@/domain/recruiting';
import type { OnboardingCase, OnboardingTask } from '@/domain/onboarding';
import type { SeparationCase, SeparationTask } from '@/domain/separation';
import type { TimeException } from '@/domain/time';
import type { PerformanceReview } from '@/domain/performance';
import type { LifecycleAlert, LifecycleDashboard, LifecycleDiagnostics, LifecycleSeverity, DataQualityFinding } from '@/domain/lifecycle';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { createRequisition } from '@/lib/recruiting/service';
import { complianceDashboard } from '@/lib/compliance/service';
import { learningDashboard } from '@/lib/learning/service';
import { careerDashboard } from '@/lib/career/service';
import { compensationDashboard } from '@/lib/compensation/service';
import { employeeRelationsDashboard } from '@/lib/employee-relations/service';
import { safetyDashboard } from '@/lib/safety/service';
import { experienceDashboard } from '@/lib/experience/service';
import { workforcePlanningDashboard } from '@/lib/workforce-planning/service';
import { diagnosticDashboard } from '@/lib/hr-diagnostic/service';
import { resilienceDashboard } from '@/lib/resilience/service';
import { strategyDashboard } from '@/lib/strategy/service';
import { orgDesignDashboard } from '@/lib/org-design/service';
import { integrationDashboard } from '@/lib/integration/service';
import { identityDashboard } from '@/lib/identity/service';
import { securityOpsDashboard } from '@/lib/security-operations/service';
import { platformReliabilityDashboard } from '@/lib/platform-reliability/service';
import { replacementRequisitionSchema } from './schemas';

const now=()=>new Date().toISOString();
const today=()=>now().slice(0,10);
const adminRoles=new Set(['super_admin','org_admin','hr_admin']);
const hrRoles=new Set(['super_admin','org_admin','hr_admin','hr_partner']);
const SCAN_LIMIT=1000;

async function rows<T>(orgId:string, collection:string, limit=SCAN_LIMIT):Promise<{data:T[];sampled:boolean}>{
  const snap=await adminDb().collection(`organizations/${orgId}/${collection}`).limit(limit+1).get();
  return {data:snap.docs.slice(0,limit).map(d=>d.data() as T), sampled:snap.size>limit};
}
async function count(orgId:string, collection:string, field?:string, op?:any, value?:unknown){
  let q:any=adminDb().collection(`organizations/${orgId}/${collection}`);
  if(field&&op) q=q.where(field,op,value);
  const snap=await q.count().get(); return Number(snap.data().count||0);
}
function sevWeight(s:LifecycleSeverity){return s==='critical'?12:s==='high'?7:s==='warning'?3:1;}
function finding(code:string,severity:LifecycleSeverity,title:string,description:string,entityType:string,entityId:string|undefined,href:string,recommendedAction:string):DataQualityFinding{
  return {id:`${code}:${entityId||'org'}`,code,severity,title,description,entityType,entityId,href,recommendedAction};
}

export async function lifecycleDiagnostics(actor:ActorContext):Promise<LifecycleDiagnostics>{
  if(!hrRoles.has(actor.role) && actor.role!=='manager') throw new ApiError(403,'Lifecycle diagnostics require manager or HR access.','forbidden');
  const db=adminDb();
  const [workersR,assignmentsR,employmentsR,positionsR,occupancyR,onboardingR,onTasksR,separationsR,sepTasksR,timeExceptionsR,automationR]=await Promise.all([
    rows<Worker>(actor.orgId,'workers'),rows<Assignment>(actor.orgId,'assignments'),rows<Employment>(actor.orgId,'employments'),rows<Position>(actor.orgId,'positions'),rows<any>(actor.orgId,'positionOccupancy'),rows<OnboardingCase>(actor.orgId,'onboardingCases'),rows<OnboardingTask>(actor.orgId,'onboardingTasks'),rows<SeparationCase>(actor.orgId,'separationCases'),rows<SeparationTask>(actor.orgId,'separationTasks'),rows<TimeException>(actor.orgId,'timeExceptions'),rows<any>(actor.orgId,'automationRuns',50),
  ]);
  let workers=workersR.data;
  if(actor.role==='manager'&&actor.workerId){const allowed=new Set(assignmentsR.data.filter(a=>!a.endDate&&a.managerWorkerId===actor.workerId).map(a=>a.workerId));workers=workers.filter(w=>allowed.has(w.id)||w.id===actor.workerId);}
  const workerIds=new Set(workers.map(w=>w.id));
  const assignments=new Map(assignmentsR.data.map(a=>[a.id,a]));
  const positions=new Map(positionsR.data.map(p=>[p.id,p]));
  const findings:DataQualityFinding[]=[];
  const emailOwners=new Map<string,Worker[]>();for(const w of workers){const key=(w.workEmailLower||w.workEmail||'').trim().toLowerCase();if(key){const a=emailOwners.get(key)||[];a.push(w);emailOwners.set(key,a);}}for(const [email,owners] of emailOwners){if(owners.length>1)findings.push(finding('DUPLICATE_WORK_EMAIL','critical','Duplicate work email detected',`${owners.length} worker records share ${email}.`,'worker',owners[0]?.id,'/people','Resolve duplicate worker identities before authentication, payroll, or notification processing.'));}
  const activeEmploymentByWorker=new Set(employmentsR.data.filter(e=>e.status==='active'&&!e.endDate).map(e=>e.workerId));
  for(const w of workers){
    if(w.status==='active'&&!activeEmploymentByWorker.has(w.id)) findings.push(finding('ACTIVE_WORKER_NO_EMPLOYMENT','critical','Active worker has no active employment',`${w.displayName} is active but has no active employment record.`,'worker',w.id,`/people?workerId=${encodeURIComponent(w.id)}`,'Create or repair the employment record before further lifecycle processing.'));
    if(w.status==='active'&&w.terminationDate) findings.push(finding('ACTIVE_WORKER_TERMINATION_DATE','high','Active worker has a termination date',`${w.displayName} is active but has termination date ${w.terminationDate}.`,'worker',w.id,`/people?workerId=${encodeURIComponent(w.id)}`,'Confirm the worker status/effective date and repair the lifecycle state.'));
    if(w.status==='active'&&!w.primaryAssignmentId) findings.push(finding('ACTIVE_WORKER_NO_PRIMARY','critical','Active worker has no primary assignment',`${w.displayName} is active but has no primary assignment reference.`,'worker',w.id,`/people?workerId=${encodeURIComponent(w.id)}`,'Assign a valid primary position or correct the worker status.'));
    if(w.primaryAssignmentId){const a=assignments.get(w.primaryAssignmentId);if(!a) findings.push(finding('PRIMARY_ASSIGNMENT_MISSING','critical','Primary assignment record is missing',`${w.displayName} references assignment ${w.primaryAssignmentId}, but that assignment does not exist.`,'worker',w.id,`/people?workerId=${encodeURIComponent(w.id)}`,'Repair the assignment reference and rebuild position occupancy.'));else{
      if(a.workerId!==w.id) findings.push(finding('PRIMARY_ASSIGNMENT_WRONG_WORKER','critical','Primary assignment belongs to another worker',`${w.displayName}'s primary assignment is linked to worker ${a.workerId}.`,'assignment',a.id,`/people?workerId=${encodeURIComponent(w.id)}`,'Correct the assignment/worker relationship before further HR changes.'));
      if(!positions.has(a.positionId)) findings.push(finding('ASSIGNMENT_POSITION_MISSING','high','Assignment references a missing position',`${w.displayName}'s active assignment points to position ${a.positionId}, which cannot be found.`,'assignment',a.id,`/organization`,'Restore or replace the missing position reference.'));
    }}
  }
  const day=today(),activeAssignments=assignmentsR.data.filter(a=>a.startDate<=day&&(!a.endDate||a.endDate>=day));const actual=new Map<string,{headcount:number;fte:number}>();for(const a of activeAssignments){const x=actual.get(a.positionId)||{headcount:0,fte:0};x.headcount++;x.fte+=Number(a.allocationFte??1);actual.set(a.positionId,x);}const stored=new Map(occupancyR.data.map((o:any)=>[String(o.positionId||o.id),o]));for(const [positionId,a] of actual){const o:any=stored.get(positionId);if(!o||Number(o.occupiedHeadcount||0)!==a.headcount||Math.abs(Number(o.occupiedFte||0)-a.fte)>.001)findings.push(finding('POSITION_OCCUPANCY_DRIFT','high','Position occupancy is out of sync',`Position ${positionId} has ${a.headcount} active assignment(s) / ${a.fte.toFixed(2)} FTE but cached occupancy differs.`,'position',positionId,'/organization','Run the occupancy rebuild and investigate any assignment dates causing the mismatch.'));}
  const latestAutomation=[...automationR.data].sort((a:any,b:any)=>String(b.startedAt||'').localeCompare(String(a.startedAt||'')))[0] as any;if(latestAutomation?.status==='failed')findings.push(finding('LATEST_AUTOMATION_FAILED','critical','Latest automation cycle failed',String(latestAutomation.lastError||'The latest automation run failed.'),'automationRun',String(latestAutomation.id||latestAutomation.runId||''),'/automation','Review the failure, correct the underlying issue, and rerun the controlled automation cycle.'));
  const start=today();
  const scopedOnboarding=onboardingR.data.filter(c=>actor.role!=='manager'||c.managerWorkerId===actor.workerId);
  const scopedOnboardingIds=new Set(scopedOnboarding.map(c=>c.id));
  for(const c of scopedOnboarding){
    if(['in_progress','ready_for_activation'].includes(c.status)&&c.startDate<start) findings.push(finding('ONBOARDING_START_PASSED','high','Prehire start date has passed',`${c.candidateDisplayName} has start date ${c.startDate} but onboarding is still ${c.status.replaceAll('_',' ')}.`,'onboardingCase',c.id,`/onboarding`,'Review activation blockers immediately and either activate, reschedule, or cancel the case.'));
  }
  for(const t of onTasksR.data.filter(t=>t.status==='overdue'&&(actor.role!=='manager'||scopedOnboardingIds.has(t.caseId)))) findings.push(finding('ONBOARDING_TASK_OVERDUE','warning','Onboarding task overdue',`${t.title} is overdue.`,'onboardingTask',t.id,'/onboarding','Assign an owner and complete or formally waive the overdue control.'));
  const scopedSeparations=separationsR.data.filter(c=>actor.role!=='manager'||c.managerWorkerId===actor.workerId||c.workerId===actor.workerId);
  const scopedSeparationIds=new Set(scopedSeparations.map(c=>c.id));
  for(const c of scopedSeparations){if(c.status!=='closed'&&c.status!=='cancelled'&&c.effectiveDate<start) findings.push(finding('SEPARATION_EFFECTIVE_PASSED','high','Separation effective date passed',`Case ${c.id} reached ${c.effectiveDate} but remains ${c.status.replaceAll('_',' ')}.`,'separationCase',c.id,'/separations','Resolve closure blockers and complete the separation or document why it remains open.'));}
  for(const t of sepTasksR.data.filter(t=>t.status==='overdue'&&(actor.role!=='manager'||scopedSeparationIds.has(t.caseId)))) findings.push(finding('SEPARATION_TASK_OVERDUE','warning','Offboarding task overdue',`${t.title} is overdue.`,'separationTask',t.id,'/separations','Complete, reassign, or formally waive the overdue offboarding control.'));
  for(const x of timeExceptionsR.data.filter(x=>x.status==='open'&&x.severity==='high'&&(actor.role!=='manager'||workerIds.has(x.workerId)))) findings.push(finding('HIGH_TIME_EXCEPTION','high','High-risk time exception remains open',x.message,'timeException',x.id,'/time','Review and resolve the exception before payroll approval.'));
  const counts:{critical:number;high:number;warning:number;info:number}={critical:0,high:0,warning:0,info:0};for(const f of findings)counts[f.severity]++;
  const penalty=Math.min(100,findings.reduce((n,f)=>n+sevWeight(f.severity),0));
  return {score:Math.max(0,100-penalty),scannedAt:now(),findings:findings.slice(0,250),counts,sampled:[workersR,assignmentsR,employmentsR,positionsR,occupancyR,onboardingR,onTasksR,separationsR,sepTasksR,timeExceptionsR,automationR].some(x=>x.sampled),sampleLimit:SCAN_LIMIT};
}

export async function lifecycleDashboard(actor:ActorContext):Promise<LifecycleDashboard>{
  if(!hrRoles.has(actor.role)&&actor.role!=='manager') throw new ApiError(403,'Lifecycle command center requires manager or HR access.','forbidden');
  const db=adminDb(); const [diagnostics,compliance,learning,career,compensation,employeeRelations,safety,experience,workforcePlanning,hrDiagnostic,resilience,strategy,orgDesign,integration,identity,securityOps,platform]=await Promise.all([lifecycleDiagnostics(actor),complianceDashboard(actor),learningDashboard(actor),careerDashboard(actor),compensationDashboard(actor),actor.permissions.includes('er.read')?employeeRelationsDashboard(actor):Promise.resolve({metrics:{openCases:0,highRisk:0,investigations:0,overdueActions:0,accommodationsDue:0,outcomeNoticesDue:0,closedYtd:0},cases:[],overdueActions:[],reviewDueAccommodations:[]}),actor.permissions.includes('safety.read')?safetyDashboard(actor):Promise.resolve({metrics:{openIncidents:0,criticalIncidents:0,openHazards:0,highRiskHazards:0,overdueActions:0,rtwActive:0,reportingReviews:0,inspectionsDue:0},incidents:[],hazards:[],actions:[]}),experienceDashboard(actor),actor.permissions.includes('workforce.read')?workforcePlanningDashboard(actor):Promise.resolve(undefined),actor.permissions.includes('diagnostic.read')?diagnosticDashboard(actor):Promise.resolve(undefined),actor.permissions.includes('resilience.read')?resilienceDashboard(actor):Promise.resolve(undefined),actor.permissions.includes('strategy.read')?strategyDashboard(actor):Promise.resolve(undefined),actor.permissions.includes('orgdesign.read')?orgDesignDashboard(actor):Promise.resolve(undefined),actor.permissions.includes('integration.read')?integrationDashboard(actor):Promise.resolve(undefined),actor.permissions.includes('identity.read')?identityDashboard(actor):Promise.resolve(undefined),actor.permissions.includes('securityops.read')?securityOpsDashboard(actor):Promise.resolve(undefined),actor.permissions.includes('platform.read')?platformReliabilityDashboard(actor):Promise.resolve(undefined)]);
  let activeWorkers=0,openPositions=0,openReqs=0,activeApps=0,activeOnboarding=0,openTime=0,activeSeparations=0,pendingOffers=0,openPerformance=0;
  if(actor.role==='manager'&&actor.workerId){
    const [workerRows,assignmentRows,reqRows,appRows,offerRows,onboardingRows,timeRows,separationRows,positionRows,performanceRows]=await Promise.all([
      rows<Worker>(actor.orgId,'workers'),rows<Assignment>(actor.orgId,'assignments'),rows<Requisition>(actor.orgId,'requisitions'),rows<Application>(actor.orgId,'applications'),rows<any>(actor.orgId,'offers'),rows<OnboardingCase>(actor.orgId,'onboardingCases'),rows<TimeException>(actor.orgId,'timeExceptions'),rows<SeparationCase>(actor.orgId,'separationCases'),rows<Position>(actor.orgId,'positions'),rows<PerformanceReview>(actor.orgId,'performanceReviews')
    ]);
    const teamIds=new Set(assignmentRows.data.filter(a=>!a.endDate&&a.managerWorkerId===actor.workerId).map(a=>a.workerId));teamIds.add(actor.workerId);
    activeWorkers=workerRows.data.filter(w=>teamIds.has(w.id)&&w.status==='active').length;
    const reqs=reqRows.data.filter(r=>r.hiringManagerWorkerId===actor.workerId);const reqIds=new Set(reqs.map(r=>r.id));openReqs=reqs.filter(r=>r.status==='open').length;
    activeApps=appRows.data.filter(a=>reqIds.has(a.requisitionId)&&['applied','screening','interview','assessment','offer'].includes(a.stage)).length;
    pendingOffers=offerRows.data.filter((o:any)=>reqIds.has(o.requisitionId)&&['approved','sent','accepted'].includes(o.status)).length;
    activeOnboarding=onboardingRows.data.filter(c=>c.managerWorkerId===actor.workerId&&['in_progress','ready_for_activation'].includes(c.status)).length;
    openTime=timeRows.data.filter(x=>teamIds.has(x.workerId)&&x.status==='open').length;
    activeSeparations=separationRows.data.filter(c=>(c.managerWorkerId===actor.workerId||c.workerId===actor.workerId)&&['draft','pending_approval','approved','in_progress','ready_to_close'].includes(c.status)).length;
    const teamPositionIds=new Set(assignmentRows.data.filter(a=>teamIds.has(a.workerId)&&!a.endDate).map(a=>a.positionId));openPositions=positionRows.data.filter(p=>teamPositionIds.has(p.id)&&p.status==='open').length;
    openPerformance=performanceRows.data.filter(r=>r.managerWorkerId===actor.workerId&&r.status!=='completed').length;
  }else{
    [activeWorkers,openPositions,openReqs,activeApps,activeOnboarding,openTime,activeSeparations,pendingOffers,openPerformance]=await Promise.all([
      count(actor.orgId,'workers','status','==','active'),count(actor.orgId,'positions','status','==','open'),count(actor.orgId,'requisitions','status','==','open'),
      count(actor.orgId,'applications','stage','in',['applied','screening','interview','assessment','offer']),count(actor.orgId,'onboardingCases','status','in',['in_progress','ready_for_activation']),
      count(actor.orgId,'timeExceptions','status','==','open'),count(actor.orgId,'separationCases','status','in',['draft','pending_approval','approved','in_progress','ready_to_close']),count(actor.orgId,'offers','status','in',['approved','sent','accepted']),count(actor.orgId,'performanceReviews','status','in',['not_started','self_in_progress','awaiting_manager','manager_in_progress','awaiting_calibration'])
    ]);
  }
  const complianceGaps=Number(compliance.metrics?.gaps||0);
  const skillGaps=Number(learning.metrics.find(m=>m.key==='skillGaps')?.value||0);
  const overdueLearning=learning.assignments.filter(a=>a.dueAt&&a.dueAt<now()&&!['completed','waived','expired'].includes(a.status)).length;
  const uncoveredCritical=career.successionRisks.filter(r=>r.coverageStatus==='uncovered').length;
  const openMobility=career.interests.filter(i=>['interested','applied'].includes(i.status)).length;
  const outOfBand=Number(compensation.metrics.find(m=>m.key==='outOfRange')?.value||0);
  const openCompRecommendations=Number(compensation.metrics.find(m=>m.key==='pending')?.value||0);
  const highPayEquityFlags=Number(compensation.metrics.find(m=>m.key==='payEquity')?.value||0);
  const openErCases=Number(employeeRelations.metrics.openCases||0);
  const highRiskEr=Number(employeeRelations.metrics.highRisk||0);
  const overdueErActions=Number(employeeRelations.metrics.overdueActions||0);
  const openSafetyIncidents=Number(safety.metrics.openIncidents||0);
  const criticalSafetyIncidents=Number(safety.metrics.criticalIncidents||0);
  const highRiskSafetyHazards=Number(safety.metrics.highRiskHazards||0);
  const safetyReportingReviews=Number(safety.metrics.reportingReviews||0);
  const overdueSafetyActions=Number(safety.metrics.overdueActions||0);
  const openServiceTickets=Number(experience.metrics.openTickets||0);
  const serviceSlaBreaches=Number(experience.metrics.slaBreached||0);
  const activeExperienceSurveys=Number(experience.metrics.activeSurveys||0);
  const workforceVacancies=Number(workforcePlanning?.baseline.vacantPositions||0);
  const workforceCost=Number(workforcePlanning?.baseline.estimatedEmployerCost||0);
  const workforceRisks=Number(workforcePlanning?.risks.filter(r=>['high','critical'].includes(r.severity)).length||0);
  let approvedForecasts=0,analyticsHistoryPoints=0,aiDraftPlans=0,aiBlockedRuns=0;
  if(actor.permissions.includes('peopleanalytics.read')){[approvedForecasts,analyticsHistoryPoints]=await Promise.all([count(actor.orgId,'analyticsForecastRuns','status','==','approved'),count(actor.orgId,'analyticsSnapshots')]);}
  if(actor.permissions.includes('ai.use')){[aiDraftPlans,aiBlockedRuns]=actor.role==='manager'?await Promise.all([count(actor.orgId,'aiActionPlans','createdBy','==',actor.uid),count(actor.orgId,'aiRuns','actorUid','==',actor.uid)]):await Promise.all([count(actor.orgId,'aiActionPlans','status','==','draft'),count(actor.orgId,'aiRuns','status','==','blocked')]);}
  const alerts:LifecycleAlert[]=diagnostics.findings.filter(f=>['critical','high'].includes(f.severity)).slice(0,12).map(f=>({id:f.id,severity:f.severity,title:f.title,message:f.description,href:f.href,entityType:f.entityType,entityId:f.entityId}));
  if(complianceGaps>0) alerts.push({id:'compliance-gaps',severity:'high',title:'Workforce compliance gaps',message:`${complianceGaps} required compliance item(s) are currently missing or overdue in this scope.`,href:'/compliance'});
  if(skillGaps>0) alerts.push({id:'skill-gaps',severity:skillGaps>10?'high':'warning',title:'Workforce skill gaps need development action',message:`${skillGaps} position-skill gap(s) are open in this scope${overdueLearning?` and ${overdueLearning} learning assignment(s) are overdue`:''}.`,href:'/learning'});
  if(openPerformance>0) alerts.push({id:'performance-reviews',severity:'warning',title:'Performance reviews need action',message:`${openPerformance} performance review(s) remain open in this scope.`,href:'/performance'});
  if(uncoveredCritical>0) alerts.push({id:'succession-uncovered',severity:'high',title:'Critical succession coverage gap',message:`${uncoveredCritical} critical position(s) have no confirmed successor coverage.`,href:'/career'});
  if(outOfBand>0) alerts.push({id:'compensation-out-of-band',severity:'warning',title:'Compensation records outside salary bands',message:`${outOfBand} worker compensation record(s) fall outside the mapped salary range in this scope.`,href:'/compensation'});
  if(highPayEquityFlags>0) alerts.push({id:'pay-equity-review',severity:'high',title:'Pay-equity review indicators',message:`${highPayEquityFlags} configured job-class comparison(s) require qualified pay-equity review.`,href:'/compensation'});
  if(highRiskEr>0) alerts.push({id:'er-high-risk',severity:'high',title:'High-risk employee-relations cases',message:`${highRiskEr} confidential employee-relations case(s) are rated high/critical risk.`,href:'/employee-relations'});
  if(overdueErActions>0) alerts.push({id:'er-overdue-actions',severity:'high',title:'Employee-relations actions overdue',message:`${overdueErActions} confidential case action(s) are overdue.`,href:'/employee-relations'});
  if(criticalSafetyIncidents>0) alerts.push({id:'safety-critical-incidents',severity:'critical',title:'Critical/fatal safety incidents require action',message:`${criticalSafetyIncidents} critical/fatal incident(s) remain open in this scope. Confirm emergency response, statutory reporting review, scene controls, and investigation actions.`,href:'/safety'});
  if(highRiskSafetyHazards>0) alerts.push({id:'safety-high-hazards',severity:'high',title:'High-risk workplace hazards',message:`${highRiskSafetyHazards} hazard(s) have high initial risk scores and require control review.`,href:'/safety'});
  if(safetyReportingReviews>0) alerts.push({id:'safety-reporting-review',severity:'high',title:'Safety reporting determinations outstanding',message:`${safetyReportingReviews} open incident(s) still require MLITSD/JHSC-HSR/WSIB reporting review.`,href:'/safety'});
  if(overdueSafetyActions>0) alerts.push({id:'safety-overdue-actions',severity:'high',title:'Safety corrective actions overdue',message:`${overdueSafetyActions} safety corrective action(s) are overdue.`,href:'/safety'});
  if(serviceSlaBreaches>0) alerts.push({id:'service-sla-breaches',severity:'high',title:'HR Service Center SLA breaches',message:`${serviceSlaBreaches} HR service request(s) have passed a configured response or resolution target.`,href:'/experience'});
  if(workforceRisks>0) alerts.push({id:'workforce-planning-risk',severity:'high',title:'Workforce planning risks require review',message:`${workforceRisks} high/critical workforce-planning risk(s) are open in the current evidence set.`,href:'/workforce-planning'});
  if(resilience&&resilience.metrics.highCriticalCrises>0) alerts.push({id:'resilience-crisis',severity:resilience.incidents.some(i=>i.status!=='closed'&&i.severity==='critical')?'critical':'high',title:'Workforce resilience incident active',message:`${resilience.metrics.highCriticalCrises} high/critical workforce continuity incident(s) remain active; ${resilience.metrics.coverageGaps} critical-role coverage gap(s) are recorded.`,href:'/resilience'});
  if(resilience&&resilience.metrics.coverageGaps>0&&!resilience.metrics.highCriticalCrises) alerts.push({id:'resilience-coverage',severity:'high',title:'Critical workforce coverage gaps',message:`${resilience.metrics.coverageGaps} critical-role coverage gap(s) require resilience planning and human review.`,href:'/resilience'});
  if(strategy&&strategy.metrics.riskAppetiteBreaches>0) alerts.push({id:'strategy-risk-appetite',severity:'high',title:'Human-capital risk appetite threshold exceeded',message:`${strategy.metrics.riskAppetiteBreaches} approved human-capital risk appetite threshold(s) are currently exceeded and require authorized strategic review.`,href:'/strategy'});
  if(strategy&&strategy.metrics.highCriticalCapabilityGaps>0) alerts.push({id:'strategy-capability-risk',severity:'high',title:'Strategic capability risk',message:`${strategy.metrics.highCriticalCapabilityGaps} high/critical strategic capability gap(s) remain open; ${strategy.metrics.overdueInitiatives} initiative(s) are overdue.`,href:'/strategy'});
  if(orgDesign&&orgDesign.metrics.latestStructuralHealth>0&&orgDesign.metrics.latestStructuralHealth<60) alerts.push({id:'orgdesign-structural-risk',severity:orgDesign.metrics.latestStructuralHealth<40?'critical':'high',title:'Organization structure effectiveness risk',message:`Structural health is ${orgDesign.metrics.latestStructuralHealth}/100 with ${orgDesign.metrics.narrowSpanManagers} narrow-span and ${orgDesign.metrics.wideSpanManagers} wide-span manager position(s).`,href:'/org-design'});
  if(orgDesign&&(orgDesign.metrics.kpiBreaches>0||orgDesign.metrics.restructuringInReview>0)) alerts.push({id:'orgdesign-governance-work',severity:'high',title:'Organization design governance work requires review',message:`${orgDesign.metrics.kpiBreaches} organization-effectiveness KPI breach(es) and ${orgDesign.metrics.restructuringInReview} restructuring proposal(s) in review.`,href:'/org-design'});
  if(integration&&integration.metrics.degradedFailingConnectors>0) alerts.push({id:'integration-health-risk',severity:integration.metrics.degradedFailingConnectors>1?'critical':'high',title:'Enterprise integration health requires review',message:`${integration.metrics.degradedFailingConnectors} active connector(s) are degraded/failing; ${integration.metrics.failedRuns24h} run failure(s) occurred in the last 24 hours.`,href:'/integrations'});
  if(integration&&(integration.metrics.openDeadLetters>0||integration.metrics.reconciliationVariances>0)) alerts.push({id:'integration-data-exceptions',severity:'high',title:'Integration data exceptions require review',message:`${integration.metrics.openDeadLetters} dead-letter item(s) and ${integration.metrics.reconciliationVariances} unresolved reconciliation variance(s) require governed review.`,href:'/integrations'});
  if(integration&&(integration.metrics.openRuntimeCircuits>0||integration.metrics.overdueRuntimeSchedules>0||integration.metrics.rejectedWebhookReceipts24h>0)) alerts.push({id:'integration-runtime-risk',severity:integration.metrics.openRuntimeCircuits>0?'critical':'high',title:'Integration runtime requires review',message:`${integration.metrics.openRuntimeCircuits} open circuit(s), ${integration.metrics.overdueRuntimeSchedules} overdue schedule(s), and ${integration.metrics.rejectedWebhookReceipts24h} rejected webhook receipt(s) in the last 24 hours.`,href:'/integrations'});
  if(platform&&(platform.metrics.openCriticalIncidents>0||platform.metrics.restoreTestsFailing>0)) alerts.push({id:'platform-reliability-critical',severity:'critical',title:'Platform recovery/reliability risk requires review',message:`${platform.metrics.openCriticalIncidents} critical platform incident(s) and ${platform.metrics.restoreTestsFailing} restore assurance failure(s) are open.`,href:'/platform-reliability'});
  if(platform&&(platform.metrics.criticalHighSupplyChainFindings>0||platform.metrics.configDriftsHighCritical>0||platform.metrics.backupEvidenceOverdue>0)) alerts.push({id:'platform-supply-chain-risk',severity:'high',title:'Platform supply-chain or recovery evidence requires review',message:`${platform.metrics.criticalHighSupplyChainFindings} High/Critical supply-chain finding(s), ${platform.metrics.configDriftsHighCritical} high-risk drift(s), and ${platform.metrics.backupEvidenceOverdue} backup evidence gap(s) require governed review.`,href:'/platform-reliability'});
  if(hrDiagnostic&&(hrDiagnostic.metrics.openCritical+hrDiagnostic.metrics.openHigh)>0) alerts.push({id:'hr-diagnostic-risk',severity:hrDiagnostic.metrics.openCritical>0?'critical':'high',title:'HR diagnostic findings require remediation',message:`${hrDiagnostic.metrics.openCritical} critical and ${hrDiagnostic.metrics.openHigh} high diagnostic finding(s) remain open. Current score ${hrDiagnostic.metrics.currentScore}/100.`,href:'/hr-diagnostic'});
  if(activeOnboarding>0) alerts.push({id:'active-onboarding',severity:'info',title:'Onboarding cases in progress',message:`${activeOnboarding} onboarding case(s) require lifecycle monitoring.`,href:'/onboarding'});
  const auto=await db.collection(`organizations/${actor.orgId}/automationRuns`).orderBy('startedAt','desc').limit(1).get(); const last=auto.empty?undefined:auto.docs[0]!.data() as any;
  return {metrics:[
    {key:'activeWorkers',label:actor.role==='manager'?'My team':'Active workers',value:activeWorkers,helper:actor.role==='manager'?'Current team workforce':'Current active workforce',href:'/people'},
    {key:'openPositions',label:'Open positions',value:openPositions,helper:actor.role==='manager'?'Open positions in current team context':'Vacant or available capacity',href:'/organization'},
    {key:'openReqs',label:'Open requisitions',value:openReqs,helper:'Approved recruiting demand',href:'/recruiting'},
    {key:'activeOnboarding',label:'Prehires / onboarding',value:activeOnboarding,helper:'Not yet fully activated/completed',href:'/onboarding'},
    {key:'timeExceptions',label:'Open time exceptions',value:openTime,helper:'Attendance review queue',href:'/time'},
    {key:'separations',label:'Active separations',value:activeSeparations,helper:'Open offboarding cases',href:'/separations'},
    {key:'performance',label:'Open performance reviews',value:openPerformance,helper:'Self, manager or calibration action',href:'/performance'},
    {key:'skillGaps',label:'Open skill gaps',value:skillGaps,helper:`${overdueLearning} overdue learning assignment(s)`,href:'/learning'},
    {key:'careerMobility',label:'Internal mobility interests',value:openMobility,helper:`${uncoveredCritical} uncovered critical position(s)`,href:'/career'},
    {key:'compensation',label:'Compensation actions',value:openCompRecommendations,helper:`${outOfBand} outside band · ${highPayEquityFlags} pay-equity review flag(s)`,href:'/compensation'},
    {key:'employeeRelations',label:'Employee relations',value:openErCases,helper:`${highRiskEr} high/critical · ${overdueErActions} overdue action(s)`,href:'/employee-relations'},
    {key:'safety',label:'Health & safety',value:openSafetyIncidents,helper:`${criticalSafetyIncidents} critical/fatal · ${highRiskSafetyHazards} high-risk hazards`,href:'/safety'},
    {key:'experience',label:actor.role==='manager'?'My HR service':'Employee experience',value:openServiceTickets,helper:`${serviceSlaBreaches} SLA breach(es) · ${activeExperienceSurveys} active survey(s)`,href:'/experience'},
    ...(workforcePlanning?[{key:'workforcePlanning',label:'Workforce planning',value:workforceVacancies,helper:`${workforceRisks} high/critical risk(s) · est. employer cost ${Math.round(workforceCost)}`,href:'/workforce-planning'}]:[]),
    ...(actor.permissions.includes('peopleanalytics.read')?[{key:'peopleAnalytics',label:'People analytics',value:approvedForecasts,helper:`${analyticsHistoryPoints} snapshot(s) · governed forecasts approved`,href:'/people-analytics'}]:[]),
    ...(actor.permissions.includes('ai.use')?[{key:'aiCopilot',label:'AI HR Copilot',value:aiDraftPlans,helper:`draft action plan(s) · ${aiBlockedRuns} blocked consequential request(s)`,href:'/ai-copilot'}]:[]),
    ...(resilience?[{key:'resilience',label:'Workforce resilience',value:resilience.resilienceReadiness.score,helper:`${resilience.metrics.coverageGaps} coverage gap(s) · ${resilience.metrics.activeCrises} active crisis/crises`,href:'/resilience'}]:[]),
    ...(strategy?[{key:'strategy',label:'Human capital strategy',value:strategy.strategyReadiness.score,helper:`${strategy.metrics.highCriticalCapabilityGaps} capability risk(s) · ${strategy.metrics.riskAppetiteBreaches} appetite breach(es)`,href:'/strategy'}]:[]),
    ...(orgDesign?[{key:'orgDesign',label:'Organization design',value:orgDesign.orgDesignReadiness.score,helper:`${orgDesign.metrics.latestMaxLayers} layer(s) · ${orgDesign.metrics.latestAverageSpan} avg span · ${orgDesign.metrics.kpiBreaches} KPI breach(es)`,href:'/org-design'}]:[]),
    ...(integration?(()=>{const signals=[integration.connectors.length,integration.contracts.length,integration.runs.length,integration.metrics.activeRuntimeProfiles],coverage=Math.round(signals.filter(Boolean).length/signals.length*100);return[{key:'integration',label:'Enterprise integrations',value:coverage>=60?integration.metrics.readinessScore:'N/A',helper:`${coverage}% evidence coverage · ${integration.metrics.activeConnectors} connector(s) · ${integration.metrics.openDeadLetters} dead letter(s)`,href:'/integrations'}]})():[]),
    ...(identity?(()=>{const signals=[identity.providers.length,identity.mappings.length,identity.accessReviews.length,identity.reconciliations.length],coverage=Math.round(signals.filter(Boolean).length/signals.length*100);return[{key:'identity',label:'Identity & access assurance',value:coverage>=60?identity.metrics.readinessScore:'N/A',helper:`${coverage}% evidence coverage · ${identity.metrics.activeProviders} SSO provider(s) · ${identity.metrics.orphanIdentityAccounts} orphan identity account(s)`,href:'/identity'}]})():[]),
    ...(securityOps?(()=>{const signals=[securityOps.snapshots.length,securityOps.keyRotations.length,securityOps.recertifications.length,securityOps.breakGlass.length],coverage=Math.round(signals.filter(Boolean).length/signals.length*100);return[{key:'security_ops',label:'HCM security & zero-trust assurance',value:coverage>=60?securityOps.metrics.readinessScore:'N/A',helper:`${coverage}% evidence coverage · ${securityOps.metrics.openIncidents} open incident(s) · ${securityOps.metrics.privilegedMfaGaps} privileged MFA gap(s)`,href:'/security-operations'}]})():[]),
    ...(platform?(()=>{const signals=[platform.sboms.length,platform.provenance.length,platform.backupPolicies.length,platform.backupEvidence.length,platform.drPlans.length,platform.objectives.length],coverage=Math.round(signals.filter(Boolean).length/signals.length*100);return[{key:'platform_reliability',label:'Platform reliability & supply chain',value:coverage>=60?platform.metrics.readinessScore:'N/A',helper:`${coverage}% evidence coverage · ${platform.metrics.criticalHighSupplyChainFindings} supply-chain finding(s) · ${platform.metrics.backupEvidenceOverdue} backup evidence gap(s)`,href:'/platform-reliability'}]})():[]),
    ...(hrDiagnostic?[{key:'hrDiagnostic',label:'HR diagnostic',value:hrDiagnostic.metrics.currentScore,helper:`maturity L${hrDiagnostic.metrics.maturityLevel} · ${hrDiagnostic.metrics.openFindings} open finding(s)`,href:'/hr-diagnostic'}]:[]),
    {key:'complianceGaps',label:'Compliance gaps',value:compliance.metrics?.assessed?complianceGaps:'N/A',helper:compliance.metrics?.assessed?`${compliance.metrics.complianceRate}% compliance rate`:`${compliance.metrics?.evidenceCoverage??0}% evidence coverage · compliance not assessed`,href:'/compliance'},
  ],funnel:[{stage:'Open requisitions',value:openReqs,href:'/recruiting'},{stage:'Active applications',value:activeApps,href:'/recruiting'},{stage:'Offer pipeline',value:pendingOffers,href:'/recruiting'},{stage:'Prehire / onboarding',value:activeOnboarding,href:'/onboarding'},{stage:actor.role==='manager'?'My team':'Active workers',value:activeWorkers,href:'/people'},{stage:'Active separations',value:activeSeparations,href:'/separations'}],alerts:alerts.slice(0,16),diagnostics,lastAutomationRun:last?{id:String(last.id||auto.docs[0]!.id),status:String(last.status||'unknown'),startedAt:last.startedAt,completedAt:last.completedAt,lastError:last.lastError}:undefined,generatedAt:now()};
}

export async function createReplacementRequisition(actor:ActorContext,caseId:string,raw:unknown){
  if(!hrRoles.has(actor.role)) throw new ApiError(403,'HR permission is required to create a replacement requisition.','forbidden');
  const input=replacementRequisitionSchema.parse(raw||{}),db=adminDb(),caseRef=db.doc(`organizations/${actor.orgId}/separationCases/${caseId}`),indexRef=db.doc(`organizations/${actor.orgId}/replacementRequisitionIndex/${caseId}`);
  const snap=await caseRef.get();if(!snap.exists)throw new ApiError(404,'Separation case not found.','separation_not_found');const c=snap.data() as SeparationCase;
  if(c.replacementDecision!=='replace')throw new ApiError(409,'The separation replacement decision must be set to replace before creating a requisition.','replacement_not_approved');
  if(c.replacementRequisitionId){const r=await db.doc(`organizations/${actor.orgId}/requisitions/${c.replacementRequisitionId}`).get();if(r.exists)return{requisition:r.data(),deduplicated:true};}
  if(!c.positionId||!c.orgUnitId||!c.managerWorkerId)throw new ApiError(409,'Position, organization unit, and manager are required for a replacement requisition.','replacement_missing_context');
  const reservationId=randomUUID(),timestamp=now();
  try{await db.runTransaction(async tx=>{const idx=await tx.get(indexRef);if(idx.exists){const data=idx.data() as any;if(data.requisitionId)return;if(data.status==='creating'&&data.createdAt&&Date.now()-new Date(data.createdAt).getTime()<5*60_000)throw new ApiError(409,'Replacement requisition creation is already in progress.','replacement_creation_in_progress');}tx.set(indexRef,{caseId,status:'creating',reservationId,createdBy:actor.uid,createdAt:timestamp,updatedAt:timestamp});});}catch(e){if(e instanceof ApiError)throw e;throw e;}
  const reserved=await indexRef.get();const existingReq=reserved.data()?.requisitionId as string|undefined;if(existingReq){const r=await db.doc(`organizations/${actor.orgId}/requisitions/${existingReq}`).get();if(r.exists)return{requisition:r.data(),deduplicated:true};}
  try{
    const [posSnap,empSnap]=await Promise.all([db.doc(`organizations/${actor.orgId}/positions/${c.positionId}`).get(),db.collection(`organizations/${actor.orgId}/employments`).where('workerId','==',c.workerId).limit(25).get()]);
    if(!posSnap.exists)throw new ApiError(409,'The separated worker position no longer exists.','position_not_found');const pos=posSnap.data() as Position;const employments=empSnap.docs.map(d=>d.data() as Employment).sort((a,b)=>b.startDate.localeCompare(a.startDate));const emp=employments[0];
    const req=await createRequisition(actor,{title:pos.title,positionId:c.positionId,orgUnitId:c.orgUnitId,hiringManagerWorkerId:c.managerWorkerId,employmentType:input.employmentType||emp?.employmentType||'permanent',headcount:1,location:input.location||pos.location,description:input.description||`Replacement requisition generated from separation case ${caseId}. Review scope, budget and job requirements before submission.`,requirements:[]});
    const completedAt=now();const audit=buildAudit(actor,{action:'separation.replacement_requisition.create',entityType:'separationCase',entityId:caseId,before:c,after:{replacementRequisitionId:req.id,replacementRequestedAt:completedAt},metadata:{requisitionId:req.id}});const batch=db.batch();batch.set(caseRef,{replacementRequisitionId:req.id,replacementRequestedAt:completedAt,updatedAt:completedAt},{merge:true});batch.set(indexRef,{caseId,status:'completed',requisitionId:req.id,reservationId,updatedAt:completedAt},{merge:true});batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();return{requisition:req,deduplicated:false};
  }catch(error){await indexRef.set({status:'failed',lastError:error instanceof Error?error.message:'Unknown error',updatedAt:now()},{merge:true});throw error;}
}

export async function persistLifecycleDiagnosticRun(actor:ActorContext){if(!adminRoles.has(actor.role))throw new ApiError(403,'HR administrator permission required.','forbidden');const result=await lifecycleDiagnostics(actor),id=randomUUID(),timestamp=now(),db=adminDb();await db.doc(`organizations/${actor.orgId}/lifecycleDiagnosticRuns/${id}`).set({id,...result,createdBy:actor.uid,createdAt:timestamp});const audit=buildAudit(actor,{action:'lifecycle.diagnostics.run',entityType:'lifecycleDiagnosticRun',entityId:id,after:{score:result.score,counts:result.counts,sampled:result.sampled}});await db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);return{id,...result};}
