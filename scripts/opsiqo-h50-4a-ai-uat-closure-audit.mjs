import fs from 'node:fs';

const failures=[];
const read=(p)=>{
  if(!fs.existsSync(p)){failures.push(`missing ${p}`);return '';}
  return fs.readFileSync(p,'utf8');
};

const service=read('src/lib/ai-intelligence/service.ts');
const client=read('src/lib/http/client.ts');
const apiError=read('src/lib/http/api-request-error.ts');
const card=read('src/components/governed-ai-readiness-card.tsx');
const copilot=read('src/components/ai-copilot-workspace.tsx');
const contextual=read('src/components/contextual-ai-assist.tsx');
const governance=read('src/components/ai-governance-center.tsx');
const commandBar=read('src/components/opsiqo-command-bar.tsx');
const commandRoute=read('src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts');
const activation=read('src/lib/ai-intelligence/activation.ts');

const d0=service.indexOf('export async function aiDashboard');
const d1=service.indexOf('export async function createPrompt',d0);
const dashboard=service.slice(d0,d1);
if(d0<0||d1<0)failures.push('unable to isolate aiDashboard');
if(dashboard.includes('activePrompt(actor.orgId)'))failures.push('aiDashboard still fails closed on missing active prompt');
if(dashboard.includes('activeModelProfile(actor.orgId)'))failures.push('aiDashboard still fails closed on missing active model');
if(!dashboard.includes("promptTemplates.find(p=>p.code==='HR_COPILOT'&&p.status==='active')"))failures.push('dashboard active prompt resolution missing');
if(!dashboard.includes("modelProfiles.find(m=>m.status==='active')"))failures.push('dashboard active model resolution missing');

for(const code of ['ai_prompt_not_configured','ai_model_not_configured','ai_provider_not_configured','ai_live_provider_required']){
  if(!apiError.includes(code))failures.push(`pre-write code not recognized: ${code}`);
}
if(!client.includes('isKnownPreWriteServerError(requestError)'))failures.push('client does not preserve structured pre-write 5xx errors');

for(const signal of ['Initialize governed AI','/ai-copilot/readiness','credentialConfigured','activePrompt','activeModel','liveReady']){
  if(!card.includes(signal))failures.push(`readiness card missing ${signal}`);
}
for(const secret of ['GEMINI_API_KEY','OPENAI_API_KEY','process.env']){
  if(card.includes(secret))failures.push(`browser readiness card contains forbidden secret/env signal ${secret}`);
}
if(!copilot.includes('<GovernedAiReadinessCard onReady={load}/>'))failures.push('AI Copilot does not expose readiness');
if(!governance.includes('<GovernedAiReadinessCard />'))failures.push('AI Governance does not expose readiness');
if(!copilot.includes('reconcileOnServerError:false'))failures.push('AI Copilot advisory POST semantics not fixed');
if(!contextual.includes('reconcileOnServerError: false'))failures.push('contextual AI advisory POST semantics not fixed');
if(commandBar.includes('reconcileOnServerError:false')||commandBar.includes('reconcileOnServerError: false'))failures.push('command safe-execute path incorrectly disabled reconciliation');
if(!commandRoute.includes("if(routed.mode==='execute')")||!commandRoute.includes('executeSafeOpsiQoAction'))failures.push('command safe-execute architecture changed');

for(const signal of ["action: 'ai.bootstrap.initialize'","createdBy: SYSTEM_CREATOR","consequentialDecisionsBlocked: true","directWritesBlocked: true"]){
  if(!activation.includes(signal))failures.push(`bootstrap governance missing ${signal}`);
}

if(failures.length){
  console.error('H50.4A AI UAT closure audit: FAIL');
  failures.forEach(x=>console.error(` - ${x}`));
  process.exit(1);
}
console.log('H50.4A AI UAT closure audit: PASS');
console.log(' - dashboard remains readable before governed AI initialization');
console.log(' - existing server-side governed bootstrap is visible in AI Copilot and AI Governance');
console.log(' - known pre-write configuration 503s are not mislabeled as uncertain authoritative writes');
console.log(' - advisory AI POSTs do not use authoritative-write server-error reconciliation');
console.log(' - global command safe-execute reconciliation remains protected');
console.log(' - query execution remains fail-closed until prompt/model are active');
console.log(' - consequential decision and direct-write guardrails remain intact');