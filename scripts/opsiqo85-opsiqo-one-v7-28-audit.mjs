import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');const exists=p=>fs.existsSync(p);const checks=[];const add=(name,passed,detail='')=>checks.push({name,passed:Boolean(passed),detail});
const catalog=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-28.json'));
const inv=JSON.parse(read('src/generated/opsiqo-v7-28-translation-inventory.json'));
const nav=read('src/components/nav.tsx');const legacy=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');const ready=read('src/lib/opsiqo-one/translation-readiness.ts');
const a11y=read('scripts/opsiqo85-v7-28-authenticated-accessibility-smoke.mjs');const pre=read('scripts/opsiqo85-v7-28-certification-preflight.mjs');const summary=read('scripts/opsiqo85-v7-28-certification-summary.mjs');const deploy=read('scripts/opsiqo85-v7-28-deployment-readiness-summary.mjs');const runner=read('RUN_OPSIQO_ONE_V7_28_VALIDATION.ps1');const inventory=read('scripts/opsiqo85-translation-inventory-v7-28.mjs');const pkg=JSON.parse(read('package.json'));const safe=read('src/lib/opsiqo-one/safe-execution.ts');const router=read('src/lib/opsiqo-one/command-router.ts');const cortex=read('src/lib/opsiqo-one/cortex.ts');
add('Product badge is V7.28 or later',nav.includes('v7.28 · HCM v8.5')||nav.includes('v7.29 · HCM v8.5')||nav.includes('v7.30 · HCM v8.5')||nav.includes('v7.31 · HCM v8.5')||nav.includes('v7.32 · HCM v8.5'));
add('Legacy i18n uses V7.28 or later catalog',legacy.includes('legacy-surface-translations-v7-28.json')||legacy.includes('legacy-surface-translations-v7-29.json')||legacy.includes('legacy-surface-translations-v7-30.json')||legacy.includes('legacy-surface-translations-v7-31.json')||legacy.includes('legacy-surface-translations-v7-32.json'));
add('Translation readiness uses V7.28 or later snapshot',ready.includes('opsiqo-v7-28-translation-inventory.json')||ready.includes('opsiqo-v7-29-translation-inventory.json')||ready.includes('opsiqo-v7-30-translation-inventory.json')||ready.includes('opsiqo-v7-31-translation-inventory.json')||ready.includes('opsiqo-v7-32-translation-inventory.json'));
const surfaces=[
 ['import_center','src/components/import-center-workspace.tsx','مركز الاستيراد الشامل للبيانات والمستندات','/import-center'],
 ['intelligence_hub','src/components/intelligence-hub-workspace.tsx','OPSIQO ONE · الذكاء','/intelligence'],
 ['ai_governance','src/components/ai-governance-center.tsx','OPSIQO Guard · مركز حوكمة الذكاء الاصطناعي','/ai-governance'],
 ['agent_builder','src/components/agent-builder-workspace.tsx','OPSIQO Cortex · منشئ الوكلاء','/agent-builder'],
];
for(const [id,file,marker,route] of surfaces){const text=read(file);add(`${id} catalog exists`,Boolean(catalog[id]));add(`${id} catalog file matches`,catalog[id]?.file===file);add(`${id} uses governed translation hook`,text.includes(`useLegacySurfaceTranslation('${id}'`));add(`${id} translation root declared`,text.includes('translationRoot'));add(`${id} has reviewed Arabic marker`,Object.values(catalog[id]?.translations||{}).some(x=>x?.ar===marker));add(`Authenticated accessibility includes ${route}`,a11y.includes(`'${route}'`));add(`Authenticated accessibility checks ${id} Arabic marker`,a11y.includes(marker));}
add('Translation catalog covers at least 44 governed surfaces',Object.keys(catalog).length>=44,`${Object.keys(catalog).length}`);
add('Translation catalog contains at least 2660 explicit entries',inv.catalogEntries>=2660,`${inv.catalogEntries}`);
add('Reviewed exact source candidates reach at least 2640',inv.reviewedSourceCandidates>=2640,`${inv.reviewedSourceCandidates}`);
add('Remaining translation backlog is at most 920',inv.legacyCandidateCountRemaining<=920,`${inv.legacyCandidateCountRemaining}`);
add('Translation catalog is structurally complete',inv.catalogCompleteness==='complete');
add('Inventory excludes identifier-like code fragments',inventory.includes('identifierLike')&&inventory.includes('codeLike'));
add('Translation truth boundary remains explicit',/not a linguistic-quality or browser-completeness claim/i.test(inv.boundary));
add('V7.28 snapshot exists',exists('src/generated/opsiqo-v7-28-translation-inventory.json'));
add('V7.28 inventory evidence exists',exists('docs/OPSIQO_V7.28_TRANSLATION_INVENTORY.json'));
add('Runner certification ledger version is V7.28',runner.includes("version = '7.28'"));
add('Runner local certification banner is V7.28',runner.includes("OPSIQO ONE v7.28 local certification"));
add('Runner no longer carries stale v7.26 local banner',!runner.includes('OPSIQO ONE v7.26 local certification'));
add('Runner uses V7.28 public browser port',runner.includes('31732'));
add('Runner uses V7.28 authenticated browser port',runner.includes('31733'));
add('Preflight validates V7.28 browser ports',pre.includes('31732')&&pre.includes('31733'));
add('Preflight uses V7.28 runner path',pre.includes('RUN_OPSIQO_ONE_V7_28_VALIDATION.ps1'));
add('Preflight keeps safe npm registry host diagnostic',pre.includes('npm registry host=${u.host}')&&!pre.includes('u.password')&&!pre.includes('u.username'));
add('Runner has V7.28 audit gate',runner.includes('opsiqo85:opsiqo-one-v7.28:audit'));
add('Runner has V7.28 translation verify gate',runner.includes('opsiqo85:v7.28:translation-inventory:verify'));
add('Runner has V7.28 targeted test gate',runner.includes('test:opsiqo-one-v7.28'));
add('Runner preserves V7.27 regression',runner.includes('opsiqo85:opsiqo-one-v7.27:audit'));
add('Runner preserves V7.27 targeted tests',runner.includes('test:opsiqo-one-v7.27'));
add('Runner invokes V7.28 authenticated browser UAT',runner.includes('opsiqo85:v7.28:browser-a11y-auth'));
add('Runner uses isolated firebase.test.json',runner.includes('--config firebase.test.json'));
add('Runner pins emulator project to demo-opsiqo-local',runner.includes('--project demo-opsiqo-local'));
add('Runner contains no production deployment command',!/(firebase\s+deploy|apphosting:rollouts:create|gcloud\s+(?:run\s+)?deploy)/i.test(runner));
add('Certification summary is dependency-free',summary.includes("from 'node:fs'")&&!summary.includes('node_modules'));
add('Deployment readiness summary is dependency-free',deploy.includes("from 'node:fs'")&&!deploy.includes('node_modules'));
for(const token of ['sourceCertified','dependencyCertified','browserUatCertified','manualAccessibilityCertified','connectorUatCertified','productionCandidate','readyForHumanSignoff','productionDeployed'])add(`Deployment readiness separates ${token}`,deploy.includes(token));
add('Deployment readiness never deploys production',!/(firebase\s+deploy|apphosting:rollouts:create|gcloud\s+(?:run\s+)?deploy)/i.test(deploy));
add('Deployment readiness requires explicit manual accessibility signoff',deploy.includes('v7-28-manual-accessibility-signoff.json'));
add('Deployment readiness requires explicit connector UAT signoff',deploy.includes('v7-28-connector-uat-signoff.json'));
add('Deployment readiness requires explicit production deployment signoff',deploy.includes('v7-28-production-deployment-signoff.json'));
add('Runner emits deployment readiness report',runner.includes('opsiqo85:v7.28:deployment-readiness'));
add('Safe Execute allowlist remains exactly one notification action',(safe.match(/id:'notifications\.mark_visible_read'/g)||[]).length===1&&!safe.includes("id:'preference.locale.update'")&&!safe.includes("id:'preference.appearance.update'"));
add('Consequential firewall remains before normal routing',router.indexOf('for(const item of blockedConsequential)')<router.indexOf('for(const item of patterns)'));
add('No Cortex agent has unrestricted execute',!cortex.includes("maxActionLevel:'execute'"));
add('V7.28 package exposes audit',pkg.scripts?.['opsiqo85:opsiqo-one-v7.28:audit']==='node scripts/opsiqo85-opsiqo-one-v7-28-audit.mjs');
add('V7.28 package exposes translation verify',String(pkg.scripts?.['opsiqo85:v7.28:translation-inventory:verify']||'').includes('--verify'));
add('V7.28 package exposes auth browser UAT',String(pkg.scripts?.['opsiqo85:v7.28:browser-a11y-auth']||'').includes('v7-28-authenticated-accessibility-smoke'));
add('V7.28 package exposes deployment readiness',String(pkg.scripts?.['opsiqo85:v7.28:deployment-readiness']||'').includes('v7-28-deployment-readiness-summary'));
add('V7.28 CMD launcher exists',exists('RUN_OPSIQO_ONE_V7_28_VALIDATION.cmd'));
add('V7.28 CMD launcher invokes V7.28 PowerShell runner',read('RUN_OPSIQO_ONE_V7_28_VALIDATION.cmd').includes('RUN_OPSIQO_ONE_V7_28_VALIDATION.ps1'));

