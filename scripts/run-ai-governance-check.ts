import { adminDb } from '@/lib/firebase/admin';

const orgId=String(process.env.OPSIQO_JOB_ORG_ID||'').trim();
if(!orgId) throw new Error('Set OPSIQO_JOB_ORG_ID before running the AI governance check.');
const db=adminDb();
const [prompts,models]=await Promise.all([
  db.collection(`organizations/${orgId}/aiPromptTemplates`).where('status','==','active').get(),
  db.collection(`organizations/${orgId}/aiModelProfiles`).where('status','==','active').get()
]);
let failed=0;
function check(ok:boolean,label:string,detail:string){console.log(`${ok?'PASS':'FAIL'}  ${label}: ${detail}`);if(!ok)failed++;}
check(prompts.size===1,'Active prompt',`${prompts.size} active prompt(s)`);
check(models.size===1,'Active model profile',`${models.size} active model profile(s)`);
if(prompts.size===1){const p:any=prompts.docs[0]!.data();check(Boolean(p.activatedBy&&p.activatedAt),'Prompt approval evidence',`code=${p.code} v${p.version}`);check(Array.isArray(p.prohibitedUses)&&p.prohibitedUses.length>0,'Prompt prohibited-use register','At least one prohibited use is recorded.');}
if(models.size===1){const m:any=models.docs[0]!.data();check(Boolean(m.approvedBy&&m.approvedAt),'Model approval evidence',`${m.code} v${m.version} · ${m.provider}/${m.model}`);check(Boolean(m.purpose&&m.dataHandlingNote),'Model purpose/data handling','Purpose and provider data-handling note are documented.');const envProvider=String(process.env.OPSIQO_AI_PROVIDER||'').trim();if(envProvider)check(m.provider===envProvider,'Provider/profile alignment',`environment=${envProvider}; activeProfile=${m.provider}`);if(process.env.NODE_ENV==='production')check(m.provider!=='demo','Production provider','Demo provider must not be active in production.');}
console.log(`\nAI governance check: ${failed?'FAILED':'PASSED'} (${failed} failure(s)).`);
if(failed)process.exitCode=2;
