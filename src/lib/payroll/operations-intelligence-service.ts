import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { PayrollCalendarRuleRecord, PayrollRetroCase, VariablePayComponentRecord } from '@/domain/comp-pay-operations';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { getPayrollReadiness } from '@/lib/payroll/readiness';
import { createPayrollAdjustment, createPayrollRun } from '@/lib/payroll/control-plane';
import { detectStatementAnomalies, previewRetro, resolveAuthoritativeWorkerPayDate, runStage } from '@/lib/payroll/operations-intelligence';

const now=()=>new Date().toISOString();
const today=()=>now().slice(0,10);
const money=(n:number)=>Math.round(Number(n||0)*100)/100;

async function all<T>(path:string,limit=5000){
  const s=await adminDb().collection(path).limit(limit).get();
  return s.docs.map(d=>({id:d.id,...d.data()} as T));
}
function requireRead(a:ActorContext){if(!a.permissions.includes('payroll.read'))throw new ApiError(403,'Payroll read permission required.','forbidden')}
function requireCalc(a:ActorContext){if(!a.permissions.includes('payroll.calculate'))throw new ApiError(403,'Payroll calculate permission required.','forbidden')}
function requireReview(a:ActorContext){if(!a.permissions.includes('payroll.review'))throw new ApiError(403,'Payroll review permission required.','forbidden')}
function requireProvider(a:ActorContext){if(!a.permissions.includes('payroll.provider.manage'))throw new ApiError(403,'Payroll provider management permission required.','forbidden')}
function text(v:unknown,label:string,max=1000){const s=String(v||'').trim();if(!s)throw new ApiError(400,`${label} is required.`,'invalid_input');if(s.length>max)throw new ApiError(400,`${label} is too long.`,'invalid_input');return s}
function date(v:unknown,label:string){const s=text(v,label,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new ApiError(400,`${label} must be YYYY-MM-DD.`,'invalid_input');return s}
function amount(v:unknown,label:string){const n=Number(v);if(!Number.isFinite(n)||n<0||n>100_000_000)throw new ApiError(400,`${label} is invalid.`,'invalid_input');return money(n)}

export async function payrollOperationsIntelligence(a:ActorContext){
  requireRead(a);
  const base=`organizations/${a.orgId}`;
  const [readiness,workers,profiles,runs,statements,adjustments,currentComp,calendarRules,retroCases,variablePay,reconciliations]=await Promise.all([
    getPayrollReadiness(a),
    all<any>(`${base}/workers`),
    all<any>(`${base}/payrollWorkerProfiles`),
    all<any>(`${base}/payrollRuns`),
    all<any>(`${base}/payStatements`),
    all<any>(`${base}/payrollAdjustments`),
    all<any>(`${base}/workerCompensationCurrent`),
    all<PayrollCalendarRuleRecord>(`${base}/payrollCalendarRules`),
    all<PayrollRetroCase>(`${base}/payrollRetroCases`),
    all<VariablePayComponentRecord>(`${base}/variablePayComponents`),
    all<any>(`${base}/payrollReconciliations`),
  ]);

  const profileMap=new Map(profiles.map(x=>[x.workerId,x]));
  const compMap=new Map(currentComp.map(x=>[x.workerId,x]));
  const workerMap=new Map(workers.map(x=>[x.id,x]));
  const nextRun=[...runs].filter(r=>!['completed','reversed','cancelled'].includes(r.status)).sort((a,b)=>String(a.payDate).localeCompare(String(b.payDate)))[0];
  const defaultDate=nextRun?.payDate||today();

  const workerRows=readiness.workers.map((row:any)=>{
    const worker=workerMap.get(row.workerId)||{};
    const profile=profileMap.get(row.workerId);
    const calendar=resolveAuthoritativeWorkerPayDate(
      {payDate:defaultDate,workerPayDates:undefined},
      profile,
      worker,
      calendarRules,
    );
    const comp=compMap.get(row.workerId);
    const syncRequiresAttention=Boolean(row.syncRequiresAttention);
    return {
      ...row,
      nextReleaseDate:calendar.payDate,
      releaseSource:calendar.label,
      calendarRuleId:calendar.calendarRuleId,
      profileEnabled:Boolean(profile?.enabled),
      syncStatus:row.syncStatus,
      syncLabel:row.syncLabel,
      syncReason:row.syncReason,
      syncRequiresAttention,
      compensationRecordId:comp?.id,
    };
  });

  const anomalies=detectStatementAnomalies(statements,workers);
  const activeRuns=[...runs].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,12).map(r=>({
    ...r,
    operationalStage:runStage(r.status),
    reconciliation:reconciliations.find(x=>x.runId===r.id),
  }));

  return {
    generatedAt:now(),
    metrics:{
      workers:readiness.totalWorkers,
      ready:readiness.readyWorkers,
      blocked:readiness.totalWorkers-readiness.readyWorkers,
      syncPending:workerRows.filter((x:any)=>x.syncRequiresAttention).length,
      anomalies:anomalies.length,
      pendingAdjustments:adjustments.filter(x=>x.status==='submitted').length,
      pendingRetro:retroCases.filter(x=>['draft','submitted','approved'].includes(x.status)).length,
      pendingVariablePay:variablePay.filter(x=>['draft','submitted','approved'].includes(x.status)).length,
      unreconciledRuns:runs.filter(r=>['approved','exported'].includes(r.status)).length,
    },
    workers:workerRows,
    calendarRules:calendarRules.filter(r=>r.status==='active'),
    anomalies,
    runs:activeRuns,
    retroCases:[...retroCases].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,50),
    variablePay:[...variablePay].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,50),
    guardrails:[
      'Payroll release requires existing payroll maker-checker, regulatory certification and provider controls.',
      'Calendar rules do not override an exact run-level worker release-date override.',
      'AI may explain anomalies but may not release payroll or override a blocker.',
    ],
  };
}

