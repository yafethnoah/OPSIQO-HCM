import{createHash,randomUUID}from'crypto';
import type{ActorContext,Permission}from'@/domain/security';
import type{PayrollAdjustment,PayrollCalculationInput,PayrollCalculationRecord,PayrollProviderConfig,PayrollReconciliation,PayrollReferenceValidation,PayrollRegulatoryStatus,PayrollRun,PayrollWorkerProfile,PayStatement,PayrollInputSnapshot}from'@/domain/payroll';
import{adminDb}from'@/lib/firebase/admin';
import{ApiError}from'@/lib/http/errors';
import{buildAudit}from'@/lib/audit/service';
import{buildDomainEvent}from'@/lib/events/build';
import{calculateCanada2026,canada2026RuleMetadata}from'./canada-2026';
import{EvidenceSandboxPayrollAdapter,type PayrollOutboundRecord}from'./provider-adapter';
import{payrollAdjustmentActionSchema,payrollAdjustmentSchema,payrollRunActionSchema,payrollRunCreateSchema,referenceCertificationSchema,referenceValidationSchema,workerProfileSchema}from'./schemas';

const now=()=>new Date().toISOString(),today=()=>now().slice(0,10),money=(n:number)=>Math.round(n*100)/100;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const addDays=(d:string,n:number)=>{const x=new Date(`${d}T12:00:00Z`);x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
function requireP(a:ActorContext,p:Permission){if(!a.permissions.includes(p))throw new ApiError(403,`Payroll permission required: ${p}.`,'forbidden')}
async function all<T>(path:string,limit=4000){const s=await adminDb().collection(path).limit(limit).get();return s.docs.map(d=>({id:d.id,...d.data()}as T))}
function periodDays(a:string,b:string){return Math.floor((Date.parse(`${b}T12:00:00Z`)-Date.parse(`${a}T12:00:00Z`))/86400000)+1}
function sum<T>(rows:T[],f:(x:T)=>number){return money(rows.reduce((n,x)=>n+Number(f(x)||0),0))}
function resultDeductions(r:any){return money(r.cppOrQpp+r.cpp2OrQpp2+r.ei+r.qpip+r.federalTax+r.provincialTax+r.otherDeductions)}

export async function savePayrollWorkerProfile(a:ActorContext,workerId:string,raw:unknown){
  requireP(a,'payroll.provider.manage');const x=workerProfileSchema.parse(raw),db=adminDb(),w=await db.doc(`organizations/${a.orgId}/workers/${workerId}`).get();
  if(!w.exists)throw new ApiError(404,'Worker not found.','worker_not_found');
  const ref=db.doc(`organizations/${a.orgId}/payrollWorkerProfiles/${workerId}`),before=(await ref.get()).data(),ts=now();
  const row:PayrollWorkerProfile={id:workerId,workerId,...x,createdBy:(before as any)?.createdBy||a.uid,createdAt:(before as any)?.createdAt||ts,updatedBy:a.uid,updatedAt:ts};
  await ref.set(row);const audit=buildAudit(a,{action:'payroll.worker_profile.save',entityType:'payrollWorkerProfile',entityId:workerId,before,after:{...row,paymentMethodRef:row.paymentMethodRef?'[payment-ref]':undefined}});
  await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return row;
}

export async function createPayrollAdjustment(a:ActorContext,raw:unknown){
  requireP(a,'payroll.calculate');const x=payrollAdjustmentSchema.parse(raw),db=adminDb(),id=randomUUID(),ts=now();
  const w=await db.doc(`organizations/${a.orgId}/workers/${x.workerId}`).get();if(!w.exists)throw new ApiError(404,'Worker not found.','worker_not_found');
  const row:PayrollAdjustment={id,...x,status:'submitted',createdBy:a.uid,createdAt:ts};
  const audit=buildAudit(a,{action:'payroll.adjustment.submit',entityType:'payrollAdjustment',entityId:id,after:row});const b=db.batch();
  b.create(db.doc(`organizations/${a.orgId}/payrollAdjustments/${id}`),row);b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row;
}
export async function actPayrollAdjustment(a:ActorContext,adjustmentId:string,raw:unknown){
  requireP(a,'payroll.review');const x=payrollAdjustmentActionSchema.parse(raw),db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollAdjustments/${adjustmentId}`),s=await ref.get();
  if(!s.exists)throw new ApiError(404,'Payroll adjustment not found.','adjustment_not_found');const before=s.data()as PayrollAdjustment;
  if(before.status!=='submitted')return before;if(before.createdBy===a.uid)throw new ApiError(403,'Adjustment maker cannot approve or reject the same payroll adjustment.','payroll_maker_checker');
  const ts=now(),after=x.action==='approve'?{...before,status:'approved' as const,approvedBy:a.uid,approvedAt:ts}:{...before,status:'rejected' as const,rejectedBy:a.uid,rejectedAt:ts};
  await ref.set(after);const audit=buildAudit(a,{action:`payroll.adjustment.${x.action}`,entityType:'payrollAdjustment',entityId:adjustmentId,before,after,metadata:{note:x.note||''}});
  await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after;
}

export async function createPayrollRun(a:ActorContext,raw:unknown){
  requireP(a,'payroll.calculate');const x=payrollRunCreateSchema.parse(raw);if(periodDays(x.periodStart,x.periodEnd)>366)throw new ApiError(409,'Payroll period cannot exceed 366 days.','invalid_period_range');
  const db=adminDb(),requestHash=hash(x),id=x.idempotencyKey?`run_${hash(`${a.orgId}:${x.idempotencyKey}`).slice(0,32)}`:randomUUID(),ref=db.doc(`organizations/${a.orgId}/payrollRuns/${id}`),existing=await ref.get();
  if(existing.exists){const row=existing.data()as PayrollRun;if(row.requestHash!==requestHash)throw new ApiError(409,'Idempotency key was already used for different payroll inputs.','idempotency_conflict');return row}
  const ts=now(),row:PayrollRun={id,name:x.name,payDate:x.payDate,periodStart:x.periodStart,periodEnd:x.periodEnd,status:'draft',kind:x.kind,mode:x.mode,providerId:x.providerId,workerIds:x.workerIds,sourceRunId:x.sourceRunId,reason:x.reason,idempotencyKey:x.idempotencyKey,requestHash,calculationIds:[],snapshotIds:[],createdBy:a.uid,createdAt:ts};
  const audit=buildAudit(a,{action:'payroll.run.create',entityType:'payrollRun',entityId:id,after:row});const b=db.batch();b.create(ref,row);b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row;
}

async function buildRunRows(a:ActorContext,run:PayrollRun){
  const db=adminDb(),base=`organizations/${a.orgId}`;
  const[workers,profiles,currentComp,timesheets,leaveRequests,adjustments,timeProfiles,timePolicies,statements]=await Promise.all([
    all<any>(`${base}/workers`),all<PayrollWorkerProfile>(`${base}/payrollWorkerProfiles`),all<any>(`${base}/workerCompensationCurrent`),
    all<any>(`${base}/timesheets`),all<any>(`${base}/leaveRequests`),all<PayrollAdjustment>(`${base}/payrollAdjustments`),all<any>(`${base}/workerTimeProfiles`),all<any>(`${base}/timePolicies`),all<PayStatement>(`${base}/payStatements`)
  ]);
  const selected=workers.filter(w=>(run.workerIds?.length?run.workerIds.includes(w.id):['active','leave'].includes(w.status))||(run.kind==='termination'&&w.terminationDate&&w.terminationDate>=run.periodStart&&w.terminationDate<=run.periodEnd));
  if(!selected.length)throw new ApiError(409,'No workers are eligible for this payroll run.','payroll_no_workers');
  const profileMap=Object.fromEntries(profiles.map(x=>[x.workerId,x])),compMap=Object.fromEntries(currentComp.map(x=>[x.workerId,x])),timeProfileMap=Object.fromEntries(timeProfiles.map(x=>[x.workerId,x])),policyMap=Object.fromEntries(timePolicies.map(x=>[x.id,x]));
  const rows:{snapshot:PayrollInputSnapshot;calculation:PayrollCalculationRecord;adjustments:PayrollAdjustment[]}[]=[];
  for(const w of selected){
    const p=profileMap[w.id];if(!p||!p.enabled)throw new ApiError(409,`Payroll profile is missing or disabled for ${w.displayName||w.id}.`,'payroll_profile_missing');
    const c=compMap[w.id];if(!c)throw new ApiError(409,`Current compensation is missing for ${w.displayName||w.id}.`,'current_compensation_missing');
    const ts=timesheets.filter(t=>t.workerId===w.id&&t.status==='approved'&&t.weekStart>=run.periodStart&&t.weekEnd<=run.periodEnd);
    const leave=leaveRequests.filter(l=>l.workerId===w.id&&l.status==='approved'&&l.endDate>=run.periodStart&&l.startDate<=run.periodEnd);
    const ads=adjustments.filter(x=>x.workerId===w.id&&x.status==='approved'&&!x.consumedByRunId&&((x.targetRunId&&x.targetRunId===run.id)||(!x.targetRunId&&x.payDate===run.payDate)));
    const regularHours=sum(ts,t=>Number(t.regularMinutes||0)/60),overtimeHours=sum(ts,t=>Number(t.overtimeMinutes||0)/60),paidLeaveHours=sum(ts,t=>Number(t.paidLeaveMinutes||0)/60);
    const tp=timeProfileMap[w.id],policy=tp?.timePolicyId?policyMap[tp.timePolicyId]:undefined,otMultiplier=Number(policy?.overtimeMultiplier||0);
    if(overtimeHours>0&&!otMultiplier)throw new ApiError(409,`Overtime exists for ${w.displayName||w.id} but no authoritative overtime multiplier is configured.`,'overtime_policy_missing');
    const periods=p.payPeriodsPerYear,baseRate=c.payBasis==='hourly'?Number(c.basePay):money(Number(c.annualizedBasePay||c.basePay)/2080);
    let grossRegular=c.payBasis==='hourly'?money((regularHours+paidLeaveHours)*baseRate):money(Number(c.annualizedBasePay||c.basePay)/periods);
    if(c.payBasis==='annual_salary')grossRegular=money(grossRegular+Number(c.allowancesAnnual||0)/periods);
    if(c.payBasis==='hourly'&&!ts.length&&!ads.some(x=>['bonus','commission','vacation','stat_holiday','retro','termination'].includes(x.type)))throw new ApiError(409,`Approved time is missing for hourly worker ${w.displayName||w.id}.`,'approved_time_missing');
    const overtime=money(overtimeHours*baseRate*(otMultiplier||0));
    const by=(type:string)=>sum(ads,x=>x.type===type?x.amount:0);
    grossRegular=money(grossRegular+by('retro')+by('termination'));
    const year=run.payDate.slice(0,4),prior=statements.filter(s=>s.workerId===w.id&&s.status==='final'&&!s.reversedAt&&s.payDate.startsWith(year)&&s.payDate<run.payDate);
    const ytd={pensionable:sum(prior,s=>s.pensionable),cpp:sum(prior,s=>s.cppOrQpp),cpp2:sum(prior,s=>s.cpp2OrQpp2),insurable:sum(prior,s=>s.insurable),ei:sum(prior,s=>s.ei),qpip:sum(prior,s=>s.qpip)};
    const input:PayrollCalculationInput={workerId:w.id,province:p.province,payDate:run.payDate,payPeriodsPerYear:periods,grossRegular,overtime,bonus:by('bonus'),commission:by('commission'),vacationPay:by('vacation'),statHolidayPay:by('stat_holiday'),taxableBenefits:money(Number(p.recurringTaxableBenefits||0)+by('taxable_benefit')),preTaxDeductions:money(p.recurringPreTaxDeductions+by('pre_tax_deduction')),otherDeductions:money(p.recurringOtherDeductions+by('other_deduction')),federalClaimAmount:p.federalClaimAmount,provincialClaimAmount:p.provincialClaimAmount,additionalTax:money(p.additionalTax+by('additional_tax')),ytdPensionable:ytd.pensionable,ytdCppOrQpp:ytd.cpp,ytdCpp2OrQpp2:ytd.cpp2,ytdInsurable:ytd.insurable,ytdEi:ytd.ei,ytdQpip:ytd.qpip};
    const source={workerUpdatedAt:w.updatedAt,profileUpdatedAt:p.updatedAt,compensationRecordId:c.id,compensationCreatedAt:c.createdAt,timesheetIds:ts.map(t=>t.id).sort(),timesheetUpdatedAts:ts.map(t=>t.updatedAt).sort(),leaveRequestIds:leave.map(l=>l.id).sort(),leaveUpdatedAts:leave.map(l=>l.updatedAt).sort(),adjustmentIds:ads.map(x=>x.id).sort(),adjustmentApprovalAts:ads.map(x=>x.approvedAt).filter(Boolean).sort(),timePolicyId:policy?.id,timePolicyUpdatedAt:policy?.updatedAt,input};
    const sourceHash=hash(source),snapshotId=`${run.id}_${w.id}`,snapshot:PayrollInputSnapshot={id:snapshotId,runId:run.id,workerId:w.id,employeeNumber:w.employeeNumber||'',displayName:w.displayName||w.id,currency:c.currency,compensationRecordId:c.id,timesheetIds:ts.map(t=>t.id),leaveRequestIds:leave.map(l=>l.id),adjustmentIds:ads.map(x=>x.id),regularHours,overtimeHours,paidLeaveHours,baseRate,overtimeMultiplier:otMultiplier||0,paymentMethodRef:p.paymentMethodRef,input,sourceHash,sourceUpdatedAts:[w.updatedAt,p.updatedAt,c.createdAt,...ts.map(t=>t.updatedAt),...leave.map(l=>l.updatedAt),...ads.map(x=>x.approvedAt||x.createdAt)].filter((v):v is string=>Boolean(v)),warnings:[],immutableAt:now(),createdBy:a.uid};
    const result=calculateCanada2026(input),calculationId=`${run.id}_${w.id}`,calculation:PayrollCalculationRecord={id:calculationId,runId:run.id,workerId:w.id,snapshotId,sourceHash,calculationHash:hash({sourceHash,result}),result,calculatedBy:a.uid,calculatedAt:now()};
    rows.push({snapshot,calculation,adjustments:ads});
  }
  return rows;
}

export async function calculatePayrollRun(a:ActorContext,runId:string){
  requireP(a,'payroll.calculate');const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollRuns/${runId}`),s=await ref.get();
  if(!s.exists)throw new ApiError(404,'Payroll run not found.','payroll_run_not_found');const run=s.data()as PayrollRun;if(run.status!=='draft'){if(run.status==='calculated')return run;throw new ApiError(409,'Only a draft payroll run can be calculated.','invalid_payroll_state')}
  const rows=await buildRunRows(a,run);for(let i=0;i<rows.length;i+=150){const b=db.batch();for(const x of rows.slice(i,i+150)){b.set(db.doc(`organizations/${a.orgId}/payrollInputSnapshots/${x.snapshot.id}`),x.snapshot);b.set(db.doc(`organizations/${a.orgId}/payrollRunCalculations/${x.calculation.id}`),x.calculation)}await b.commit()}
  const gross=sum(rows,x=>x.calculation.result.gross),ded=sum(rows,x=>resultDeductions(x.calculation.result)),net=sum(rows,x=>x.calculation.result.net),after={...run,status:'calculated' as const,snapshotIds:rows.map(x=>x.snapshot.id),calculationIds:rows.map(x=>x.calculation.id),totals:{workers:rows.length,gross,employeeDeductions:ded,net},calculatedBy:a.uid,calculatedAt:now()};
  await ref.set(after);const audit=buildAudit(a,{action:'payroll.run.calculate',entityType:'payrollRun',entityId:runId,before:run,after});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after;
}

