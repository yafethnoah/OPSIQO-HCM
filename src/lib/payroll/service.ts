import{randomUUID}from'crypto';
import type{ActorContext,Permission}from'@/domain/security';
import type{PayrollDashboard,PayrollProviderConfig,PayrollSyncRun}from'@/domain/payroll';
import{adminDb}from'@/lib/firebase/admin';
import{ApiError}from'@/lib/http/errors';
import{buildAudit}from'@/lib/audit/service';
import{providerSchema,calculationSchema}from'./schemas';
import{calculateCanada2026,canada2026RuleMetadata}from'./canada-2026';
import{getPayrollRegulatoryStatus}from'./control-plane';

const now=()=>new Date().toISOString();
function req(a:ActorContext,p:Permission){if(!a.permissions.includes(p))throw new ApiError(403,`Payroll permission required: ${p}.`,'forbidden')}
async function all<T>(p:string){const s=await adminDb().collection(p).limit(4000).get();return s.docs.map(d=>({id:d.id,...d.data()}as T))}
export async function createPayrollProvider(a:ActorContext,raw:unknown){
  req(a,'payroll.provider.manage');const x=providerSchema.parse(raw);if(x.secretRefs.some(v=>/AIza|-----BEGIN|password\s*=|token\s*=/i.test(v)))throw new ApiError(400,'Store only secret reference names, never credential values.','secret_value_forbidden');
  const id=randomUUID(),ts=now(),row:PayrollProviderConfig={id,...x,status:'configured',createdBy:a.uid,createdAt:ts,updatedBy:a.uid,updatedAt:ts},db=adminDb(),audit=buildAudit(a,{action:'payroll.provider.create',entityType:'payrollProvider',entityId:id,after:{...row,secretRefs:row.secretRefs.map(()=> '[secret-ref]')}});
  const b=db.batch();b.create(db.doc(`organizations/${a.orgId}/payrollProviders/${id}`),row);b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row;
}
export async function calculatePayroll(a:ActorContext,raw:unknown){
  req(a,'payroll.calculate');const x=calculationSchema.parse(raw),result=calculateCanada2026(x),id=randomUUID(),db=adminDb(),audit=buildAudit(a,{action:'payroll.calculation.reference',entityType:'payrollCalculation',entityId:id,after:result});
  const b=db.batch();b.create(db.doc(`organizations/${a.orgId}/payrollCalculations/${id}`),{id,...result,createdBy:a.uid,createdAt:now()});b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return{id,...result};
}
export async function runPayrollSync(a:ActorContext,providerId:string){
  req(a,'payroll.export');const s=await adminDb().doc(`organizations/${a.orgId}/payrollProviders/${providerId}`).get();if(!s.exists)throw new ApiError(404,'Payroll provider not found.','provider_not_found');throw new ApiError(409,'Standalone payroll sync is disabled. Export an approved payroll run so the provider receives source-bound employee records.','payroll_run_required');
}
export async function payrollDashboard(a:ActorContext):Promise<PayrollDashboard>{
  req(a,'payroll.read');const base=`organizations/${a.orgId}`,[providers,syncRuns,payrollRuns,workerProfiles,adjustments,regulatoryStatus]=await Promise.all([all<PayrollProviderConfig>(`${base}/payrollProviders`),all<PayrollSyncRun>(`${base}/payrollSyncRuns`),all<any>(`${base}/payrollRuns`),all<any>(`${base}/payrollWorkerProfiles`),all<any>(`${base}/payrollAdjustments`),getPayrollRegulatoryStatus(a.orgId)]);
  const openRuns=payrollRuns.filter((x:any)=>!['completed','reversed','cancelled'].includes(x.status)).length,pendingAdjustments=adjustments.filter((x:any)=>x.status==='submitted').length,exceptions=syncRuns.reduce((n,x)=>n+x.rejected,0),certified=regulatoryStatus.state==='certified'&&regulatoryStatus.ruleVersion===canada2026RuleMetadata.version;
  return{providers,syncRuns,payrollRuns,workerProfiles,adjustments,regulatoryStatus,metrics:[{key:'runs',label:'Open payroll runs',value:openRuns,helper:'Controlled lifecycle: calculate → review → approve → export → reconcile → complete'},{key:'profiles',label:'Payroll profiles',value:workerProfiles.filter((x:any)=>x.enabled).length,helper:'Authoritative worker tax/pay setup'},{key:'adjustments',label:'Pending adjustments',value:pendingAdjustments,helper:'Maker-checker review required'},{key:'errors',label:'Provider exceptions',value:exceptions,helper:'Must reconcile before completion'},{key:'rules',label:'Payroll rules',value:canada2026RuleMetadata.version,helper:certified?'Independently certified reference pack':'Reference/UAT only until independently certified'}],ruleVersion:canada2026RuleMetadata.version,regulatedValidationStatus:certified?'certified':'uat_controls_ready_reference_validation_required',generatedAt:now(),disclaimer:certified?'Payroll control plane is certified for the active rule version; provider-specific production certification remains required.':'Payroll control plane is UAT-ready. Production payroll remains fail-closed until independent CRA/Revenu Québec reference reconciliation, two-person certification, jurisdictional edge-case UAT and a bound production provider adapter all pass.'};
}