export async function savePayrollCalendarRule(a:ActorContext,raw:unknown){
  requireProvider(a);
  const x=(raw||{}) as any;
  const scope=String(x.scope||'');
  if(!['organization','org_unit','pay_group','worker'].includes(scope))throw new ApiError(400,'Invalid calendar scope.','invalid_input');
  const rule=String(x.rule||'');
  if(!['run_default','offset_days','fixed_day_of_month','last_business_day'].includes(rule))throw new ApiError(400,'Invalid pay calendar rule.','invalid_input');
  const targetId=scope==='organization'?undefined:text(x.targetId,'Target');
  const effectiveDate=date(x.effectiveDate,'Effective date');
  const id=`${scope}_${targetId||'default'}_${effectiveDate}`.replace(/[^a-zA-Z0-9_-]/g,'_');
  const ref=adminDb().doc(`organizations/${a.orgId}/payrollCalendarRules/${id}`);
  const before=(await ref.get()).data();
  const ts=now();
  const row:PayrollCalendarRuleRecord={
    id,scope:scope as any,targetId,rule:rule as any,
    offsetDays:rule==='offset_days'?Math.max(-31,Math.min(31,Math.trunc(Number(x.offsetDays||0)))):undefined,
    dayOfMonth:rule==='fixed_day_of_month'?Math.max(1,Math.min(31,Math.trunc(Number(x.dayOfMonth||1)))):undefined,
    weekendAdjustment:['none','previous_weekday','next_weekday'].includes(String(x.weekendAdjustment))?x.weekendAdjustment:'none',
    effectiveDate,endDate:x.endDate?date(x.endDate,'End date'):undefined,
    reason:text(x.reason,'Reason',2000),status:'active',
    createdBy:before?.createdBy||a.uid,createdAt:before?.createdAt||ts,updatedBy:a.uid,updatedAt:ts,
  };
  await ref.set(row);
  const audit=buildAudit(a,{action:'payroll.calendar.save',entityType:'payrollCalendarRule',entityId:id,before,after:row});
  await adminDb().doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);
  return row;
}

