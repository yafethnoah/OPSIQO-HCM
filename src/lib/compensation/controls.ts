import{randomUUID}from'crypto';
import type{ActorContext}from'@/domain/security';
import{adminDb}from'@/lib/firebase/admin';
import{ApiError}from'@/lib/http/errors';
import{buildAudit}from'@/lib/audit/service';
import{buildDomainEvent}from'@/lib/events/build';
import{actCompensationCycle}from'./service';
import{benchmarkProvenanceSchema,compensationCorrectionActionSchema,compensationCorrectionSchema,compensationFxRateSchema,letterSupersedeSchema}from'./schemas';

const now=()=>new Date().toISOString(),today=()=>now().slice(0,10);
const addDays=(d:string,n:number)=>{const x=new Date(`${d}T12:00:00Z`);x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
function manage(a:ActorContext){if(!a.permissions.includes('compensation.manage'))throw new ApiError(403,'Compensation management permission required.','forbidden')}
function approve(a:ActorContext){if(!a.permissions.includes('compensation.approve'))throw new ApiError(403,'Compensation approval permission required.','forbidden')}

export async function actCompensationCycleControlled(a:ActorContext,cycleId:string,raw:unknown){
  manage(a);const db=adminDb(),lock=db.doc(`organizations/${a.orgId}/compensationCycleLocks/${cycleId}`),leaseUntil=new Date(Date.now()+30000).toISOString();
  await db.runTransaction(async tx=>{const s=await tx.get(lock),d=s.data()as any;if(d?.locked&&d.leaseUntil>now())throw new ApiError(409,'Another compensation-cycle update is already in progress. Retry after it completes.','compensation_cycle_locked');tx.set(lock,{cycleId,locked:true,lockedBy:a.uid,lockedAt:now(),leaseUntil,sequence:Number(d?.sequence||0)+1},{merge:true})});
  try{return await actCompensationCycle(a,cycleId,raw)}finally{await lock.set({locked:false,releasedAt:now(),releasedBy:a.uid},{merge:true})}
}

export async function recordCompensationFxRate(a:ActorContext,raw:unknown){
  approve(a);const x=compensationFxRateSchema.parse(raw),db=adminDb(),id=randomUUID(),ts=now(),row={id,...x,verifiedBy:a.uid,verifiedAt:ts,createdAt:ts};
  const audit=buildAudit(a,{action:'compensation.fx_rate.record',entityType:'compensationFxRate',entityId:id,after:row});const b=db.batch();b.create(db.doc(`organizations/${a.orgId}/compensationFxRates/${id}`),row);b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row;
}
export async function saveBenchmarkProvenance(a:ActorContext,raw:unknown){
  manage(a);const x=benchmarkProvenanceSchema.parse(raw),db=adminDb(),bench=await db.doc(`organizations/${a.orgId}/marketBenchmarks/${x.benchmarkId}`).get();if(!bench.exists)throw new ApiError(404,'Market benchmark not found.','benchmark_not_found');
  const ref=db.doc(`organizations/${a.orgId}/marketBenchmarkProvenance/${x.benchmarkId}`),before=(await ref.get()).data(),row={id:x.benchmarkId,...x,verifiedBy:a.uid,verifiedAt:now()};await ref.set(row);
  const audit=buildAudit(a,{action:'compensation.benchmark_provenance.save',entityType:'marketBenchmarkProvenance',entityId:x.benchmarkId,before,after:row});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return row;
}
export async function createCompensationCorrection(a:ActorContext,raw:unknown){
  manage(a);const x=compensationCorrectionSchema.parse(raw);if(x.effectiveDate>today())throw new ApiError(409,'Future compensation changes must use an approved compensation cycle.','future_compensation_requires_cycle');
  const db=adminDb(),current=(await db.doc(`organizations/${a.orgId}/workerCompensationCurrent/${x.workerId}`).get()).data()as any;if(!current)throw new ApiError(409,'Current compensation record is required before creating a correction.','current_compensation_missing');
  const id=randomUUID(),ts=now(),row={id,...x,status:'submitted',beforeRecordId:current.id,before:{currency:current.currency,payBasis:current.payBasis,basePay:current.basePay,annualizedBasePay:current.annualizedBasePay,variableTargetPct:current.variableTargetPct,allowancesAnnual:current.allowancesAnnual},createdBy:a.uid,createdAt:ts};
  const audit=buildAudit(a,{action:'compensation.correction.submit',entityType:'compensationCorrection',entityId:id,after:row});const b=db.batch();b.create(db.doc(`organizations/${a.orgId}/compensationCorrections/${id}`),row);b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row;
}
export async function actCompensationCorrection(a:ActorContext,correctionId:string,raw:unknown){
  approve(a);const x=compensationCorrectionActionSchema.parse(raw),db=adminDb(),ref=db.doc(`organizations/${a.orgId}/compensationCorrections/${correctionId}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Compensation correction not found.','correction_not_found');const c=s.data()as any;
  if(c.status!=='submitted')return c;if(c.createdBy===a.uid)throw new ApiError(403,'Correction maker cannot approve the same correction.','compensation_maker_checker');
  if(x.action==='reject'){const after={...c,status:'rejected',reviewedBy:a.uid,reviewedAt:now(),decisionNote:x.note||''};await ref.set(after);const audit=buildAudit(a,{action:'compensation.correction.reject',entityType:'compensationCorrection',entityId:correctionId,before:c,after});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return after}
  if(c.before.currency!==c.currency){if(!c.fxRateId)throw new ApiError(409,'Currency correction requires a reviewed FX rate record.','fx_rate_required');const fx=await db.doc(`organizations/${a.orgId}/compensationFxRates/${c.fxRateId}`).get();if(!fx.exists)throw new ApiError(409,'Referenced FX rate record was not found.','fx_rate_missing')}
  const history=(await db.collection(`organizations/${a.orgId}/workerCompensationRecords`).where('workerId','==',c.workerId).limit(1000).get()).docs.map(d=>({id:d.id,...d.data()}as any)).sort((u,v)=>u.effectiveDate.localeCompare(v.effectiveDate));
  const predecessor=[...history].filter(r=>r.effectiveDate<=c.effectiveDate&&!r.supersededByCorrectionId).sort((u,v)=>v.effectiveDate.localeCompare(u.effectiveDate))[0],successor=history.filter(r=>r.effectiveDate>c.effectiveDate&&!r.supersededByCorrectionId).sort((u,v)=>u.effectiveDate.localeCompare(v.effectiveDate))[0],newId=`corr_${correctionId}`,ts=now(),newRow={id:newId,workerId:c.workerId,effectiveDate:c.effectiveDate,endDate:successor?addDays(successor.effectiveDate,-1):undefined,currency:c.currency,payBasis:c.payBasis,basePay:c.basePay,annualizedBasePay:c.annualizedBasePay,variableTargetPct:c.variableTargetPct,allowancesAnnual:c.allowancesAnnual,changeReason:'adjustment',note:`Approved correction ${correctionId}. ${c.reason}`,correctionOfRecordId:predecessor?.id,sourceCorrectionId:correctionId,createdBy:a.uid,createdAt:ts};
  await db.runTransaction(async tx=>{const newRef=db.doc(`organizations/${a.orgId}/workerCompensationRecords/${newId}`),currentRef=db.doc(`organizations/${a.orgId}/workerCompensationCurrent/${c.workerId}`),[newSnap,cur]=await Promise.all([tx.get(newRef),tx.get(currentRef)]);if(newSnap.exists)return;const curData=cur.data()as any;if(predecessor){tx.set(db.doc(`organizations/${a.orgId}/workerCompensationRecords/${predecessor.id}`),predecessor.effectiveDate===c.effectiveDate?{supersededByCorrectionId:newId,supersededAt:ts}:{endDate:addDays(c.effectiveDate,-1)},{merge:true})}tx.create(newRef,newRow);if(!successor&&(!curData||c.effectiveDate>=curData.effectiveDate))tx.set(currentRef,newRow);tx.set(ref,{status:'approved',reviewedBy:a.uid,reviewedAt:ts,decisionNote:x.note||'',appliedRecordId:newId},{merge:true});if(Number(c.retroPayAmount||0)>0){const aid=`compcorr_${correctionId}`;tx.set(db.doc(`organizations/${a.orgId}/payrollAdjustments/${aid}`),{id:aid,workerId:c.workerId,type:'retro',amount:c.retroPayAmount,payDate:c.retroPayDate,note:`Retro pay from approved compensation correction ${correctionId}.`,evidenceRefs:c.evidenceRefs||[],status:'submitted',sourceCompensationCorrectionId:correctionId,createdBy:a.uid,createdAt:ts})}});
  const ev=buildDomainEvent(a,'compensation.changed','worker',c.workerId,{correctionId,recordId:newId,retroPayAmount:c.retroPayAmount||0});await db.doc(`organizations/${a.orgId}/domainEvents/${ev.id}`).create(ev);const audit=buildAudit(a,{action:'compensation.correction.approve',entityType:'compensationCorrection',entityId:correctionId,before:c,after:{...c,status:'approved',appliedRecordId:newId}});await db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`).create(audit);return(await ref.get()).data();
}
export async function supersedeCompensationLetter(a:ActorContext,letterId:string,raw:unknown){
  approve(a);const x=letterSupersedeSchema.parse(raw),db=adminDb(),ref=db.doc(`organizations/${a.orgId}/compensationLetters/${letterId}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Compensation letter not found.','compensation_letter_not_found');const old=s.data()as any,version=Number(old.version||1)+1,newId=`${old.recommendationId}_letter_v${version}`,ts=now(),row={...old,id:newId,status:'ready',version,supersedesLetterId:old.id,revisionReason:x.reason,generatedAt:ts,generatedBy:a.uid,releasedAt:undefined,releasedBy:undefined,isCurrent:true};
  const b=db.batch();b.create(db.doc(`organizations/${a.orgId}/compensationLetters/${newId}`),row);b.set(ref,{isCurrent:false,supersededByLetterId:newId,supersededAt:ts},{merge:true});const audit=buildAudit(a,{action:'compensation.letter.supersede',entityType:'compensationLetter',entityId:newId,before:old,after:row});b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row;
}
