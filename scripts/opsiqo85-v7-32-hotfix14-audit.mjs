import fs from 'node:fs';
const smoke=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-smoke.mjs','utf8');
const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
const bounded=fs.readFileSync('scripts/opsiqo85-v7-32-bounded-process.mjs','utf8');
const runner=fs.readFileSync('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 ['Authenticated matrix uses a separate route worker process',/runBoundedProcess/.test(smoke)&&/authenticated-accessibility-worker/.test(smoke)],
 ['Each route has an OS-level worker timeout',/OPSIQO_A11Y_WORKER_TIMEOUT_MS/.test(smoke)&&/routeWorkerTimeoutMs/.test(smoke)],
 ['Windows timeout kills the complete worker process tree',/taskkill/.test(bounded)&&/\/T/.test(bounded)&&/\/F/.test(bounded)],
 ['POSIX timeout kills the detached worker process group',/process\.kill\(-pid,'SIGKILL'\)/.test(bounded)],
 ['Worker launches a fresh isolated browser profile for each route',/opsiqo-a11y-route-/.test(worker)&&/--user-data-dir/.test(worker)],
 ['Worker browser tree is force-cleaned after each route',/killProcessTree\(browser\?\.pid\)/.test(worker)],
 ['Parent performs bounded HTTP probe before browser inspection',/AbortSignal\.timeout\(httpProbeTimeoutMs\)/.test(smoke)],
 ['Accessibility evidence is checkpointed after every route',/writeCheckpoint\(false\)/.test(smoke)&&/v7-32-authenticated-accessibility\.partial\.json/.test(smoke)],
 ['Timed out route is recorded and matrix continues',/TIMEOUT ROUTE/.test(smoke)&&/continuing/.test(smoke)],
 ['Long route workers emit heartbeat progress instead of appearing frozen',/WAIT ROUTE/.test(smoke)&&/setInterval/.test(smoke)],
 ['Final report records route completion count',/routesCompleted/.test(smoke)&&/routesTotal/.test(smoke)],
 ['Package exposes H14 audit',pkg.scripts?.['opsiqo85:v7.32:hotfix14:audit']==='node scripts/opsiqo85-v7-32-hotfix14-audit.mjs'],
 ['Package exposes H14 watchdog test',String(pkg.scripts?.['test:opsiqo-one-v7.32-hotfix14']||'').includes('opsiqo-one-v7-32-hotfix14.test.ts')],
 ['Canonical runner executes H14 audit',runner.includes('opsiqo85:v7.32:hotfix14:audit')],
 ['Canonical runner executes H14 targeted test',runner.includes('test:opsiqo-one-v7.32-hotfix14')],
];
let failed=0;for(const[name,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nOPSIQO V7.32 Hotfix 14 audit: ${checks.length-failed}/${checks.length} PASS`);if(failed)process.exit(1);