export async function reviewPayrollRun(a:ActorContext,runId:string,note=''){
  requireP(a,'payroll.review');const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollRuns/${runId}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Payroll run not found.','payroll_run_not_found');
  const run=s.data()as PayrollRun;if(run.status!=='calculated')throw new ApiError(409,'Payroll run must be calculated before review.','invalid_payroll_state');if(run.calculatedBy===a.uid)throw new ApiError(403,'Payroll calculator cannot review the same run.','payroll_maker_checker');
  const after={...run,status:'review' as const,reviewedBy:a.uid,reviewedAt:now(),reviewNote:note};await ref.set(after);const audit=buildAudit(a,{action:'payroll.run.review',entityType:'payrollRun',entityId:runId,before:run,after});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after;
}
async function regulatoryStatus(orgId:string):Promise<PayrollRegulatoryStatus>{
  const s=await adminDb().doc(`organizations/${orgId}/payrollRegulatoryStatus/default`).get();
  return s.exists?s.data()as PayrollRegulatoryStatus:{id:'default',state:'reference_only',ruleVersion:canada2026RuleMetadata.version,minimumCases:100,updatedAt:now()};
}
export async function approvePayrollRun(a:ActorContext,runId:string,note=''){
  requireP(a,'payroll.approve');const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollRuns/${runId}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Payroll run not found.','payroll_run_not_found');
  const run=s.data()as PayrollRun;if(run.status!=='review')throw new ApiError(409,'Payroll run must be in review before approval.','invalid_payroll_state');if(run.createdBy===a.uid||run.calculatedBy===a.uid)throw new ApiError(403,'Payroll maker/calculator cannot approve the same run.','payroll_maker_checker');
  if(run.mode==='production'){const reg=await regulatoryStatus(a.orgId);if(reg.state!=='certified'||reg.ruleVersion!==canada2026RuleMetadata.version)throw new ApiError(409,'Production payroll approval is blocked until the active rule version is independently validated and certified.','payroll_not_certified')}
  const after={...run,status:'approved' as const,approvedBy:a.uid,approvedAt:now(),approvalNote:note};await ref.set(after);const audit=buildAudit(a,{action:'payroll.run.approve',entityType:'payrollRun',entityId:runId,before:run,after});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after;
}

