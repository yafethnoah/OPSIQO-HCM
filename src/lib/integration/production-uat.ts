import type { IntegrationConnector, IntegrationDashboard, IntegrationReconciliation, IntegrationRun } from '@/domain/integration';
import type { IntegrationAdapterProfile, IntegrationRuntimeDashboard, IntegrationSandboxResult } from '@/domain/integration-runtime';

export type IntegrationProductionUatCheckStatus='pass'|'fail'|'not_applicable';
export interface IntegrationProductionUatCheck { id:string; status:IntegrationProductionUatCheckStatus; title:string; detail:string; }
export interface IntegrationConnectorProductionUat {
  connectorId:string; code:string; name:string; status:'candidate'|'review_required'; coverage:number;
  activeProfileIds:string[]; latestSandboxAt?:string; latestSuccessfulTestRunAt?:string; latestReconciliationAt?:string;
  checks:IntegrationProductionUatCheck[];
}
export interface IntegrationProductionUatEvidencePack {
  schemaVersion:'OPSIQO_ONE_V7_23_INTEGRATION_PRODUCTION_UAT';
  status:'candidate'|'review_required'|'not_assessed';
  coverage:number;
  activeConnectorCount:number;
  candidateConnectorCount:number;
  reviewRequiredConnectorCount:number;
  connectors:IntegrationConnectorProductionUat[];
  generatedAt:string;
  boundary:string;
}

const days=(n:number)=>Date.now()-n*86400000;
const recent=(value:string|undefined,windowDays:number)=>Boolean(value&&new Date(value).getTime()>=days(windowDays));
const pass=(id:string,title:string,detail:string):IntegrationProductionUatCheck=>({id,status:'pass',title,detail});
const fail=(id:string,title:string,detail:string):IntegrationProductionUatCheck=>({id,status:'fail',title,detail});
const na=(id:string,title:string,detail:string):IntegrationProductionUatCheck=>({id,status:'not_applicable',title,detail});

function profilesFor(c:IntegrationConnector,runtime:IntegrationRuntimeDashboard){return runtime.profiles.filter(p=>p.connectorId===c.id&&p.status==='active')}
function latestSandbox(profiles:IntegrationAdapterProfile[],runtime:IntegrationRuntimeDashboard):IntegrationSandboxResult|undefined{
  const ids=new Set(profiles.map(p=>p.id));return runtime.sandboxResults.filter(s=>ids.has(s.profileId)).sort((a,b)=>b.executedAt.localeCompare(a.executedAt))[0];
}
function latestTestRun(c:IntegrationConnector,base:IntegrationDashboard):IntegrationRun|undefined{return base.runs.filter(r=>r.connectorId===c.id&&r.mode==='test'&&r.status==='succeeded').sort((a,b)=>b.startedAt.localeCompare(a.startedAt))[0]}
function latestReconciliation(c:IntegrationConnector,base:IntegrationDashboard):IntegrationReconciliation|undefined{return base.reconciliations.filter(r=>r.connectorId===c.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]}

