import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const check=(name,ok)=>{checks.push([name,ok]);console.log(`${ok?'PASS':'FAIL'}  ${name}`);};

const domain=read('src/domain/opsiqo-one-v7-13.ts');
const service=read('src/lib/opsiqo-one/agent-builder.ts');
const ui=read('src/components/agent-builder-workspace.tsx');
const governance=read('src/components/ai-governance-center.tsx');
const governanceService=read('src/lib/opsiqo-one/agent-governance.ts');
const route=read('src/app/api/organizations/[orgId]/opsiqo-one/agent-builder/[agentId]/history/route.ts');
const rules=read('firestore.rules');
const identity=read('src/lib/release/identity.ts');

check('canonical owner and steward',domain.includes('ownerUid')&&domain.includes('stewardUid'));
check('immutable agent version type',domain.includes('CustomAgentVersion')&&service.includes('/versions/${version.id}'));
check('dry-run simulation evidence',service.includes("action:z.literal('simulate')")&&service.includes('authoritativeWritesPerformed:false'));
check('simulation gate before review/activation',service.includes('custom_agent_simulation_required')&&service.includes('latestSimulationVersion!==before.currentVersion'));
check('fixed tool/action allowlists',service.includes("const toolIds=['organizational_memory.search'")&&service.includes("const actionTypes=['observe','recommend','prepare_document'"));
check('consequential actions stay human controlled',service.includes('custom_agent_human_approval_required')&&service.includes("executionAuthority:'none'"));
check('execution/lifecycle history',service.includes("ref.collection('executions')")&&route.includes('getCustomAgentHistory'));
check('Agent Builder UI integration',ui.includes('H51 Agent System of Record')&&ui.includes('Evidence history')&&ui.includes('Create new immutable version'));
check('AI Governance integration preserved',governance.includes('href="/agent-builder"')&&governance.includes('Agent Builder')&&governanceService.includes("import { activeCustomCortexAgents } from './agent-builder';")&&governanceService.includes('...await activeCustomCortexAgents(actor)'));
check('server-only Firestore boundary',rules.includes('H51.1 Agent System of Record')&&rules.includes('match /versions/{versionId} { allow read, write: if false; }'));
check('H51.1 release lineage',identity.includes("OPSIQO_PATCH_RELEASE || 'H51.1'")&&identity.includes("OPSIQO_UPGRADE_PARENT_PATCH = 'H50.6K'")&&identity.includes("'H50.6J'")&&identity.includes("'H50.6K'"));

if(checks.some(([,ok])=>!ok)){console.error('\nOPSIQO H51.1 AGENT SYSTEM OF RECORD AUDIT: FAIL');process.exit(1);}
console.log('\nOPSIQO H51.1 AGENT SYSTEM OF RECORD AUDIT: PASS');