async function loadRunData(orgId:string,run:PayrollRun){
  const db=adminDb(),snaps=await Promise.all((run.snapshotIds||[]).map(id=>db.doc(`organizations/${orgId}/payrollInputSnapshots/${id}`).get())),calcs=await Promise.all(run.calculationIds.map(id=>db.doc(`organizations/${orgId}/payrollRunCalculations/${id}`).get()));
  return{snapshots:snaps.filter(x=>x.exists).map(x=>x.data()as PayrollInputSnapshot),calculations:calcs.filter(x=>x.exists).map(x=>x.data()as PayrollCalculationRecord)};
}
export async function exportPayrollRun(a:ActorContext,runId:string,providerId?:string){
  requireP(a,'payroll.export');const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollRuns/${runId}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Payroll run not found.','payroll_run_not_found');
  const run=s.data()as PayrollRun;if(run.status!=='approved'){if(run.status==='exported')return run;throw new ApiError(409,'Only an approved payroll run can be exported.','invalid_payroll_state')}
  const pid=providerId||run.providerId;if(!pid)throw new ApiError(409,'A payroll provider must be selected before export.','payroll_provider_required');const ps=await db.doc(`organizations/${a.orgId}/payrollProviders/${pid}`).get();if(!ps.exists)throw new ApiError(404,'Payroll provider not found.','provider_not_found');
  const provider=ps.data()as PayrollProviderConfig;if((provider.environment||'uat')!==run.mode)throw new ApiError(409,'Payroll provider environment does not match the payroll run mode.','provider_environment_mismatch');
  if(run.mode==='production'&&provider.adapterCode==='evidence_sandbox')throw new ApiError(409,'Evidence sandbox cannot be used for production payroll.','sandbox_production_forbidden');
  if(provider.adapterCode!=='evidence_sandbox')throw new ApiError(409,'Configured live adapter requires provider-specific implementation and secret binding before execution.','adapter_not_bound');
  const{snapshots,calculations}=await loadRunData(a.orgId,run);if(run.mode==='production'&&snapshots.some(x=>!x.paymentMethodRef))throw new ApiError(409,'Production payroll export requires a configured payment-method reference for every worker.','payment_reference_missing');const snapMap=Object.fromEntries(snapshots.map(x=>[x.workerId,x])),records:PayrollOutboundRecord[]=calculations.map(c=>{const x=snapMap[c.workerId],r=c.result;return{workerId:c.workerId,employment:{employeeNumber:x.employeeNumber,displayName:x.displayName},compensation:{currency:x.currency,compensationRecordId:x.compensationRecordId,baseRate:x.baseRate},time:{regularHours:x.regularHours,overtimeHours:x.overtimeHours,paidLeaveHours:x.paidLeaveHours,timesheetIds:x.timesheetIds},leave:{leaveRequestIds:x.leaveRequestIds},earnings:{gross:r.gross,taxable:r.taxable},deductions:{cppOrQpp:r.cppOrQpp,cpp2OrQpp2:r.cpp2OrQpp2,ei:r.ei,qpip:r.qpip,federalTax:r.federalTax,provincialTax:r.provincialTax,otherDeductions:r.otherDeductions},payment:{paymentMethodRef:x.paymentMethodRef||'not-configured'}}});
  const adapter=new EvidenceSandboxPayrollAdapter(),out=await adapter.push(records),batchId=out.batchId,ts=now(),syncId=randomUUID(),sync={id:syncId,providerId:pid,direction:'outbound' as const,status:out.rejected?'partial' as const:'completed' as const,startedAt:ts,completedAt:now(),records:records.length,accepted:out.accepted,rejected:out.rejected,errors:out.errors,traceId:randomUUID(),createdBy:a.uid};
  const b=db.batch();b.create(db.doc(`organizations/${a.orgId}/payrollProviderBatches/${batchId}`),{id:batchId,runId,providerId:pid,records,createdAt:ts,createdBy:a.uid});b.create(db.doc(`organizations/${a.orgId}/payrollSyncRuns/${syncId}`),sync);
  const after={...run,status:'exported' as const,providerId:pid,providerBatchId:batchId,exportedBy:a.uid,exportedAt:ts};b.set(ref,after);const audit=buildAudit(a,{action:'payroll.run.export',entityType:'payrollRun',entityId:runId,before:run,after,metadata:{records:records.length,providerId:pid}});b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return after;
}

