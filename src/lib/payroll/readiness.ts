import type{ActorContext}from'@/domain/security';
import type{Worker}from'@/domain/hr';
import type{WorkerCompensationRecord}from'@/domain/compensation';
import type{PayrollWorkerProfile}from'@/domain/payroll';
import{adminDb}from'@/lib/firebase/admin';
import{ApiError}from'@/lib/http/errors';
import{normalizeStoredCompensation}from'@/lib/compensation/pay-normalization';
import{preparePayrollProfileDrafts}from'@/lib/compensation/readiness';

async function all<T>(path:string,limit=4000){const s=await adminDb().collection(path).limit(limit).get();return s.docs.map(d=>({id:d.id,...d.data()}as T));}

export async function getPayrollReadiness(a:ActorContext){
  if(!a.permissions.includes('payroll.read'))throw new ApiError(403,'Payroll read permission required.','forbidden');
  const base=`organizations/${a.orgId}`;
  const[workers,current,profiles,drafts]=await Promise.all([
    all<Worker>(`${base}/workers`),all<WorkerCompensationRecord>(`${base}/workerCompensationCurrent`),
    all<PayrollWorkerProfile>(`${base}/payrollWorkerProfiles`),all<any>(`${base}/payrollProfileDrafts`)
  ]);
  const compMap=new Map(current.map(x=>[x.workerId,x])),profileMap=new Map(profiles.map(x=>[x.workerId,x])),draftMap=new Map(drafts.map(x=>[x.workerId,x]));
  const rows=workers.filter(w=>w.status==='active'||w.status==='leave').map(w=>{
    const comp=compMap.get(w.id),profile=profileMap.get(w.id),draft=draftMap.get(w.id),issues:string[]=[];
    if(!comp)issues.push('Missing compensation');
    if(!profile)issues.push(draft?'Payroll profile draft requires review':'Missing payroll profile');
    if(profile&&!profile.enabled)issues.push('Payroll profile disabled');
    if(profile&&!profile.payPeriodsPerYear)issues.push('Pay frequency is missing');
    const pay=comp?normalizeStoredCompensation(comp):undefined;
    return{workerId:w.id,displayName:w.displayName,employeeNumber:w.employeeNumber,hourlyRate:pay?.hourlyRate,monthlyPay:pay?.monthlyPay,annualPay:pay?.annualPay,currency:comp?.currency,issues,ready:issues.length===0,draft:Boolean(draft)};
  });
  return{
    totalWorkers:rows.length,readyWorkers:rows.filter(x=>x.ready).length,
    missingCompensation:rows.filter(x=>x.issues.includes('Missing compensation')).length,
    missingProfiles:rows.filter(x=>x.issues.some(i=>i.includes('payroll profile')||i.includes('Payroll profile'))).length,
    draftProfiles:rows.filter(x=>x.draft).length,workers:rows,generatedAt:new Date().toISOString()
  };
}

export async function preparePayrollReadinessDrafts(a:ActorContext){
  if(!a.permissions.includes('payroll.provider.manage'))throw new ApiError(403,'Payroll provider management permission required.','forbidden');
  return preparePayrollProfileDrafts(a);
}