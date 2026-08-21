#!/usr/bin/env node
import fs from 'node:fs';

const test=fs.readFileSync('tests/opsiqo85/opsiqo-one-v7-32-hotfix14.test.ts','utf8');
const selftest=fs.readFileSync('scripts/opsiqo85-v7-32-watchdog-selftest.mjs','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const runner=fs.readFileSync('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1','utf8');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

check('H14 TypeScript test no longer imports untyped .mjs helper directly',!test.includes("from '../../scripts/opsiqo85-v7-32-bounded-process.mjs'"));
check('H14 watchdog test invokes dedicated Node self-test',test.includes('opsiqo85-v7-32-watchdog-selftest.mjs'));
check('Watchdog self-test exercises runBoundedProcess',selftest.includes('runBoundedProcess'));
check('Watchdog self-test uses a never-ending child',selftest.includes('setInterval(()=>{},1000)'));
check('Watchdog self-test fails closed unless timeout occurs',selftest.includes("result.timedOut === true")&&selftest.includes("process.exit(ok ? 0 : 1)"));
check('Package exposes H16 audit',pkg.scripts?.['opsiqo85:v7.32:hotfix16:audit']==='node scripts/opsiqo85-v7-32-hotfix16-audit.mjs');
check('Package exposes H16 targeted test',pkg.scripts?.['test:opsiqo-one-v7.32-hotfix16']==='vitest run tests/opsiqo85/opsiqo-one-v7-32-hotfix14.test.ts');
check('Canonical runner executes H16 audit',runner.includes('opsiqo85:v7.32:hotfix16:audit'));
check('Canonical runner executes H16 targeted test',runner.includes('test:opsiqo-one-v7.32-hotfix16'));

for(const c of checks) console.log(`${c.ok?'PASS':'FAIL'} ${c.name}`);
const passed=checks.filter(c=>c.ok).length;
console.log(`\nOPSIQO V7.32 Hotfix 16 audit: ${passed}/${checks.length} PASS`);
if(passed!==checks.length)process.exit(1);