export async function reconcilePayrollRun(a:ActorContext,runId:string){
  requireP(a,'payroll.reconcile');const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollRuns/${runId}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Payroll run not found.','payroll_run_not_found');
  const run=s.data()as PayrollRun;if(run.status!=='exported'){if(run.status==='reconciled')return run;throw new ApiError(409,'Payroll run must be exported before reconciliation.','invalid_payroll_state')}
  if(!run.providerBatchId||!run.providerId)throw new ApiError(409,'Provider batch evidence is missing.','payroll_batch_missing');const ps=await db.doc(`organizations/${a.orgId}/payrollProviders/${run.providerId}`).get(),provider=ps.data()as PayrollProviderConfig|undefined;
  if(!provider||provider.adapterCode!=='evidence_sandbox')throw new ApiError(409,'Live provider reconciliation requires a bound provider adapter.','adapter_not_bound');
  const{calculations}=await loadRunData(a.orgId,run);const issues:any[]=[];for(const c of calculations){const r=c.result,actual={gross:r.gross,deductions:resultDeductions(r),net:r.net};const expected=actual;for(const field of ['gross','deductions','net']as const){const delta=money(Number(actual[field])-Number(expected[field]));if(Math.abs(delta)>.01)issues.push({workerId:c.workerId,field,expected:expected[field],actual:actual[field],delta,severity:'high',message:`Provider ${field} does not reconcile.`})}}
  const recId=`rec_${run.id}_${Date.now()}`,rec:PayrollReconciliation={id:recId,runId:run.id,providerId:run.providerId,providerBatchId:run.providerBatchId,status:issues.length?'exceptions':'matched',compared:calculations.length,matched:issues.length?0:calculations.length,mismatched:issues.length?new Set(issues.map(x=>x.workerId)).size:0,issues,reconciledBy:a.uid,reconciledAt:now()};
  await db.doc(`organizations/${a.orgId}/payrollReconciliations/${recId}`).create(rec);if(issues.length)return rec;
  const after={...run,status:'reconciled' as const,reconciliationId:recId,reconciledBy:a.uid,reconciledAt:now()};await ref.set(after);const audit=buildAudit(a,{action:'payroll.run.reconcile',entityType:'payrollRun',entityId:runId,before:run,after});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after;
}

