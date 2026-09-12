import type{ActorContext}from'@/domain/security';
import type{Assignment,Position,Worker}from'@/domain/hr';
import type{CompensationReadiness,PositionCompensationProfile,SalaryBand,WorkerCompensationRecord}from'@/domain/compensation';
import type{PayrollWorkerProfile}from'@/domain/payroll';
import{adminDb}from'@/lib/firebase/admin';
import{ApiError}from'@/lib/http/errors';
import{normalizeBandAmount,normalizeStoredCompensation}from'./pay-normalization';
import{savePositionCompProfile}from'./service';

const now=()=>new Date().toISOString();
async function all<T>(path:string,limit=4000){const s=await adminDb().collection(path).limit(limit).get();return s.docs.map(d=>({id:d.id,...d.data()}as T));}
function canRead(a:ActorContext){return a.permissions.includes('compensation.read')||a.permissions.includes('compensation.manage')||a.permissions.includes('compensation.approve');}
function pct(done:number,total:number){return total?Math.round(done/total*100):100;}

export async function getCompensationReadiness(a:ActorContext):Promise<CompensationReadiness>{
  if(!canRead(a))throw new ApiError(403,'Compensation read permission required.','forbidden');
  const base=`organizations/${a.orgId}`;
  const[workers,assignments,positions,current,profiles,bands,payrollProfiles,requisitions]=await Promise.all([
    all<Worker>(`${base}/workers`),all<Assignment>(`${base}/assignments`),all<Position>(`${base}/positions`),
    all<WorkerCompensationRecord>(`${base}/workerCompensationCurrent`),all<PositionCompensationProfile>(`${base}/positionCompensationProfiles`),
    all<SalaryBand>(`${base}/salaryBands`),all<PayrollWorkerProfile>(`${base}/payrollWorkerProfiles`),all<any>(`${base}/requisitions`)
  ]);

  const active=workers.filter(w=>w.status==='active'||w.status==='leave');
  const assignmentMap=new Map<string,Assignment>();
  for(const x of assignments.filter(x=>x.primary&&!x.endDate))assignmentMap.set(x.workerId,x);
  const positionMap=new Map(positions.map(x=>[x.id,x]));
  const compMap=new Map(current.map(x=>[x.workerId,x]));
  const profileMap=new Map(profiles.map(x=>[x.positionId,x]));
  const bandMap=new Map(bands.map(x=>[x.id,x]));
  const payrollMap=new Map(payrollProfiles.map(x=>[x.workerId,x]));

  const rows=active.map(w=>{
    const assignment=assignmentMap.get(w.id);
    const position=assignment?positionMap.get(assignment.positionId):undefined;
    const comp=compMap.get(w.id);
    const profile=position?profileMap.get(position.id):undefined;
    const mappedBand=profile?.salaryBandId?bandMap.get(profile.salaryBandId):undefined;
    const payroll=payrollMap.get(w.id);
    const issues:string[]=[];
    if(!position)issues.push('Missing current position');
    if(!comp)issues.push('Missing current compensation');
    if(position&&!mappedBand)issues.push('No salary band mapping');
    if(!payroll||!payroll.enabled)issues.push('Missing or disabled payroll profile');
    if(comp&&(!comp.standardHoursPerWeek||!comp.standardWeeksPerYear))issues.push('Pay conversion is using a legacy/policy schedule basis');

    let suggestedBand:CompensationReadiness['workers'][number]['suggestedBand'];
    if(comp&&position&&!mappedBand){
      const normalized=normalizeStoredCompensation(comp);
      const candidates=bands.filter(b=>{
        if(b.status!=='active'||b.currency!==comp.currency)return false;
        const low=normalizeBandAmount(b.payBasis,b.min,b.standardHoursPerWeek,b.standardWeeksPerYear).annualPay;
        const high=normalizeBandAmount(b.payBasis,b.max,b.standardHoursPerWeek,b.standardWeeksPerYear).annualPay;
        return normalized.annualPay>=low&&normalized.annualPay<=high;
      }).map(b=>{
        let confidence=55;
        if(b.payBasis===comp.payBasis)confidence+=15;
        if(b.location&&position.location&&b.location.toLowerCase()===position.location.toLowerCase())confidence+=15;
        if(!b.location)confidence+=5;
        return{b,confidence:Math.min(confidence,90)};
      }).sort((x,y)=>y.confidence-x.confidence);
      if(candidates[0])suggestedBand={bandId:candidates[0].b.id,code:candidates[0].b.code,name:candidates[0].b.name,confidence:candidates[0].confidence,reason:'Candidate band contains annualized pay in the same currency. HR review is required before mapping.'};
    }

    const normalized=comp?normalizeStoredCompensation(comp):undefined;
    return{
      workerId:w.id,displayName:w.displayName,employeeNumber:w.employeeNumber,
      positionId:position?.id,positionTitle:position?.title,currency:comp?.currency,
      hourlyRate:normalized?.hourlyRate,monthlyPay:normalized?.monthlyPay,annualPay:normalized?.annualPay,
      issues,ready:issues.filter(i=>!i.includes('legacy/policy')).length===0,suggestedBand
    };
  });

  const missingCompensation=rows.filter(x=>x.issues.includes('Missing current compensation')).length;
  const missingBand=rows.filter(x=>x.issues.includes('No salary band mapping')).length;
  const missingPayrollProfile=rows.filter(x=>x.issues.includes('Missing or disabled payroll profile')).length;
  const readyForPayroll=rows.filter(x=>x.ready).length;

  return{
    health:{
      dataCompletenessPct:pct(rows.length-missingCompensation,rows.length),
      architecturePct:pct(rows.length-missingBand,rows.length),
      payrollReadinessPct:pct(readyForPayroll,rows.length)
    },
    counts:{workers:rows.length,missingCompensation,missingBand,missingPayrollProfile,readyForPayroll},
    workers:rows,
    requisitions:requisitions.filter(r=>!['closed','cancelled','filled'].includes(String(r.status||'').toLowerCase())).slice(0,100).map(r=>({id:r.id,title:r.title||r.name||r.positionTitle||r.id,status:r.status||'open'})),
    aiSuggestions:[
      {title:'Resolve compensation readiness',prompt:`Review compensation readiness for this organization. Prioritize missing compensation records, salary-band mappings, and payroll-profile blockers. Do not make pay decisions; propose governed administrative next steps with evidence.`},
      {title:'Design salary architecture',prompt:`Review the current job families, levels, salary bands and position mappings. Identify architecture gaps and propose a sequenced configuration plan. Do not automatically change employee pay.`},
      {title:'Prepare payroll readiness plan',prompt:`Review compensation-to-payroll readiness. Explain which worker records are blocked and what authoritative data is required before payroll can run.`}
    ],
    generatedAt:now()
  };
}

