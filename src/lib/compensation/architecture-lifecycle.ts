import{randomUUID}from'crypto';
import type{ActorContext}from'@/domain/security';
import{adminDb}from'@/lib/firebase/admin';
import{ApiError}from'@/lib/http/errors';
import{buildAudit}from'@/lib/audit/service';

const now=()=>new Date().toISOString();
const collections={jobFamily:'jobFamilies',jobLevel:'jobLevels',salaryBand:'salaryBands'}as const;
type Kind=keyof typeof collections;

export async function updateArchitectureEntity(a:ActorContext,kind:Kind,id:string,raw:any){
  if(!a.permissions.includes('jobarchitecture.manage'))throw new ApiError(403,'Job architecture permission required.','forbidden');
  if(!collections[kind])throw new ApiError(400,'Unsupported architecture entity.','invalid_architecture_kind');
  const db=adminDb(),ref=db.doc(`organizations/${a.orgId}/${collections[kind]}/${id}`),s=await ref.get();
  if(!s.exists)throw new ApiError(404,'Architecture record not found.','architecture_record_not_found');
  const before=s.data()as any,action=String(raw?.action||'update'),changes:any={};
  if(action==='archive')changes.status='inactive';
  else if(action==='activate')changes.status='active';
  else if(action==='update'){
    for(const key of ['name','description','location','effectiveDate','min','midpoint','max','standardHoursPerWeek','standardWeeksPerYear']){
      if(raw?.[key]!==undefined)changes[key]=raw[key];
    }
    if(kind==='salaryBand'&&changes.min!==undefined&&changes.midpoint!==undefined&&changes.max!==undefined&&!(changes.min<=changes.midpoint&&changes.midpoint<=changes.max))throw new ApiError(400,'Salary band must satisfy minimum ≤ midpoint ≤ maximum.','invalid_salary_band');
  }else throw new ApiError(400,'Unsupported architecture action.','invalid_action');

  const after={...before,...changes,updatedBy:a.uid,updatedAt:now()},historyId=randomUUID();
  const history={id:historyId,kind,entityId:id,action,effectiveDate:raw?.effectiveDate||after.effectiveDate||now().slice(0,10),reason:String(raw?.reason||'Reviewed architecture lifecycle change.'),before,after,changedBy:a.uid,changedAt:now()};
  const audit=buildAudit(a,{action:`compensation.architecture.${action}`,entityType:kind,entityId:id,before,after,metadata:{historyId}});
  const b=db.batch();b.set(ref,after);b.create(db.doc(`organizations/${a.orgId}/compensationArchitectureHistory/${historyId}`),history);b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();
  return after;
}