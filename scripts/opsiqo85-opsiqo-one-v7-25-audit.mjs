import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');const exists=p=>fs.existsSync(p);const checks=[];const add=(name,passed,detail='')=>checks.push({name,passed:Boolean(passed),detail});
const catalog=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-25.json'));
const inv=JSON.parse(read('src/generated/opsiqo-v7-25-translation-inventory.json'));
const nav=read('src/components/nav.tsx');const legacy=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');const ready=read('src/lib/opsiqo-one/translation-readiness.ts');
const a11y=read('scripts/opsiqo85-v7-25-authenticated-accessibility-smoke.mjs');const pre=read('scripts/opsiqo85-v7-25-certification-preflight.mjs');const runner=read('RUN_OPSIQO_ONE_V7_25_VALIDATION.ps1');
const safe=read('src/lib/opsiqo-one/safe-execution.ts');const router=read('src/lib/opsiqo-one/command-router.ts');const cortex=read('src/lib/opsiqo-one/cortex.ts');const pkg=JSON.parse(read('package.json'));const firebaseTest=JSON.parse(read('firebase.test.json'));
add('Product badge is V7.25 or later',/v7\.(?:25|26|27|28|29|30|31|32) · HCM v8\.5/.test(nav));
add('Legacy i18n uses V7.25 or later catalog',/legacy-surface-translations-v7-(?:25|26|27|28|29|30|31|32)\.json/.test(legacy));
add('Translation readiness uses V7.25 or later snapshot',/opsiqo-v7-(?:25|26|27|28|29|30|31|32)-translation-inventory\.json/.test(ready));
const surfaces=[
 ['regulatory_change','src/components/regulatory-change-center.tsx','حدود القرار','/regulatory'],
 ['resilience','src/components/resilience-center.tsx','حدود المرونة المحكومة','/resilience'],
 ['identity','src/components/identity-command-center.tsx','مركز هوية المؤسسة وتسجيل الدخول الموحد والتزويد','/identity'],
 ['governance','src/components/governance-control-center.tsx','حدود تشغيل الحوكمة','/governance'],
 ['enterprise_command','src/components/enterprise-command-center.tsx','حدود حوكمة المؤسسة','/dashboard'],
];
for(const [id,file,marker,route] of surfaces){const text=read(file);add(`${id} catalog exists`,Boolean(catalog[id]));add(`${id} catalog file matches`,catalog[id]?.file===file);add(`${id} uses governed translation hook`,text.includes(`useLegacySurfaceTranslation('${id}'`));add(`${id} catalog has reviewed Arabic marker`,Object.values(catalog[id]?.translations||{}).some(x=>x?.ar===marker));add(`Authenticated accessibility includes ${route}`,a11y.includes(`'${route}'`));add(`Authenticated accessibility checks ${id} Arabic marker`,a11y.includes(marker));}
add('Translation catalog covers at least 31 governed surfaces',Object.keys(catalog).length>=31,`${Object.keys(catalog).length}`);
add('Translation catalog contains at least 2000 explicit entries',inv.catalogEntries>=2000,`${inv.catalogEntries}`);
add('Reviewed exact source candidates reach at least 1990',inv.reviewedSourceCandidates>=1990,`${inv.reviewedSourceCandidates}`);
add('Remaining translation backlog is at most 1820',inv.legacyCandidateCountRemaining<=1820,`${inv.legacyCandidateCountRemaining}`);
add('Translation catalog is structurally complete',inv.catalogCompleteness==='complete');
add('Translation inventory truth boundary remains explicit',/not a linguistic-quality or browser-completeness claim/i.test(inv.boundary));
add('Isolated firebase.test.json is packaged',exists('firebase.test.json'));
add('Isolated Firestore emulator uses port 8080',firebaseTest.emulators?.firestore?.port===8080);
add('Isolated Auth emulator uses port 9099',firebaseTest.emulators?.auth?.port===9099);
add('Isolated Storage emulator uses port 9199',firebaseTest.emulators?.storage?.port===9199);
add('Isolated emulator UI is disabled',firebaseTest.emulators?.ui?.enabled===false);
add('Isolated emulator config contains no production project id',!/opsiqo-hcm-prod-2026/i.test(read('firebase.test.json')));
for(const token of ['isolated-emulator-config','isolated-emulator-ports','isolated-emulator-no-production-project','runner-no-production-deploy','runner-demo-project','runner-isolated-config','runner-ledger','runner-script-contract','lockfile-root-contract'])add(`V7.25 preflight checks ${token}`,pre.includes(token));
add('Preflight keeps Node 22 <24 engine check',pre.includes('nodeMajor>=22&&nodeMajor<24'));
add('Preflight validates browser and Java',pre.includes("add('browser'")&&pre.includes("add('java-runtime'"));
add('Preflight validates locked Firebase/TypeScript/Vitest post-install',pre.includes('locked-firebase-cli')&&pre.includes('locked-typescript')&&pre.includes('locked-vitest'));
add('Preflight warns on long Windows extraction paths',pre.includes('windows-path-length'));
add('Runner executes V7.25 preflight before npm ci',runner.indexOf('Certification machine preflight')<runner.indexOf('Locked dependency installation'));
add('Runner uses isolated firebase.test.json',runner.includes('--config firebase.test.json'));
add('Runner pins emulator project to demo-opsiqo-local',runner.includes('--project demo-opsiqo-local'));
add('Runner uses locked Firebase CLI',runner.includes('npx --no-install firebase emulators:start'));
add('Runner writes sanitized certification ledger',runner.includes('v7-25-certification-ledger.json')&&runner.includes('secret values are not copied into this ledger'));
add('Runner records gate duration/status',runner.includes('durationMs')&&runner.includes("Status 'pass'")&&runner.includes("Status 'fail'"));
add('Runner includes V7.25 audit',runner.includes('opsiqo85:opsiqo-one-v7.25:audit'));
add('Runner includes V7.25 translation verification',runner.includes('opsiqo85:v7.25:translation-inventory:verify'));
add('Runner includes V7.25 authenticated accessibility UAT',runner.includes('opsiqo85:v7.25:browser-a11y-auth'));
add('Runner preserves V7.24 regression',runner.includes('opsiqo85:opsiqo-one-v7.24:audit'));
add('Runner preserves V7.24 targeted tests',runner.includes('test:opsiqo-one-v7.24'));
add('Runner performs fresh production rebuild after emulator UAT',runner.includes('Final production rebuild after emulator UAT'));
add('Runner contains no deployment command',!/(firebase\s+deploy|apphosting:rollouts:create|gcloud\s+(?:run\s+)?deploy)/i.test(runner));
add('Safe Execute allowlist remains exactly one notification action',(safe.match(/id:'notifications\.mark_visible_read'/g)||[]).length===1&&!safe.includes("id:'preference.locale.update'")&&!safe.includes("id:'preference.appearance.update'"));
add('Consequential firewall remains before normal routing',router.indexOf('for(const item of blockedConsequential)')<router.indexOf('for(const item of patterns)'));
add('No Cortex agent has unrestricted execute',!cortex.includes("maxActionLevel:'execute'"));
add('Root START_HERE points to V7.25 or later',/START_HERE_OPSIQO_ONE_V7_(?:25|26|27|28|29|30|31|32)\.md/.test(read('START_HERE.md')));
add('NEXT_PHASE advances beyond V7.25',(/Next Phase — V7\.(?:26|27|28|29|30|31|32)/.test(read('NEXT_PHASE.md'))||(read('NEXT_PHASE.md').includes('Production Sign-off')||read('NEXT_PHASE.md').includes('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1')))||(read('NEXT_PHASE.md').includes('External Certification')||read('NEXT_PHASE.md').includes('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1')));
add('V7.25 test exists',exists('tests/opsiqo85/opsiqo-one-v7-25.test.ts'));
add('V7.25 package exposes audit',pkg.scripts?.['opsiqo85:opsiqo-one-v7.25:audit']==='node scripts/opsiqo85-opsiqo-one-v7-25-audit.mjs');
add('V7.25 package exposes preflight',Boolean(pkg.scripts?.['opsiqo85:v7.25:certification-preflight']));
add('V7.25 package exposes post-install preflight',Boolean(pkg.scripts?.['opsiqo85:v7.25:certification-preflight:postinstall']));
add('V7.25 package exposes translation verify',String(pkg.scripts?.['opsiqo85:v7.25:translation-inventory:verify']||'').includes('--verify'));
add('V7.25 package exposes auth browser UAT',String(pkg.scripts?.['opsiqo85:v7.25:browser-a11y-auth']||'').includes('v7-25-authenticated-accessibility-smoke'));
const passed=checks.filter(x=>x.passed).length,failed=checks.filter(x=>!x.passed);for(const c of checks)console.log(`${c.passed?'PASS':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);console.log(`\nOPSIQO ONE V7.25 audit: ${passed}/${checks.length} PASS`);if(failed.length){console.log('\nFailures:');for(const f of failed)console.log(`- ${f.name}${f.detail?`: ${f.detail}`:''}`);process.exit(1)}