export async function prepareCompensationDrafts(a:ActorContext){
  if(!a.permissions.includes('compensation.manage')&&!a.permissions.includes('compensation.approve'))throw new ApiError(403,'Compensation management permission required.','forbidden');
  const base=`organizations/${a.orgId}`,db=adminDb();
  const[workers,assignments,positions,current,profiles,bands]=await Promise.all([
    all<Worker>(`${base}/workers`),all<Assignment>(`${base}/assignments`),all<Position>(`${base}/positions`),all<WorkerCompensationRecord>(`${base}/workerCompensationCurrent`),all<PositionCompensationProfile>(`${base}/positionCompensationProfiles`),all<SalaryBand>(`${base}/salaryBands`)
  ]);
  const compIds=new Set(current.map(x=>x.workerId)),posMap=new Map(positions.map(x=>[x.id,x])),profileMap=new Map(profiles.map(x=>[x.positionId,x])),bandMap=new Map(bands.map(x=>[x.id,x]));
  const assignmentMap=new Map<string,Assignment>();for(const x of assignments.filter(x=>x.primary&&!x.endDate))assignmentMap.set(x.workerId,x);
  const drafts:any[]=[];
  for(const w of workers.filter(x=>(x.status==='active'||x.status==='leave')&&!compIds.has(x.id))){
    const assignment=assignmentMap.get(w.id),position=assignment?posMap.get(assignment.positionId):undefined,profile=position?profileMap.get(position.id):undefined,band=profile?.salaryBandId?bandMap.get(profile.salaryBandId):undefined;
    drafts.push({workerId:w.id,status:'needs_review',source:'h51.36.readiness',positionId:position?.id,positionTitle:position?.title,salaryBandId:band?.id,salaryBandCode:band?.code,currency:band?.currency||'CAD',suggestedPayBasis:band?.payBasis,standardHoursPerWeek:band?.standardHoursPerWeek||40,standardWeeksPerYear:band?.standardWeeksPerYear||52,requiredFields:['authoritative pay basis','authoritative pay amount','effective date','change reason'],note:'Administrative setup draft only. OPSIQO does not infer or decide employee pay.',updatedBy:a.uid,updatedAt:now()});
  }
  for(let i=0;i<drafts.length;i+=300){const b=db.batch();for(const x of drafts.slice(i,i+300))b.set(db.doc(`${base}/compensationSetupDrafts/${x.workerId}`),x,{merge:true});await b.commit();}
  return{prepared:drafts.length};
}

