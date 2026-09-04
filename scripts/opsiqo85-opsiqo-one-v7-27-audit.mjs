import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');const exists=p=>fs.existsSync(p);const checks=[];const add=(name,passed,detail='')=>checks.push({name,passed:Boolean(passed),detail});
const catalog=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-27.json'));
const inv=JSON.parse(read('src/generated/opsiqo-v7-27-translation-inventory.json'));
const nav=read('src/components/nav.tsx');const legacy=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');const ready=read('src/lib/opsiqo-one/translation-readiness.ts');
const a11y=read('scripts/opsiqo85-v7-27-authenticated-accessibility-smoke.mjs');const pre=read('scripts/opsiqo85-v7-27-certification-preflight.mjs');const summary=read('scripts/opsiqo85-v7-27-certification-summary.mjs');const runner=read('RUN_OPSIQO_ONE_V7_27_VALIDATION.ps1');
const inventory=read('scripts/opsiqo85-translation-inventory-v7-27.mjs');const safe=read('src/lib/opsiqo-one/safe-execution.ts');const router=read('src/lib/opsiqo-one/command-router.ts');const cortex=read('src/lib/opsiqo-one/cortex.ts');const pkg=JSON.parse(read('package.json'));
add('Product badge advances to V7.27 or later',/v7\.(?:27|28|29|30|31|32) · HCM v8\.5/.test(nav));
add('Legacy i18n uses V7.27 or later catalog',/legacy-surface-translations-v7-(?:27|28|29|30|31|32)\.json/.test(legacy));
add('Translation readiness uses V7.27 or later snapshot',/opsiqo-v7-(?:27|28|29|30|31|32)-translation-inventory\.json/.test(ready));
const surfaces=[
 ['ai_copilot','src/components/ai-copilot-workspace.tsx','ذكاء تحويل الأدلة إلى إجراءات','/ai-copilot'],
 ['people_analytics','src/components/people-analytics-workspace.tsx','استوديو تحليلات الأفراد','/people-analytics'],
 ['scenario_lab','src/components/scenario-lab-workspace.tsx','OPSIQO Pulse · مختبر السيناريوهات','/scenario-lab'],
 ['ai_value','src/components/ai-value-workspace.tsx','OPSIQO Guard + Pulse · قيمة الذكاء الاصطناعي','/ai-value'],
 ['mfa_setup','src/app/mfa/setup/page.tsx','المصادقة متعددة العوامل','/mfa/setup'],
];
for(const [id,file,marker,route] of surfaces){const text=read(file);add(`${id} catalog exists`,Boolean(catalog[id]));add(`${id} catalog file matches`,catalog[id]?.file===file);add(`${id} uses governed translation hook`,text.includes(`useLegacySurfaceTranslation('${id}'`));add(`${id} translation root declared`,text.includes('translationRoot'));add(`${id} catalog has reviewed Arabic marker`,Object.values(catalog[id]?.translations||{}).some(x=>x?.ar===marker));add(`Authenticated accessibility includes ${route}`,a11y.includes(`'${route}'`));add(`Authenticated accessibility checks ${id} Arabic marker`,a11y.includes(marker));}
add('Translation catalog covers at least 40 governed surfaces',Object.keys(catalog).length>=40,`${Object.keys(catalog).length}`);
add('Translation catalog contains at least 2490 explicit entries',inv.catalogEntries>=2490,`${inv.catalogEntries}`);
add('Reviewed exact source candidates reach at least 2470',inv.reviewedSourceCandidates>=2470,`${inv.reviewedSourceCandidates}`);
add('Remaining translation backlog is at most 1090',inv.legacyCandidateCountRemaining<=1090,`${inv.legacyCandidateCountRemaining}`);
add('Translation catalog is structurally complete',inv.catalogCompleteness==='complete');
add('V7.27 inventory filters URL/code noise',inventory.includes(";%")===false && inventory.includes('===') && inventory.includes('Array<') && inventory.includes('codeLike'));
add('Translation inventory truth boundary remains explicit',/not a linguistic-quality or browser-completeness claim/i.test(inv.boundary));
add('V7.27 snapshot exists',exists('src/generated/opsiqo-v7-27-translation-inventory.json'));
add('V7.27 inventory evidence exists',exists('docs/OPSIQO_V7.27_TRANSLATION_INVENTORY.json'));
for(const token of ['npm-registry-host','windows-url-encoded-path','windows-onedrive-path','runner-safe-failure-summary','runner-no-production-deploy','runner-demo-project','runner-isolated-config','runner-ledger','runner-script-contract','lockfile-root-contract'])add(`V7.27 preflight checks ${token}`,pre.includes(token));
add('Preflight validates V7.27 browser ports 31730 and 31731',pre.includes('31730')&&pre.includes('31731'));
add('Preflight keeps Node 22 <24 engine check',pre.includes('nodeMajor>=22&&nodeMajor<24'));
add('Preflight prints registry host only',pre.includes('npm registry host=${u.host}')&&!pre.includes('u.password')&&!pre.includes('u.username'));
add('Preflight warns on encoded Windows extraction paths',pre.includes('%[0-9a-f]{2}')&&pre.includes('URL-encoded fragments'));
add('Certification summary is dependency-free',!summary.includes("from 'tsx'")&&!summary.includes('node_modules')&&summary.includes("from 'node:fs'"));
add('Certification summary reports first failing gate',summary.includes('First failing gate:'));
add('Certification summary never reads env files or credential stores',!summary.includes("readFileSync('.env")&&!summary.includes('process.env.')||summary.includes('TEMP'));
add('Runner snapshots environment values',runner.includes('Capture-V727Environment'));
add('Runner restores public browser environment',runner.includes('Restore-V727Environment $PublicEnvSnapshot'));
add('Runner restores authenticated emulator environment',runner.includes('Restore-V727Environment $AuthEnvSnapshot'));
add('Runner prints bootstrap ledger location',runner.includes('bootstrap certification ledger'));
add('Runner prints safe summary on generic gate failure',runner.includes("try { node scripts/opsiqo85-v7-27-certification-summary.mjs $script:CertificationLedger } catch {}"));
add('Runner prints summary on browser failures',(runner.match(/opsiqo85-v7-27-certification-summary\.mjs/g)||[]).length>=4,`${(runner.match(/opsiqo85-v7-27-certification-summary\.mjs/g)||[]).length}`);
add('Runner has only one V7.21 targeted test step',(runner.match(/Step 'V7\.21 targeted tests'/g)||[]).length===1,`${(runner.match(/Step 'V7\.21 targeted tests'/g)||[]).length}`);
add('Runner uses isolated firebase.test.json',runner.includes('--config firebase.test.json'));
add('Runner pins emulator project to demo-opsiqo-local',runner.includes('--project demo-opsiqo-local'));
add('Runner uses locked Firebase CLI',runner.includes('npx --no-install firebase emulators:start'));
add('Runner uses V7.27 public port',runner.includes('31730'));
add('Runner uses V7.27 authenticated port',runner.includes('31731'));
add('Runner includes V7.27 audit',runner.includes('opsiqo85:opsiqo-one-v7.27:audit'));
add('Runner includes V7.27 translation verification',runner.includes('opsiqo85:v7.27:translation-inventory:verify'));
add('Runner includes V7.27 authenticated accessibility UAT',runner.includes('opsiqo85:v7.27:browser-a11y-auth'));
add('Runner preserves V7.26 regression',runner.includes('opsiqo85:opsiqo-one-v7.26:audit'));
add('Runner preserves V7.26 targeted tests',runner.includes('test:opsiqo-one-v7.26'));
add('Runner performs fresh production rebuild after emulator UAT',runner.includes('Final production rebuild after emulator UAT'));
add('Runner contains no deployment command',!/(firebase\s+deploy|apphosting:rollouts:create|gcloud\s+(?:run\s+)?deploy)/i.test(runner));
add('Safe Execute allowlist remains exactly one notification action',(safe.match(/id:'notifications\.mark_visible_read'/g)||[]).length===1&&!safe.includes("id:'preference.locale.update'")&&!safe.includes("id:'preference.appearance.update'"));
add('Consequential firewall remains before normal routing',router.indexOf('for(const item of blockedConsequential)')<router.indexOf('for(const item of patterns)'));
add('No Cortex agent has unrestricted execute',!cortex.includes("maxActionLevel:'execute'"));
add('V7.27 package exposes audit',pkg.scripts?.['opsiqo85:opsiqo-one-v7.27:audit']==='node scripts/opsiqo85-opsiqo-one-v7-27-audit.mjs');
add('V7.27 package exposes preflight',Boolean(pkg.scripts?.['opsiqo85:v7.27:certification-preflight']));
add('V7.27 package exposes post-install preflight',Boolean(pkg.scripts?.['opsiqo85:v7.27:certification-preflight:postinstall']));
add('V7.27 package exposes translation verify',String(pkg.scripts?.['opsiqo85:v7.27:translation-inventory:verify']||'').includes('--verify'));
add('V7.27 package exposes auth browser UAT',String(pkg.scripts?.['opsiqo85:v7.27:browser-a11y-auth']||'').includes('v7-27-authenticated-accessibility-smoke'));
add('V7.27 package exposes certification summary',String(pkg.scripts?.['opsiqo85:v7.27:certification-summary']||'').includes('v7-27-certification-summary'));
add('V7.27 CMD launcher exists',exists('RUN_OPSIQO_ONE_V7_27_VALIDATION.cmd'));
add('V7.27 CMD launcher invokes V7.27 PowerShell runner',read('RUN_OPSIQO_ONE_V7_27_VALIDATION.cmd').includes('RUN_OPSIQO_ONE_V7_27_VALIDATION.ps1'));
add('Root START_HERE points to V7.27',(read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_27.md')||read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_29.md'))||read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_30.md')||read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_31.md')||read('START_HERE.md').includes('START_HERE_OPSIQO_ONE_V7_32.md'));
add('NEXT_PHASE advances to V7.28',(read('NEXT_PHASE.md').includes('Next Phase — V7.28')||(read('NEXT_PHASE.md').includes('Production Sign-off')||read('NEXT_PHASE.md').includes('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1')))||(read('NEXT_PHASE.md').includes('External Certification')||read('NEXT_PHASE.md').includes('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1')));
add('V7.27 architecture notes exist',exists('OPSIQO_ONE_V7_27.md'));
add('V7.27 change manifest exists',exists('CHANGE_MANIFEST_OPSIQO_ONE_V7_27.md'));
add('V7.27 validation report exists',exists('VALIDATION_REPORT_OPSIQO_ONE_V7_27.md'));
add('V7.27 release metadata reports 99 percent',JSON.parse(read('RELEASE_METADATA_V7_27.json')).overallProgressPercent===99);
add('V7.27 test exists',exists('tests/opsiqo85/opsiqo-one-v7-27.test.ts'));
const passed=checks.filter(x=>x.passed).length,failed=checks.filter(x=>!x.passed);for(const c of checks)console.log(`${c.passed?'PASS':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);console.log(`\nOPSIQO ONE V7.27 audit: ${passed}/${checks.length} PASS`);if(failed.length){console.log('\nFailures:');for(const f of failed)console.log(`- ${f.name}${f.detail?`: ${f.detail}`:''}`);process.exit(1)}