add('Root START_HERE points to V7.28 or later',read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_28.md')||read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_29.md')||read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_30.md')||read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_31.md')||read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_32.md'));
add('NEXT_PHASE is V7.29-or-later closure',read('NEXT_PHASE.md').includes('Next Phase — V7.29')||(read('NEXT_PHASE.md').includes('Production Sign-off')||read('NEXT_PHASE.md').includes('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1'))||(read('NEXT_PHASE.md').includes('External Certification')||read('NEXT_PHASE.md').includes('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1')));
add('V7.28 architecture notes exist',exists('OPSIQO_ONE_V7_28.md'));
add('V7.28 change manifest exists',exists('CHANGE_MANIFEST_OPSIQO_ONE_V7_28.md'));
add('V7.28 validation report exists',exists('VALIDATION_REPORT_OPSIQO_ONE_V7_28.md'));
add('V7.28 release metadata reports 99.5 percent',JSON.parse(read('RELEASE_METADATA_V7_28.json')).overallProgressPercent===99.5);
add('V7.28 test exists',exists('tests/opsiqo85/opsiqo-one-v7-28.test.ts'));
const passed=checks.filter(x=>x.passed).length,failed=checks.filter(x=>!x.passed);for(const c of checks)console.log(`${c.passed?'PASS':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);console.log(`\nOPSIQO ONE V7.28 audit: ${passed}/${checks.length} PASS`);if(failed.length){console.log('\nFailures:');for(const f of failed)console.log(`- ${f.name}${f.detail?`: ${f.detail}`:''}`);process.exit(1)}