export async function preparePayrollProfileDrafts(a:ActorContext){
  if(!a.permissions.includes('compensation.manage')&&!a.permissions.includes('payroll.provider.manage'))throw new ApiError(403,'Compensation or payroll administration permission required.','forbidden');
  const base=`organizations/${a.orgId}`,db=adminDb();
  const[workers,current,profiles]=await Promise.all([
    all<Worker>(`${base}/workers`),all<WorkerCompensationRecord>(`${base}/workerCompensationCurrent`),all<PayrollWorkerProfile>(`${base}/payrollWorkerProfiles`)
  ]);
  const profileIds=new Set(profiles.map(x=>x.workerId)),compMap=new Map(current.map(x=>[x.workerId,x]));
  const drafts:any[]=[];
  for(const w of workers.filter(x=>x.status==='active'||x.status==='leave')){
    if(profileIds.has(w.id))continue;
    const comp=compMap.get(w.id);if(!comp)continue;
    const n=normalizeStoredCompensation(comp);
    drafts.push({
      workerId:w.id,status:'needs_review',source:'h51.36.readiness',
      compensationRecordId:comp.id,currency:comp.currency,
      hourlyRate:n.hourlyRate,monthlyPay:n.monthlyPay,annualPay:n.annualPay,
      standardHoursPerWeek:n.standardHoursPerWeek,standardWeeksPerYear:n.standardWeeksPerYear,
      requiredFields:['province','payPeriodsPerYear','federal claim amount','provincial claim amount','payment method'],
      updatedBy:a.uid,updatedAt:now()
    });
  }
  for(let i=0;i<drafts.length;i+=300){
    const b=db.batch();
    for(const x of drafts.slice(i,i+300))b.set(db.doc(`${base}/payrollProfileDrafts/${x.workerId}`),x,{merge:true});
    await b.commit();
  }
  return{prepared:drafts.length};
}

export async function applySuggestedBand(a:ActorContext,workerId:string,bandId:string){
  if(!a.permissions.includes('jobarchitecture.manage'))throw new ApiError(403,'Job architecture permission required.','forbidden');
  const db=adminDb(),worker=await db.doc(`organizations/${a.orgId}/workers/${workerId}`).get();
  if(!worker.exists)throw new ApiError(404,'Worker not found.','worker_not_found');
  const assignments=await db.collection(`organizations/${a.orgId}/assignments`).where('workerId','==',workerId).where('primary','==',true).limit(20).get();
  const assignment=assignments.docs.map(d=>d.data()as Assignment).filter(x=>!x.endDate).sort((x,y)=>y.startDate.localeCompare(x.startDate))[0];
  if(!assignment)throw new ApiError(409,'Worker does not have a current primary assignment.','assignment_missing');
  return savePositionCompProfile(a,{positionId:assignment.positionId,salaryBandId:bandId});
}