export async function createRetroCase(a:ActorContext,raw:unknown){
  requireCalc(a);
  const x=(raw||{}) as any,id=randomUUID(),ts=now();
  const preview=previewRetro({
    previousAnnualPay:amount(x.previousAnnualPay,'Previous annual pay'),
    newAnnualPay:amount(x.newAnnualPay,'New annual pay'),
    payPeriodsPerYear:Math.max(1,Math.min(366,Math.trunc(Number(x.payPeriodsPerYear||26)))),
    affectedPeriods:Math.max(0,Math.min(366,Math.trunc(Number(x.affectedPeriods||0)))),
  });
  const row:PayrollRetroCase={
    id,workerId:text(x.workerId,'Worker'),effectiveDate:date(x.effectiveDate,'Effective date'),
    approvalDate:date(x.approvalDate,'Approval date'),
    previousAnnualPay:amount(x.previousAnnualPay,'Previous annual pay'),newAnnualPay:amount(x.newAnnualPay,'New annual pay'),
    payPeriodsPerYear:Math.max(1,Math.min(366,Math.trunc(Number(x.payPeriodsPerYear||26)))),
    affectedPeriods:preview.affectedPeriods,retroAmount:preview.retroAmount,payDate:date(x.payDate,'Target pay date'),
    reason:text(x.reason,'Reason',2000),evidenceRefs:Array.isArray(x.evidenceRefs)?x.evidenceRefs.map(String).filter(Boolean).slice(0,20):[],
    status:'draft',createdBy:a.uid,createdAt:ts,
  };
  const audit=buildAudit(a,{action:'payroll.retro.create',entityType:'payrollRetroCase',entityId:id,after:row});
  const b=adminDb().batch();b.create(adminDb().doc(`organizations/${a.orgId}/payrollRetroCases/${id}`),row);b.create(adminDb().doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();
  return row;
}

export async function actRetroCase(a:ActorContext,id:string,action:string,note?:string){
  const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollRetroCases/${id}`),s=await ref.get();
  if(!s.exists)throw new ApiError(404,'Retro case not found.','not_found');
  const before=s.data() as PayrollRetroCase,ts=now();
  if(action==='submit'){requireCalc(a);if(before.status!=='draft')throw new ApiError(409,'Only draft retro cases can be submitted.','invalid_state');await ref.set({status:'submitted'},{merge:true});}
  else if(action==='approve'||action==='reject'){requireReview(a);if(before.status!=='submitted')throw new ApiError(409,'Only submitted retro cases can be reviewed.','invalid_state');if(before.createdBy===a.uid)throw new ApiError(403,'Retro case maker cannot approve the same case.','payroll_maker_checker');await ref.set({status:action==='approve'?'approved':'rejected',reviewedBy:a.uid,reviewedAt:ts,decisionNote:note||''},{merge:true});}
  else if(action==='prepare'){requireCalc(a);if(before.status!=='approved')throw new ApiError(409,'Only approved retro cases can prepare an adjustment.','invalid_state');const adj=await createPayrollAdjustment(a,{workerId:before.workerId,type:'retro',amount:before.retroAmount,payDate:before.payDate,note:`Retro case ${before.id}: ${before.reason}`,evidenceRefs:before.evidenceRefs});await ref.set({status:'prepared',preparedAdjustmentId:adj.id},{merge:true});}
  else throw new ApiError(400,'Unsupported retro action.','invalid_action');
  const after=(await ref.get()).data();const audit=buildAudit(a,{action:`payroll.retro.${action}`,entityType:'payrollRetroCase',entityId:id,before,after});
  await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after;
}

export async function createVariablePay(a:ActorContext,raw:unknown){
  requireCalc(a);
  const x=(raw||{}) as any,id=randomUUID(),ts=now();
  const types=['bonus','commission','shift_premium','overtime','allowance','car_allowance','housing_allowance','meal_allowance','expense_reimbursement','retention_bonus','signing_bonus','performance_award','other'];
  if(!types.includes(String(x.type)))throw new ApiError(400,'Invalid variable-pay type.','invalid_input');
  const row:VariablePayComponentRecord={
    id,workerId:text(x.workerId,'Worker'),type:x.type,
    calculationMethod:['fixed','percent_of_base','hourly'].includes(String(x.calculationMethod))?x.calculationMethod:'fixed',
    amount:amount(x.amount,'Amount'),units:x.units===undefined?undefined:Number(x.units),
    frequency:['one_time','per_pay','monthly','quarterly','annual'].includes(String(x.frequency))?x.frequency:'one_time',
    currency:text(x.currency||'CAD','Currency',3).toUpperCase(),payDate:x.payDate?date(x.payDate,'Pay date'):undefined,
    taxTreatmentRef:String(x.taxTreatmentRef||'').trim()||undefined,effectiveDate:date(x.effectiveDate,'Effective date'),
    endDate:x.endDate?date(x.endDate,'End date'):undefined,evidenceRefs:Array.isArray(x.evidenceRefs)?x.evidenceRefs.map(String).filter(Boolean).slice(0,20):[],
    status:'draft',createdBy:a.uid,createdAt:ts,
  };
  const audit=buildAudit(a,{action:'payroll.variable_pay.create',entityType:'variablePayComponent',entityId:id,after:row});
  const b=adminDb().batch();b.create(adminDb().doc(`organizations/${a.orgId}/variablePayComponents/${id}`),row);b.create(adminDb().doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();
  return row;
}

export async function actVariablePay(a:ActorContext,id:string,action:string,note?:string){
  const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/variablePayComponents/${id}`),s=await ref.get();
  if(!s.exists)throw new ApiError(404,'Variable-pay component not found.','not_found');
  const before=s.data() as VariablePayComponentRecord,ts=now();
  if(action==='submit'){requireCalc(a);if(before.status!=='draft')throw new ApiError(409,'Only draft variable pay can be submitted.','invalid_state');await ref.set({status:'submitted'},{merge:true});}
  else if(action==='approve'||action==='reject'){requireReview(a);if(before.status!=='submitted')throw new ApiError(409,'Only submitted variable pay can be reviewed.','invalid_state');if(before.createdBy===a.uid)throw new ApiError(403,'Variable-pay maker cannot approve the same item.','payroll_maker_checker');await ref.set({status:action==='approve'?'approved':'rejected',reviewedBy:a.uid,reviewedAt:ts,decisionNote:note||''},{merge:true});}
  else if(action==='prepare'){requireCalc(a);if(before.status!=='approved'||!before.payDate)throw new ApiError(409,'Approved variable pay requires a target pay date before preparation.','invalid_state');const type=before.type==='commission'?'commission':before.type==='bonus'||before.type.endsWith('_bonus')||before.type==='performance_award'?'bonus':'taxable_benefit';const adj=await createPayrollAdjustment(a,{workerId:before.workerId,type,amount:before.amount,payDate:before.payDate,note:`Variable pay ${before.id}: ${before.type}`,evidenceRefs:before.evidenceRefs});await ref.set({status:'prepared',preparedAdjustmentId:adj.id},{merge:true});}
  else throw new ApiError(400,'Unsupported variable-pay action.','invalid_action');
  const after=(await ref.get()).data();const audit=buildAudit(a,{action:`payroll.variable_pay.${action}`,entityType:'variablePayComponent',entityId:id,before,after});
  await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after;
}

export async function createSpecialPayrollRun(a:ActorContext,raw:unknown){
  requireCalc(a);
  const x=(raw||{}) as any;
  const kind=String(x.kind||'off_cycle');
  if(!['off_cycle','correction','termination','bonus','commission','emergency','retro'].includes(kind))throw new ApiError(400,'Unsupported specialized payroll run type.','invalid_input');
  return createPayrollRun(a,{
    name:text(x.name,'Run name',180),payDate:date(x.payDate,'Pay date'),periodStart:date(x.periodStart,'Period start'),periodEnd:date(x.periodEnd,'Period end'),
    kind,mode:'uat',providerId:x.providerId||undefined,workerIds:Array.isArray(x.workerIds)?x.workerIds.map(String):undefined,
    workerPayDates:x.workerPayDates||undefined,sourceRunId:x.sourceRunId||undefined,reason:text(x.reason||`${kind} payroll`,'Reason',2000),
    idempotencyKey:String(x.idempotencyKey||randomUUID()),
  });
}