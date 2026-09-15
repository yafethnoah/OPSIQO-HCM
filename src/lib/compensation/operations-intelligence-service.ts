import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { CompensationChangeRequest, CompensationPositioningFlag } from '@/domain/comp-pay-operations';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { compensationDashboard, createWorkerCompensation } from '@/lib/compensation/service';
import { getCompensationReadiness } from '@/lib/compensation/readiness';
import { normalizePay, normalizeStoredCompensation } from '@/lib/compensation/pay-normalization';
import { resolveWorkerPayDate } from '@/lib/payroll/pay-date';
import { evaluateCompensationPayrollSync } from '@/lib/compensation/payroll-sync-authority';

const now=()=>new Date().toISOString();
const today=()=>now().slice(0,10);
const money=(n:number)=>Math.round(Number(n||0)*100)/100;
async function all<T>(path:string,limit=5000){const s=await adminDb().collection(path).limit(limit).get();return s.docs.map(d=>({id:d.id,...d.data()} as T))}
function requireRead(a:ActorContext){if(!a.permissions.includes('compensation.read'))throw new ApiError(403,'Compensation read permission required.','forbidden')}
function requireManage(a:ActorContext){if(!a.permissions.includes('compensation.manage'))throw new ApiError(403,'Compensation management permission required.','forbidden')}
function requireApprove(a:ActorContext){if(!a.permissions.includes('compensation.approve'))throw new ApiError(403,'Compensation approval permission required.','forbidden')}
function text(v:unknown,label:string,max=2000){const s=String(v||'').trim();if(!s)throw new ApiError(400,`${label} is required.`,'invalid_input');if(s.length>max)throw new ApiError(400,`${label} is too long.`,'invalid_input');return s}
function date(v:unknown,label:string){const s=text(v,label,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new ApiError(400,`${label} must be YYYY-MM-DD.`,'invalid_input');return s}
function remainingYearFraction(effectiveDate:string){const d=new Date(`${effectiveDate}T12:00:00Z`),end=new Date(Date.UTC(d.getUTCFullYear(),11,31,12));const days=Math.max(0,Math.floor((end.getTime()-d.getTime())/86400000)+1);return Math.min(1,days/365)}

export async function compensationOperationsIntelligence(a:ActorContext){
  requireRead(a);
  const [dashboard,readiness,requests,sync,profiles]=await Promise.all([
    compensationDashboard(a),
    getCompensationReadiness(a),
    all<CompensationChangeRequest>(`organizations/${a.orgId}/compensationChangeRequests`),
    all<any>(`organizations/${a.orgId}/compensationPayrollSyncCurrent`),
    all<any>(`organizations/${a.orgId}/payrollWorkerProfiles`),
  ]);
  const syncMap=new Map(sync.map(x=>[x.workerId||x.id,x]));
  const readinessMap=new Map(readiness.workers.map(x=>[x.workerId,x]));
  const flags:CompensationPositioningFlag[]=dashboard.workers.map(w=>{
    const pay=w.current?normalizeStoredCompensation(w.current):undefined;
    const band=w.salaryBand;
    if(!pay)return {workerId:w.workerId,displayName:w.displayName,positionTitle:w.positionTitle,annualPay:0,state:'unmapped'};
    if(!band||readinessMap.get(w.workerId)?.bandMappingRequiresAttention)return {workerId:w.workerId,displayName:w.displayName,positionTitle:w.positionTitle,annualPay:pay.annualPay,state:'unmapped',compaRatioPct:w.compaRatioPct};
    const min=normalizePay({payBasis:band.payBasis,basePay:band.min,standardHoursPerWeek:band.standardHoursPerWeek,standardWeeksPerYear:band.standardWeeksPerYear}).annualPay;
    const mid=normalizePay({payBasis:band.payBasis,basePay:band.midpoint,standardHoursPerWeek:band.standardHoursPerWeek,standardWeeksPerYear:band.standardWeeksPerYear}).annualPay;
    const max=normalizePay({payBasis:band.payBasis,basePay:band.max,standardHoursPerWeek:band.standardHoursPerWeek,standardWeeksPerYear:band.standardWeeksPerYear}).annualPay;
    const state=pay.annualPay<min?'below_band':pay.annualPay>max?'above_band':'inside_band';
    const benchmark=dashboard.benchmarks.find(b=>b.positionId===w.positionId)||dashboard.benchmarks.find(b=>b.jobFamilyId===band.jobFamilyId&&b.levelId===band.levelId);
    return {workerId:w.workerId,displayName:w.displayName,positionTitle:w.positionTitle,annualPay:pay.annualPay,bandMinAnnual:min,bandMidAnnual:mid,bandMaxAnnual:max,compaRatioPct:w.compaRatioPct,state,marketP50:benchmark?.p50,marketGap:benchmark?money(pay.annualPay-benchmark.p50):undefined};
  });
  const pending=requests.filter(r=>!['rejected','applied'].includes(r.status));
  const mismatch=dashboard.workers.filter(w=>Boolean(readinessMap.get(w.workerId)?.syncRequiresAttention));
  return {
    generatedAt:now(),
    metrics:{
      workers:dashboard.workers.length,
      missingCompensation:readiness.counts.missingCompensation,
      missingBand:readiness.counts.missingBand,
      architecturePct:readiness.architecture.overallPct,
      belowBand:flags.filter(f=>f.state==='below_band').length,
      aboveBand:flags.filter(f=>f.state==='above_band').length,
      pendingChanges:pending.length,
      payrollSyncAttention:readiness.counts.syncPending,
      payEquityAlerts:dashboard.payEquityDiagnostics.filter(d=>d.severity==='high'||d.severity==='warning').length,
      totalRewardsReady:dashboard.workers.filter(w=>Boolean(w.totalRewards)).length,
    },
    flags,
    architecture:readiness.architecture,
    pendingChanges:[...pending].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    cycles:dashboard.cycles.map(c=>({
      id:c.id,name:c.name,status:c.status,effectiveDate:c.effectiveDate,budgetAmount:c.budgetAmount,budgetPct:c.budgetPct,
      recommendations:dashboard.recommendations.filter(r=>r.cycleId===c.id).length,
      approvedRecommendations:dashboard.recommendations.filter(r=>r.cycleId===c.id&&['approved','applied'].includes(r.status)).length,
    })),
    payEquityDiagnostics:dashboard.payEquityDiagnostics,
    payrollSyncAttention:mismatch.map(w=>{const sync=syncMap.get(w.workerId);const evaluation=evaluateCompensationPayrollSync(w.current,sync);return {workerId:w.workerId,displayName:w.displayName,currentCompensationRecordId:w.current?.id,sync,evaluation,syncRequiresAttention:evaluation.requiresAttention};}),
    totalRewards:dashboard.workers.filter(w=>w.totalRewards).map(w=>({workerId:w.workerId,displayName:w.displayName,statement:w.totalRewards})),
    workerDirectory:dashboard.workerDirectory,
    guardrails:[
      'Compensation recommendations are decision support and require authorized human approval.',
      'Future-effective changes remain scheduled until their effective date.',
      'Backdated changes are routed to explicit correction/retro workflows rather than silently overwriting history.',
      'AI may not approve raises, change pay or override pay-equity/legal review.',
    ],
  };
}

export async function createCompensationChangeRequest(a:ActorContext,raw:unknown){
  requireManage(a);
  const x=(raw||{}) as any,db=adminDb(),workerId=text(x.workerId,'Worker');
  const curSnap=await db.doc(`organizations/${a.orgId}/workerCompensationCurrent/${workerId}`).get();
  if(!curSnap.exists)throw new ApiError(409,'Current compensation is required before creating a change request.','compensation_missing');
  const current:any=curSnap.data();
  const currentPay=normalizeStoredCompensation(current);
  const basis=String(x.proposedPayBasis||'annual_salary');
  if(!['annual_salary','monthly_salary','hourly'].includes(basis))throw new ApiError(400,'Invalid pay basis.','invalid_input');
  const proposedBasePay=Number(x.proposedBasePay);
  if(!Number.isFinite(proposedBasePay)||proposedBasePay<=0)throw new ApiError(400,'Proposed pay must be greater than zero.','invalid_input');
  const proposed=normalizePay({payBasis:basis as any,basePay:proposedBasePay,standardHoursPerWeek:Number(x.standardHoursPerWeek||current.standardHoursPerWeek||40),standardWeeksPerYear:Number(x.standardWeeksPerYear||current.standardWeeksPerYear||52)});
  const effectiveDate=date(x.effectiveDate,'Effective date');
  const dashboards=await compensationDashboard(a);
  const view=dashboards.workers.find(w=>w.workerId===workerId);
  let bandStatus:'inside'|'below'|'above'|'unmapped'='unmapped',ratio:number|undefined;
  if(view?.salaryBand){
    const b=view.salaryBand;
    const min=normalizePay({payBasis:b.payBasis,basePay:b.min,standardHoursPerWeek:b.standardHoursPerWeek,standardWeeksPerYear:b.standardWeeksPerYear}).annualPay;
    const mid=normalizePay({payBasis:b.payBasis,basePay:b.midpoint,standardHoursPerWeek:b.standardHoursPerWeek,standardWeeksPerYear:b.standardWeeksPerYear}).annualPay;
    const max=normalizePay({payBasis:b.payBasis,basePay:b.max,standardHoursPerWeek:b.standardHoursPerWeek,standardWeeksPerYear:b.standardWeeksPerYear}).annualPay;
    bandStatus=proposed.annualPay<min?'below':proposed.annualPay>max?'above':'inside';ratio=mid?Math.round((proposed.annualPay/mid)*1000)/10:undefined;
  }
  const profileSnap=await db.doc(`organizations/${a.orgId}/payrollWorkerProfiles/${workerId}`).get(),profile:any=profileSnap.data();
  const firstPay=profile?resolveWorkerPayDate({payDate:effectiveDate,workerPayDates:undefined},profile,workerId).payDate:undefined;
  const annualDelta=money(proposed.annualPay-currentPay.annualPay),ts=now(),id=randomUUID();
  const reasons=['merit','promotion','market','equity','adjustment','demotion','other'];
  const row:CompensationChangeRequest={
    id,workerId,currentRecordId:current.id,currentAnnualPay:currentPay.annualPay,proposedPayBasis:basis as any,proposedBasePay,
    proposedAnnualPay:proposed.annualPay,currency:String(x.currency||current.currency||'CAD').toUpperCase(),effectiveDate,
    reason:(reasons.includes(String(x.reason))?x.reason:'other'),rationale:text(x.rationale,'Rationale'),
    evidenceRefs:Array.isArray(x.evidenceRefs)?x.evidenceRefs.map(String).filter(Boolean).slice(0,20):[],
    budgetImpactAnnual:annualDelta,budgetImpactRemainingYear:money(annualDelta*remainingYearFraction(effectiveDate)),firstAffectedPayrollDate:firstPay,
    bandStatus,proposedCompaRatioPct:ratio,status:'draft',createdBy:a.uid,createdAt:ts,updatedBy:a.uid,updatedAt:ts,
  };
  const audit=buildAudit(a,{action:'compensation.change_request.create',entityType:'compensationChangeRequest',entityId:id,after:row});
  const batch=db.batch();batch.create(db.doc(`organizations/${a.orgId}/compensationChangeRequests/${id}`),row);batch.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();
  return row;
}

export async function actCompensationChangeRequest(a:ActorContext,id:string,action:string,note?:string){
  const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/compensationChangeRequests/${id}`),s=await ref.get();
  if(!s.exists)throw new ApiError(404,'Compensation change request not found.','not_found');
  const before=s.data() as CompensationChangeRequest,ts=now();let update:any={updatedBy:a.uid,updatedAt:ts};
  if(action==='submit'){requireManage(a);if(before.status!=='draft')throw new ApiError(409,'Only draft changes can be submitted.','invalid_state');update.status='submitted';}
  else if(action==='send_to_hr'){requireManage(a);if(!['submitted'].includes(before.status))throw new ApiError(409,'Only submitted changes can enter HR review.','invalid_state');update.status='hr_review';}
  else if(action==='approve'||action==='reject'){requireApprove(a);if(before.status!=='hr_review')throw new ApiError(409,'Change must be in HR review.','invalid_state');if(before.createdBy===a.uid)throw new ApiError(403,'Compensation change maker cannot approve the same request.','compensation_maker_checker');update.status=action==='approve'?'approved':'rejected';update.reviewedBy=a.uid;update.reviewedAt=ts;update.decisionNote=note||'';}
  else if(action==='apply'){
    requireApprove(a);if(before.status!=='approved')throw new ApiError(409,'Only approved compensation changes can be applied.','invalid_state');
    if(before.effectiveDate>today())throw new ApiError(409,'Future-effective compensation remains scheduled until its effective date.','future_effective_change');
    const current=await db.doc(`organizations/${a.orgId}/workerCompensationCurrent/${before.workerId}`).get();
    const cur:any=current.data();if(cur&&before.effectiveDate<cur.effectiveDate)throw new ApiError(409,'Backdated change requires correction/retro workflow.','retro_workflow_required');
    const record=await createWorkerCompensation(a,{workerId:before.workerId,effectiveDate:before.effectiveDate,currency:before.currency,payBasis:before.proposedPayBasis,basePay:before.proposedBasePay,standardHoursPerWeek:cur?.standardHoursPerWeek||40,standardWeeksPerYear:cur?.standardWeeksPerYear||52,variableTargetPct:cur?.variableTargetPct||0,allowancesAnnual:cur?.allowancesAnnual||0,changeReason:before.reason,note:before.rationale},{recordId:`change_${before.id}`});
    update.status='applied';update.appliedRecordId=record.id;
  } else throw new ApiError(400,'Unsupported compensation change action.','invalid_action');
  await ref.set(update,{merge:true});const after=(await ref.get()).data();const audit=buildAudit(a,{action:`compensation.change_request.${action}`,entityType:'compensationChangeRequest',entityId:id,before,after});
  await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after;
}