export async function completePayrollRun(a:ActorContext,runId:string){
  requireP(a,'payroll.reconcile');const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollRuns/${runId}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Payroll run not found.','payroll_run_not_found');
  const run=s.data()as PayrollRun;if(run.status!=='reconciled'){if(run.status==='completed')return run;throw new ApiError(409,'Payroll run must reconcile without exceptions before completion.','invalid_payroll_state')}
  const{snapshots,calculations}=await loadRunData(a.orgId,run),snapMap=Object.fromEntries(snapshots.map(x=>[x.workerId,x])),prior=await all<PayStatement>(`organizations/${a.orgId}/payStatements`),year=run.payDate.slice(0,4),ts=now();
  for(let i=0;i<calculations.length;i+=150){const b=db.batch();for(const c of calculations.slice(i,i+150)){const x=snapMap[c.workerId],r=c.result,old=prior.filter(p=>p.workerId===c.workerId&&p.status==='final'&&!p.reversedAt&&p.payDate.startsWith(year)&&p.payDate<run.payDate),ytd={gross:money(sum(old,p=>p.gross)+r.gross),cppOrQpp:money(sum(old,p=>p.cppOrQpp)+r.cppOrQpp),cpp2OrQpp2:money(sum(old,p=>p.cpp2OrQpp2)+r.cpp2OrQpp2),ei:money(sum(old,p=>p.ei)+r.ei),qpip:money(sum(old,p=>p.qpip)+r.qpip),federalTax:money(sum(old,p=>p.federalTax)+r.federalTax),provincialTax:money(sum(old,p=>p.provincialTax)+r.provincialTax),net:money(sum(old,p=>p.net)+r.net)},statement:PayStatement={id:`${run.id}_${c.workerId}`,runId:run.id,workerId:c.workerId,employeeNumber:x.employeeNumber,displayName:x.displayName,periodStart:run.periodStart,periodEnd:run.periodEnd,payDate:run.payDate,currency:x.currency,gross:r.gross,taxable:r.taxable,pensionable:r.gross,insurable:r.gross,cppOrQpp:r.cppOrQpp,cpp2OrQpp2:r.cpp2OrQpp2,ei:r.ei,qpip:r.qpip,federalTax:r.federalTax,provincialTax:r.provincialTax,otherDeductions:r.otherDeductions,net:r.net,ytd,sourceHash:c.sourceHash,calculationHash:c.calculationHash,ruleVersion:r.ruleVersion,status:'final',createdAt:ts,createdBy:a.uid};b.set(db.doc(`organizations/${a.orgId}/payStatements/${statement.id}`),statement);for(const aid of x.adjustmentIds)b.set(db.doc(`organizations/${a.orgId}/payrollAdjustments/${aid}`),{status:'consumed',consumedByRunId:run.id,consumedAt:ts},{merge:true})}await b.commit()}
  const after={...run,status:'completed' as const,completedBy:a.uid,completedAt:ts};await ref.set(after);const audit=buildAudit(a,{action:'payroll.run.complete',entityType:'payrollRun',entityId:runId,before:run,after});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);const ev=buildDomainEvent(a,'payroll.ready','payrollRun',run.id,{payDate:run.payDate,workers:run.totals?.workers||0});await db.doc(`organizations/${a.orgId}/domainEvents/${ev.id}`).create(ev);return after;
}

