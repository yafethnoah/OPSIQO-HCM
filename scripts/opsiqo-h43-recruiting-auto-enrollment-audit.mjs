import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const workspace=read('src/components/recruiting-workspace.tsx');
const intake=read('src/components/resume-intake-assistant.tsx');
const service=read('src/lib/recruiting/service.ts');
const schemas=read('src/lib/recruiting/schemas.ts');
const engine=read('src/lib/recruiting/ats-engine.ts');
const locale=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');
const dispositionRoute=read('src/app/api/organizations/[orgId]/recruiting/applications/[applicationId]/disposition/route.ts');

check('server requires open requisition',service.includes("req.status !== 'open'")&&service.includes('requisition_not_open'));
check('application creation is idempotent',service.includes('deduplicated: true')&&service.includes('candidateApplicationIndex'));
check('resume intake arms automatic enrollment only after parse',intake.includes('resumeIntakeReady')&&intake.includes('tryAutoEnroll'));
check('automatic enrollment still requires consent',intake.includes('consent.checked')&&intake.includes('form.checkValidity()'));
check('single-open-requisition auto selection is bounded',intake.includes('options.length === 1'));
check('generic stage schema excludes rejected and withdrawn',!schemas.match(/applicationStageSchema[^;]+rejected/s)&&!schemas.match(/applicationStageSchema[^;]+withdrawn/s));
check('dedicated disposition schema requires literal confirmation',schemas.includes('applicationDispositionSchema')&&schemas.includes('z.literal(true)'));
check('dedicated disposition service exists',service.includes('export async function disposeApplication'));
check('rejection requires recruiting disposition permission',service.includes("actor.permissions.includes('recruiting.offer')"));
check('disposition route is governed',dispositionRoute.includes("requirePermission(actor,'recruiting.manage')")&&dispositionRoute.includes('disposeApplication'));
const transitionBlock=workspace.slice(workspace.indexOf('const manualTransitions'),workspace.indexOf('export function RecruitingWorkspace'));
check('generic move UI excludes rejected/withdrawn',!transitionBlock.match(/:\s*\[[^\]]*["'](?:rejected|withdrawn)["']/));
check('rejection UI requires explicit review',workspace.includes('Review rejection…')&&workspace.includes('Confirm rejection'));
check('ATS cannot automatically reject',workspace.includes('ATS scores never trigger this action automatically'));
check('deterministic parser has safe resume filename fallback',engine.includes('candidateNameFromFileName')&&engine.includes('fileName?:string')&&engine.includes('plausiblePersonName(base)'));
check('translation source refresh supports React dynamic updates',locale.includes('refreshSource')&&locale.includes('stillRendered'));
check('recruiting counters have no-translate safeguard',workspace.includes('data-opsiqo-no-translate="true">{apps.filter((a) => a.stage === stage).length}'));

const failed=checks.filter(x=>!x.ok);
for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}`);
console.log(`\nH43 audit: ${checks.length-failed.length}/${checks.length} PASS`);
if(failed.length)process.exit(1);
