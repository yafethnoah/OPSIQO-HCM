import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);
const builder=read('src/lib/opsiqo-one/agent-builder.ts');
const memory=read('src/lib/opsiqo-one/organizational-memory.ts');
const policy=read('src/lib/opsiqo-one/policy-intelligence.ts');
const marketplace=read('src/lib/opsiqo-one/automation-marketplace.ts');
const router=read('src/lib/opsiqo-one/command-router.ts');
const cortex=read('src/lib/opsiqo-one/cortex.ts');
const orchestration=read('src/lib/opsiqo-one/orchestration.ts');
const governance=read('src/lib/opsiqo-one/agent-governance.ts');
const evidence=read('src/lib/ai-intelligence/evidence.ts');
const workflow=read('src/lib/workflow/service.ts');
const nav=read('src/components/nav.tsx');
const more=read('src/components/more-hub-workspace.tsx');
const checks=[
 ['V7.13 domain model exists',exists('src/domain/opsiqo-one-v7-13.ts')],
 ['Agent Builder service exists',exists('src/lib/opsiqo-one/agent-builder.ts')],
 ['Custom agent authority schema excludes execute',builder.includes("z.enum(['observe','recommend','prepare'])")&&!builder.includes("maxActionLevel:z.enum(['observe','recommend','prepare','execute'])")],
 ['Custom agents carry immutable prepare hard ceiling',builder.includes("hardMaxActionLevel:'prepare'")],
 ['Custom agent activation requires ai.approve',builder.includes("requireApprove(actor)")&&builder.includes("ai.approve")],
 ['Custom agent activation rejects creator self-approval',builder.includes("before.createdBy===actor.uid")&&builder.includes('independent approver')],
 ['Custom agent lifecycle is audited',builder.includes('ai.custom_agent.create')&&builder.includes('ai.custom_agent.${action}')],
 ['Agent instructions are masked from audit payloads',builder.includes("instructions:'[governed instructions stored]'")],
 ['Custom agent orchestration requires its declared evidence permission',builder.includes("filter(x=>x.requiredAnyPermissions.some")&&!builder.slice(builder.indexOf('activeCustomAgentDefinitions')).includes("actor.permissions.includes('ai.manage')||")],
 ['Agent Builder API exists',exists('src/app/api/organizations/[orgId]/opsiqo-one/agent-builder/route.ts')&&exists('src/app/api/organizations/[orgId]/opsiqo-one/agent-builder/[agentId]/route.ts')],
 ['Agent Builder workspace has MFA terminal handling',read('src/components/agent-builder-workspace.tsx').includes('isMfaRequiredError')],
 ['Agent Builder UI states no Execute authority',read('src/components/agent-builder-workspace.tsx').includes('cannot receive Execute authority')],
 ['Organizational Memory service exists',exists('src/lib/opsiqo-one/organizational-memory.ts')],
 ['Organizational Memory indexes published policy evidence',memory.includes('currentPublishedVersionId')&&memory.includes("sourceType:'policy'")],
 ['Organizational Memory indexes published knowledge articles',memory.includes("where('status','==','published')")&&memory.includes("sourceType:'knowledge_article'")],
 ['Organizational Memory indexes governed workflow definitions',memory.includes("sourceType:'workflow'")],
 ['Organizational Memory generates explicit source IDs',memory.includes('POLICY:')&&memory.includes('KNOWLEDGE:')&&memory.includes('WORKFLOW:')],
 ['Organizational Memory has no employee/case/health/compensation source reads',!memory.includes('/workers')&&!memory.includes('/employeeDocuments')&&!memory.includes('/cases')&&!memory.includes('/health')&&!memory.includes('/compensation')],
 ['Organizational Memory can project citations into AI evidence',memory.includes('retrieveOrganizationalMemoryEvidence')&&memory.includes('AiEvidenceItem')],
 ['Ask OPSIQO consumes Organizational Memory evidence',evidence.includes('retrieveOrganizationalMemoryEvidence')],
 ['Organizational Memory API is read-only GET',read('src/app/api/organizations/[orgId]/opsiqo-one/organizational-memory/route.ts').includes('export async function GET')&&!read('src/app/api/organizations/[orgId]/opsiqo-one/organizational-memory/route.ts').includes('export async function POST')],
 ['Organizational Memory workspace exposes explicit internal citations',read('src/components/organizational-memory-workspace.tsx').includes('Explicit internal citations')],
 ['Organizational Memory workspace refuses invented policy fallback',read('src/components/organizational-memory-workspace.tsx').includes('will not fill the gap with invented company policy')],
 ['Policy Intelligence service exists',exists('src/lib/opsiqo-one/policy-intelligence.ts')],
 ['Policy Intelligence checks lifecycle/review/acknowledgement',policy.includes("category:'review'")&&policy.includes("category:'lifecycle'")&&policy.includes("category:'acknowledgement'")],
 ['Policy Intelligence provides editorial signals without legal assertions',policy.includes("category:'editorial'")&&policy.includes('editorial prompts only')],
 ['Policy Intelligence overlap signal is review-only',policy.includes("category:'overlap'")&&policy.includes('does not determine legal inconsistency')],
 ['Policy Intelligence surfaces policy-triggered workflows',policy.includes("w.trigger.startsWith('policy.')")],
 ['Policy Intelligence explicitly disclaims legal compliance conclusions',policy.includes('does not determine legal applicability')&&policy.includes('legal compliance')],
 ['Policy Intelligence API is read-only GET',read('src/app/api/organizations/[orgId]/opsiqo-one/policy-intelligence/route.ts').includes('export async function GET')&&!read('src/app/api/organizations/[orgId]/opsiqo-one/policy-intelligence/route.ts').includes('export async function POST')],
 ['Policy Intelligence workspace has MFA handling',read('src/components/policy-intelligence-workspace.tsx').includes('isMfaRequiredError')],
 ['Automation Marketplace service exists',exists('src/lib/opsiqo-one/automation-marketplace.ts')],
 ['Marketplace contains versioned starter packs',marketplace.includes("id:'workforce-essentials'")&&marketplace.includes("id:'nonprofit-operations'")&&marketplace.includes("id:'governance-evidence'")],
 ['Marketplace installation requires workflow.manage',marketplace.includes("actor.permissions.includes('workflow.manage')")],
 ['Marketplace installs workflows disabled',marketplace.includes('createWorkflow(actor,{...w,enabled:false})')],
 ['Marketplace prevents duplicate pack-version install',marketplace.includes('automation_pack_already_installed')],
 ['Marketplace installation is audited',marketplace.includes('automation.marketplace.install')],
 ['Marketplace does not claim donor/grant/legal compliance',marketplace.includes('does not encode donor, grant, safeguarding or employment-law compliance conclusions')],
 ['Workflow enable/disable is a separate audited domain action',workflow.includes('setWorkflowEnabled')&&workflow.includes("'workflow.enable'")&&workflow.includes("'workflow.disable'")],
 ['Workflow enable/disable route requires workflow.manage',read('src/app/api/organizations/[orgId]/workflows/[workflowId]/route.ts').includes("requirePermission(actor,'workflow.manage')")],
 ['Automation Marketplace workspace has MFA handling',read('src/components/automation-marketplace-workspace.tsx').includes('isMfaRequiredError')],
 ['Cortex registers Organizational Memory Agent',cortex.includes("id:'knowledge'")&&cortex.includes('Organizational Memory Agent')],
 ['Cortex registers Automation Architect Agent',cortex.includes("id:'automation-architect'")&&cortex.includes('Automation Architect Agent')],
 ['Policy Agent includes Policy Intelligence',cortex.includes('Policy Intelligence')],
 ['No built-in Cortex agent has execute hard cap',!cortex.includes("maxActionLevel:'execute'")],
 ['Orchestration merges permission-visible active custom agents',orchestration.includes('activeCustomAgentDefinitions(actor)')],
 ['AI Governance merges active custom agents',governance.includes('activeCustomCortexAgents')],
 ['Ask OPSIQO routes Agent Builder',router.includes("href:'/agent-builder'")],
 ['Ask OPSIQO routes Organizational Memory',router.includes("href:'/organizational-memory'")],
 ['Ask OPSIQO routes Policy Intelligence',router.includes("href:'/policy-intelligence'")],
 ['Ask OPSIQO routes Automation Marketplace',router.includes("href:'/automation-marketplace'")],
 ['Consequential employment block remains before normal routing',router.indexOf('blockedConsequential')<router.indexOf('const patterns')],
 ['Five primary outcome navigation items remain unchanged',['Home','My Work','People','Intelligence','More'].every(x=>nav.includes(`>${x}</strong>`)||nav.includes(`shellText('${x}',shellLocale)`))],
 ['New V7.13 workspaces live behind More/Admin surfaces',more.includes('Organizational Memory')&&more.includes('Policy Intelligence')&&more.includes('Agent Builder')&&more.includes('Automation Marketplace')],
 ['Product identity is V7.13 or newer while retaining HCM v8.5',/v7\.(?:1[3-9]|[2-9]\d) · HCM v8\.5/.test(nav)],
 ['All V7.13 client workspaces handle MFA',[read('src/components/agent-builder-workspace.tsx'),read('src/components/organizational-memory-workspace.tsx'),read('src/components/policy-intelligence-workspace.tsx'),read('src/components/automation-marketplace-workspace.tsx')].every(x=>x.includes('isMfaRequiredError'))],
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;}
console.log(`\nOPSIQO ONE V7.13 Agent/Memory/Policy/Marketplace audit: ${checks.length-fail}/${checks.length} PASS`);if(fail)process.exit(1);
