import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');const exists=p=>fs.existsSync(p);const checks=[];const add=(name,passed,detail='')=>checks.push({name,passed:Boolean(passed),detail});
const catalog=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-26.json'));
const inv=JSON.parse(read('src/generated/opsiqo-v7-26-translation-inventory.json'));
const nav=read('src/components/nav.tsx');const legacy=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');const ready=read('src/lib/opsiqo-one/translation-readiness.ts');
const a11y=read('scripts/opsiqo85-v7-26-authenticated-accessibility-smoke.mjs');const pre=read('scripts/opsiqo85-v7-26-certification-preflight.mjs');const runner=read('RUN_OPSIQO_ONE_V7_26_VALIDATION.ps1');
const inventory=read('scripts/opsiqo85-translation-inventory-v7-26.mjs');const safe=read('src/lib/opsiqo-one/safe-execution.ts');const router=read('src/lib/opsiqo-one/command-router.ts');const cortex=read('src/lib/opsiqo-one/cortex.ts');const pkg=JSON.parse(read('package.json'));
add('Product badge advances to V7.26',/v7\.(?:26|27|28|29|30|31|32) · HCM v8\.5/.test(nav));
add('Legacy i18n uses V7.26 catalog',/legacy-surface-translations-v7-(?:26|27|28|29|30|31|32)\.json/.test(legacy));
add('Translation readiness uses V7.26 snapshot',/opsiqo-v7-(?:26|27|28|29|30|31|32)-translation-inventory\.json/.test(ready));
const surfaces=[
 ['separation','src/components/separation-workspace.tsx','إنشاء طلب إنهاء خدمة','/separations'],
 ['employee_relations','src/components/employee-relations-workspace.tsx','استقبال سري','/employee-relations'],
 ['employee_portal','src/components/employee-portal-workspace.tsx','الخدمة الذاتية للموظف','/employee'],
 ['employee_profile','src/components/employee-profile.tsx','سجل الموظف','/people/worker-001'],
];
for(const [id,file,marker,route] of surfaces){const text=read(file);add(`${id} catalog exists`,Boolean(catalog[id]));add(`${id} catalog file matches`,catalog[id]?.file===file);add(`${id} uses governed translation hook`,text.includes(`useLegacySurfaceTranslation('${id}'`));add(`${id} root uses translation ref`,text.includes('ref={translationRoot}'));add(`${id} catalog has reviewed Arabic marker`,Object.values(catalog[id]?.translations||{}).some(x=>x?.ar===marker));add(`Authenticated accessibility includes ${route}`,a11y.includes(`'${route}'`));add(`Authenticated accessibility checks ${id} Arabic marker`,a11y.includes(marker));}
add('Translation catalog covers at least 35 governed surfaces',Object.keys(catalog).length>=35,`${Object.keys(catalog).length}`);
add('Translation catalog contains at least 2270 explicit entries',inv.catalogEntries>=2270,`${inv.catalogEntries}`);
add('Reviewed exact source candidates reach at least 2230',inv.reviewedSourceCandidates>=2230,`${inv.reviewedSourceCandidates}`);
add('Remaining translation backlog is at most 1400',inv.legacyCandidateCountRemaining<=1400,`${inv.legacyCandidateCountRemaining}`);
add('Translation catalog is structurally complete',inv.catalogCompleteness==='complete');
add('Inventory excludes obvious code fragments',inventory.includes('codeLike')&&inventory.includes('useState\\(')&&inventory.includes('&&'));
add('Translation inventory truth boundary mentions code-fragment filtering',/code fragments/i.test(inv.boundary));
add('V7.26 snapshot exists',exists('src/generated/opsiqo-v7-26-translation-inventory.json'));
add('V7.26 inventory evidence exists',exists('docs/OPSIQO_V7.26_TRANSLATION_INVENTORY.json'));
for(const token of ['runner-env-snapshot','runner-env-restore-auth','runner-env-restore-public','runner-no-production-deploy','runner-demo-project','runner-isolated-config','runner-ledger','runner-script-contract','lockfile-root-contract'])add(`V7.26 preflight checks ${token}`,pre.includes(token));
add('Preflight validates ports 31728 and 31729',pre.includes('31728')&&pre.includes('31729'));
add('Preflight keeps Node 22 <24 engine check',pre.includes('nodeMajor>=22&&nodeMajor<24'));
add('Runner snapshots environment values',runner.includes('Capture-V726Environment'));
add('Runner restores public browser environment',runner.includes('Restore-V726Environment $PublicEnvSnapshot'));
add('Runner restores authenticated emulator environment',runner.includes('Restore-V726Environment $AuthEnvSnapshot'));
add('Runner never writes captured env values to ledger',runner.includes('secret values are not copied into this ledger')&&!/GateResults.*EnvironmentSnapshot/s.test(runner));
add('Runner uses isolated firebase.test.json',runner.includes('--config firebase.test.json'));
add('Runner pins emulator project to demo-opsiqo-local',runner.includes('--project demo-opsiqo-local'));
add('Runner uses locked Firebase CLI',runner.includes('npx --no-install firebase emulators:start'));
add('Runner uses V7.26 public port',runner.includes('31728'));
add('Runner uses V7.26 authenticated port',runner.includes('31729'));
add('Runner includes V7.26 audit',runner.includes('opsiqo85:opsiqo-one-v7.26:audit'));
add('Runner includes V7.26 translation verification',runner.includes('opsiqo85:v7.26:translation-inventory:verify'));
add('Runner includes V7.26 authenticated accessibility UAT',runner.includes('opsiqo85:v7.26:browser-a11y-auth'));
add('Runner preserves V7.25 regression',runner.includes('opsiqo85:opsiqo-one-v7.25:audit'));
add('Runner preserves V7.25 targeted tests',runner.includes('test:opsiqo-one-v7.25'));
add('Runner performs fresh production rebuild after emulator UAT',runner.includes('Final production rebuild after emulator UAT'));
add('Runner contains no deployment command',!/(firebase\s+deploy|apphosting:rollouts:create|gcloud\s+(?:run\s+)?deploy)/i.test(runner));
add('Safe Execute allowlist remains exactly one notification action',(safe.match(/id:'notifications\.mark_visible_read'/g)||[]).length===1&&!safe.includes("id:'preference.locale.update'")&&!safe.includes("id:'preference.appearance.update'"));
add('Consequential firewall remains before normal routing',router.indexOf('for(const item of blockedConsequential)')<router.indexOf('for(const item of patterns)'));
add('No Cortex agent has unrestricted execute',!cortex.includes("maxActionLevel:'execute'"));
add('Root START_HERE points to V7.26',/START_HERE_OPSIQO_ONE_V7_(?:26|27|28|29|30|31|32)\.md/.test(read('START_HERE.md')));
add('NEXT_PHASE advances to V7.27',(/Next Phase — V7\.(?:27|28|29|30|31|32)/.test(read('NEXT_PHASE.md'))||(read('NEXT_PHASE.md').includes('Production Sign-off')||read('NEXT_PHASE.md').includes('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1')))||(read('NEXT_PHASE.md').includes('External Certification')||read('NEXT_PHASE.md').includes('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1')));
add('V7.26 architecture notes exist',exists('OPSIQO_ONE_V7_26.md'));
add('V7.26 change manifest exists',exists('CHANGE_MANIFEST_OPSIQO_ONE_V7_26.md'));
add('V7.26 validation report exists',exists('VALIDATION_REPORT_OPSIQO_ONE_V7_26.md'));
add('V7.26 release metadata reports 98 percent',JSON.parse(read('RELEASE_METADATA_V7_26.json')).overallProgressPercent===98);
add('V7.26 test exists',exists('tests/opsiqo85/opsiqo-one-v7-26.test.ts'));
add('V7.26 package exposes audit',pkg.scripts?.['opsiqo85:opsiqo-one-v7.26:audit']==='node scripts/opsiqo85-opsiqo-one-v7-26-audit.mjs');
add('V7.26 package exposes preflight',Boolean(pkg.scripts?.['opsiqo85:v7.26:certification-preflight']));
add('V7.26 package exposes post-install preflight',Boolean(pkg.scripts?.['opsiqo85:v7.26:certification-preflight:postinstall']));
add('V7.26 package exposes translation verify',String(pkg.scripts?.['opsiqo85:v7.26:translation-inventory:verify']||'').includes('--verify'));
add('V7.26 package exposes auth browser UAT',String(pkg.scripts?.['opsiqo85:v7.26:browser-a11y-auth']||'').includes('v7-26-authenticated-accessibility-smoke'));
add('V7.26 CMD launcher exists',exists('RUN_OPSIQO_ONE_V7_26_VALIDATION.cmd'));
add('V7.26 CMD launcher invokes V7.26 PowerShell runner',read('RUN_OPSIQO_ONE_V7_26_VALIDATION.cmd').includes('RUN_OPSIQO_ONE_V7_26_VALIDATION.ps1'));
const passed=checks.filter(x=>x.passed).length,failed=checks.filter(x=>!x.passed);for(const c of checks)console.log(`${c.passed?'PASS':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);console.log(`\nOPSIQO ONE V7.26 audit: ${passed}/${checks.length} PASS`);if(failed.length){console.log('\nFailures:');for(const f of failed)console.log(`- ${f.name}${f.detail?`: ${f.detail}`:''}`);process.exit(1)}
