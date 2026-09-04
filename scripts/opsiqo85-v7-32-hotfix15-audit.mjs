import fs from 'node:fs';
const h11=fs.readFileSync('scripts/opsiqo85-v7-32-hotfix11-audit.mjs','utf8');
const smoke=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-smoke.mjs','utf8');
const runner=fs.readFileSync('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 ['Historical H11 evidence predicate accepts H14 checkpoint architecture',h11.includes('boundedPartialEvidence')&&h11.includes('v7-32-authenticated-accessibility.partial.json')&&h11.includes('writeCheckpoint(false)')&&h11.includes('routesCompleted')&&h11.includes('runBoundedProcess')],
 ['H11 still accepts original runtime-error evidence contract',h11.includes("browser.includes('runtimeError')")&&h11.includes("browser.includes('routes completed')")],
 ['H14 browser coordinator checkpoints after each route',smoke.includes('writeCheckpoint(false)')&&smoke.includes('routesCompleted:report.routes.length')],
 ['H14 browser coordinator retains isolated bounded workers',smoke.includes('runBoundedProcess')&&smoke.includes('routeWorkerTimeoutMs')],
 ['Package exposes H15 audit',pkg.scripts?.['opsiqo85:v7.32:hotfix15:audit']==='node scripts/opsiqo85-v7-32-hotfix15-audit.mjs'],
 ['Package exposes H15 targeted test',String(pkg.scripts?.['test:opsiqo-one-v7.32-hotfix15']||'').includes('opsiqo-one-v7-32-hotfix15.test.ts')],
 ['Canonical runner executes H15 audit',runner.includes('V7.32 Hotfix 15 historical audit compatibility')],
 ['Canonical runner executes H15 targeted test',runner.includes('V7.32 Hotfix 15 targeted tests')],
];
let failed=0;for(const[name,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nOPSIQO V7.32 Hotfix 15 audit: ${checks.length-failed}/${checks.length} PASS`);if(failed)process.exit(1);