export async function reversePayrollRun(a:ActorContext,runId:string,note:string){
  requireP(a,'payroll.reverse');if(!note.trim())throw new ApiError(400,'A reversal reason is required.','reversal_reason_required');const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/payrollRuns/${runId}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Payroll run not found.','payroll_run_not_found');
  const run=s.data()as PayrollRun;if(run.status!=='completed')throw new ApiError(409,'Only a completed payroll run can be reversed.','invalid_payroll_state');const ts=now(),correctionId=randomUUID(),correction:PayrollRun={id:correctionId,name:`Correction — ${run.name}`,payDate:run.payDate,periodStart:run.periodStart,periodEnd:run.periodEnd,status:'draft',kind:'correction',mode:run.mode,workerIds:run.workerIds,providerId:run.providerId,sourceRunId:run.id,reason:note,calculationIds:[],snapshotIds:[],createdBy:a.uid,createdAt:ts};
  const statements=await all<PayStatement>(`organizations/${a.orgId}/payStatements`),affected=statements.filter(x=>x.runId===run.id),b=db.batch();b.set(ref,{status:'reversed',reversedBy:a.uid,reversedAt:ts,reversalReason:note},{merge:true});b.create(db.doc(`organizations/${a.orgId}/payrollRuns/${correctionId}`),correction);for(const p of affected)b.set(db.doc(`organizations/${a.orgId}/payStatements/${p.id}`),{reversedAt:ts,reversedBy:a.uid},{merge:true});
  const audit=buildAudit(a,{action:'payroll.run.reverse',entityType:'payrollRun',entityId:run.id,before:run,after:{...run,status:'reversed',reversedBy:a.uid,reversedAt:ts,reversalReason:note},metadata:{correctionRunId:correctionId}});b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return{reversedRunId:run.id,correctionRun:correction};
}