export function buildIntegrationProductionUatEvidence(base:IntegrationDashboard,runtime:IntegrationRuntimeDashboard):IntegrationProductionUatEvidencePack{
  const active=base.connectors.filter(c=>c.status==='active');
  const connectors=active.map(c=>{
    const checks:IntegrationProductionUatCheck[]=[];const profiles=profilesFor(c,runtime),sandbox=latestSandbox(profiles,runtime),testRun=latestTestRun(c,base),recon=latestReconciliation(c,base);
    checks.push(c.health==='healthy'?pass('health','Connector health is healthy',`Recorded connector health is ${c.health}.`):fail('health','Connector health requires review',`Recorded connector health is ${c.health}.`));
    if(['rest_json','scim2'].includes(c.protocol))checks.push(c.baseUrl&&/^https:\/\//i.test(c.baseUrl)?pass('https','Production endpoint uses HTTPS','Recorded REST/SCIM base URL uses HTTPS.'):fail('https','Production endpoint must use HTTPS','Recorded REST/SCIM base URL is absent or not HTTPS.'));else checks.push(na('https','HTTPS check not applicable',`Connector protocol is ${c.protocol}.`));
    checks.push(c.authMode==='none'||Boolean(c.secretRef)?pass('secret-reference','Credential material is referenced, not embedded','Authenticated connector has a governed secret reference or requires no authentication.'):fail('secret-reference','Governed secret reference missing','Authenticated production connectors require a server-side secret reference.'));
    checks.push(c.idempotencyRequired?pass('idempotency','Idempotency is required','Duplicate-delivery protection is enabled in connector governance.'):fail('idempotency','Idempotency must be required','Production connector does not currently require idempotency.'));
    if(c.direction==='outbound')checks.push(na('reconciliation-policy','Inbound reconciliation policy not applicable','Connector is outbound-only.'));else checks.push(c.reconciliationRequired?pass('reconciliation-policy','Reconciliation is required','Inbound/bidirectional connector requires reconciliation.'):fail('reconciliation-policy','Reconciliation must be required','Inbound/bidirectional connector does not require reconciliation.'));
    checks.push(profiles.length>0?pass('active-profile','Active runtime profile exists',`${profiles.length} active runtime profile(s) recorded.`):fail('active-profile','Active runtime profile required','No active runtime profile is recorded for this connector.'));
    const profileContracts=profiles.map(p=>base.contracts.find(x=>x.id===p.contractId));const contractsOk=profiles.length>0&&profileContracts.every(x=>x?.status==='approved');
    checks.push(contractsOk?pass('approved-contract','Active profiles use approved contracts','Every active runtime profile references an approved contract.'):fail('approved-contract','Approved contract evidence required','One or more active profiles are missing an approved contract, or no active profile exists.'));
    checks.push(sandbox?.status==='passed'&&recent(sandbox.executedAt,30)?pass('sandbox','Recent sandbox validation passed',`Latest sandbox pass: ${sandbox.executedAt}.`):fail('sandbox','Recent passing sandbox validation required',sandbox?`Latest sandbox result is ${sandbox.status} at ${sandbox.executedAt}.`:'No sandbox evidence is recorded.'));
    checks.push(testRun&&recent(testRun.completedAt||testRun.startedAt,30)?pass('test-run','Recent successful test run exists',`Latest successful test run: ${testRun.completedAt||testRun.startedAt}.`):fail('test-run','Recent successful test run required','No successful mode=test run is recorded within the last 30 days.'));
    const recentFailures=base.runs.filter(r=>r.connectorId===c.id&&recent(r.startedAt,1)&&['failed','dead_lettered'].includes(r.status));
    checks.push(recentFailures.length===0?pass('recent-failures','No failed runs in the last 24 hours','No failed/dead-lettered connector runs were recorded in the last 24 hours.'):fail('recent-failures','Recent failed runs require review',`${recentFailures.length} failed/dead-lettered run(s) recorded in the last 24 hours.`));
    const openDlq=base.deadLetters.filter(d=>d.connectorId===c.id&&d.status==='open');checks.push(openDlq.length===0?pass('dead-letters','No open dead letters','No unresolved dead-letter evidence is recorded.'):fail('dead-letters','Open dead letters must be resolved',`${openDlq.length} open dead-letter item(s) recorded.`));
    const variances=base.reconciliations.filter(r=>r.connectorId===c.id&&r.status!=='matched'&&!['accepted','resolved'].includes(r.reviewStatus));checks.push(variances.length===0?pass('variance','No unresolved reconciliation variance','No unresolved reconciliation variance is recorded.'):fail('variance','Reconciliation variance requires review',`${variances.length} unresolved reconciliation variance(s) recorded.`));
    const profileIds=new Set(profiles.map(p=>p.id));const openCircuits=runtime.states.filter(s=>profileIds.has(s.profileId)&&s.circuitStatus==='open'&&(!s.openUntil||new Date(s.openUntil).getTime()>Date.now()));checks.push(openCircuits.length===0?pass('circuit','No active runtime circuit is open','Runtime circuit-breaker state is closed/clear for active profiles.'):fail('circuit','Open runtime circuit requires review',`${openCircuits.length} active profile circuit(s) are open.`));
    if(c.reconciliationRequired){const reconOk=Boolean(recon&&recent(recon.createdAt,30)&&(recon.status==='matched'||['accepted','resolved'].includes(recon.reviewStatus)));checks.push(reconOk?pass('recent-reconciliation','Recent governed reconciliation evidence exists',`Latest reconciliation: ${recon!.createdAt} · ${recon!.status}/${recon!.reviewStatus}.`):fail('recent-reconciliation','Recent reconciliation evidence required',recon?`Latest reconciliation is ${recon.status}/${recon.reviewStatus} at ${recon.createdAt}.`:'No reconciliation evidence is recorded.'));}else checks.push(na('recent-reconciliation','Recent reconciliation not required','Connector governance does not require reconciliation.'));
    const applicable=checks.filter(x=>x.status!=='not_applicable'),passed=applicable.filter(x=>x.status==='pass').length,coverage=applicable.length?Math.round(passed/applicable.length*100):0,status=applicable.every(x=>x.status==='pass')?'candidate':'review_required';
    return{connectorId:c.id,code:c.code,name:c.name,status,coverage,activeProfileIds:profiles.map(p=>p.id),latestSandboxAt:sandbox?.executedAt,latestSuccessfulTestRunAt:testRun?.completedAt||testRun?.startedAt,latestReconciliationAt:recon?.createdAt,checks} satisfies IntegrationConnectorProductionUat;
  });
  const applicable=connectors.flatMap(c=>c.checks.filter(x=>x.status!=='not_applicable')),passed=applicable.filter(x=>x.status==='pass').length,coverage=applicable.length?Math.round(passed/applicable.length*100):0,candidateConnectorCount=connectors.filter(c=>c.status==='candidate').length,reviewRequiredConnectorCount=connectors.length-candidateConnectorCount;
  return{schemaVersion:'OPSIQO_ONE_V7_23_INTEGRATION_PRODUCTION_UAT',status:connectors.length===0?'not_assessed':reviewRequiredConnectorCount?'review_required':'candidate',coverage,activeConnectorCount:connectors.length,candidateConnectorCount,reviewRequiredConnectorCount,connectors,generatedAt:new Date().toISOString(),boundary:'This production-UAT evidence pack evaluates only recorded OPSIQO connector governance, approved contracts, sandbox checks, test-mode runs, reconciliation, dead letters and runtime circuit evidence. It contains no credential values, performs no external connector execution, makes no direct HCM domain mutation and is not a vendor, legal, privacy, security or business-correctness certification.'};
}
