import fs from 'node:fs';
const smoke=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-smoke.mjs','utf8');
const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
const bounded=fs.readFileSync('scripts/opsiqo85-v7-32-bounded-process.mjs','utf8');
const browserSource=smoke+'\n'+worker+'\n'+bounded;
const runner=fs.readFileSync('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 ['CDP commands have bounded timeouts',/Timed out waiting for CDP \$\{method\}/.test(browserSource)],
 ['CDP timeout removes pending command',/this\.pending\.delete\(id\);reject\(new Error\(`Timed out waiting for CDP/.test(browserSource)],
 ['Browser navigation status remains independently probed',/probeRoute/.test(smoke)&&/AbortSignal\.timeout/.test(smoke)],
 ['Document response status is captured by bounded HTTP probe',/HTTP status=/.test(browserSource)&&/OPSIQO_A11Y_HTTP_STATUS/.test(browserSource)],
 ['Self-fetch status probe removed',!browserSource.includes('fetch(location.href')],
 ['Route runtime errors are bounded and recorded',/route-runtime/.test(browserSource)&&/Isolated route worker/.test(smoke)],
 ['Timed-out route worker process tree is terminated before continuation',/killProcessTree/.test(browserSource)&&/TIMEOUT ROUTE/.test(smoke)],
 ['Browser report still writes bounded evidence',/v7-32-authenticated-accessibility\.json/.test(smoke)&&/writeCheckpoint/.test(smoke)],
 ['Package exposes Hotfix 13 audit',pkg.scripts?.['opsiqo85:v7.32:hotfix13:audit']==='node scripts/opsiqo85-v7-32-hotfix13-audit.mjs'],
 ['Package exposes Hotfix 13 targeted tests',pkg.scripts?.['test:opsiqo-one-v7.32-hotfix13']==='vitest run tests/opsiqo85/opsiqo-one-v7-32-hotfix13.test.ts'],
 ['Canonical runner executes Hotfix 13 audit',runner.includes('opsiqo85:v7.32:hotfix13:audit')],
 ['Canonical runner executes Hotfix 13 targeted tests',runner.includes('test:opsiqo-one-v7.32-hotfix13')],
];
let failed=0;for(const[name,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nOPSIQO V7.32 Hotfix 13 audit: ${checks.length-failed}/${checks.length} PASS`);if(failed)process.exit(1);