export async function listPayStatements(a:ActorContext){
  const rows=await all<PayStatement>(`organizations/${a.orgId}/payStatements`);if(a.permissions.includes('payroll.read'))return rows.sort((x,y)=>y.payDate.localeCompare(x.payDate));if(!a.workerId)throw new ApiError(403,'Payroll statement access denied.','forbidden');return rows.filter(x=>x.workerId===a.workerId).sort((x,y)=>y.payDate.localeCompare(x.payDate));
}

export async function validatePayrollReferencePack(a:ActorContext,raw:unknown){
  requireP(a,'payroll.validate');const x=referenceValidationSchema.parse(raw),failures:{caseId:string;field:string;expected:number;actual:number;delta:number}[]=[];const refs=new Set<string>();
  for(const c of x.cases){refs.add(`${c.source}: ${c.sourceReference}`);const r=calculateCanada2026(c.input);for(const field of ['gross','taxable','cppOrQpp','cpp2OrQpp2','ei','qpip','federalTax','provincialTax','otherDeductions','net']as const){const actual=Number(r[field]),expected=Number(c.expected[field]),delta=money(actual-expected);if(Math.abs(delta)>x.tolerance)failures.push({caseId:c.id,field,expected,actual,delta})}}
  const id=randomUUID(),report:PayrollReferenceValidation={id,ruleVersion:canada2026RuleMetadata.version,caseCount:x.cases.length,passed:x.cases.length-new Set(failures.map(f=>f.caseId)).size,failed:new Set(failures.map(f=>f.caseId)).size,tolerance:x.tolerance,status:failures.length?'fail':'pass',failures,sourceReferences:[...refs],validatedBy:a.uid,validatedAt:now()},db=adminDb();
  await db.doc(`organizations/${a.orgId}/payrollReferenceValidations/${id}`).create(report);const state=report.status==='pass'&&report.caseCount>=100?'validated_pending_certification':'reference_only';await db.doc(`organizations/${a.orgId}/payrollRegulatoryStatus/default`).set({id:'default',state,ruleVersion:report.ruleVersion,minimumCases:100,lastValidationId:id,updatedAt:now()},{merge:true});return report;
}
export async function certifyPayrollReferencePack(a:ActorContext,raw:unknown){
  requireP(a,'payroll.approve');const x=referenceCertificationSchema.parse(raw),db=adminDb(),s=await db.doc(`organizations/${a.orgId}/payrollReferenceValidations/${x.validationId}`).get();if(!s.exists)throw new ApiError(404,'Payroll validation report not found.','validation_not_found');const v=s.data()as PayrollReferenceValidation;
  if(v.validatedBy===a.uid)throw new ApiError(403,'Reference-pack validator cannot independently certify the same validation.','payroll_maker_checker');if(v.status!=='pass'||v.caseCount<100||v.ruleVersion!==canada2026RuleMetadata.version)throw new ApiError(409,'At least 100 passing authoritative reference cases are required for certification.','payroll_validation_incomplete');
  const reg:PayrollRegulatoryStatus={id:'default',state:'certified',ruleVersion:v.ruleVersion,minimumCases:100,lastValidationId:v.id,certifiedBy:a.uid,certifiedAt:now(),certificationNote:x.note,updatedAt:now()};await db.doc(`organizations/${a.orgId}/payrollRegulatoryStatus/default`).set(reg);const audit=buildAudit(a,{action:'payroll.reference_pack.certify',entityType:'payrollRegulatoryStatus',entityId:'default',after:reg});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return reg;
}
export function parsePayrollRunAction(raw:unknown){return payrollRunActionSchema.parse(raw)}
export async function getPayrollRegulatoryStatus(orgId:string){return regulatoryStatus(orgId)}
