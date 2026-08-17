import { readFileSync } from 'node:fs';
const readiness=readFileSync('src/lib/operations/readiness.ts','utf8');
const preflight=readFileSync('scripts/production-preflight.ts','utf8');
const runner=readFileSync('scripts/run-production-preflight.mjs','utf8');
const sync=readFileSync('scripts/sync-firebase-web-config.mjs','utf8');
const tests=readFileSync('tests/production-readiness.test.ts','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const checks=[
['production npm script uses dedicated production runner',pkg.scripts?.['preflight:production']==='node scripts/run-production-preflight.mjs'],
['production runner injects NODE_ENV=production',/env:\s*\{[\s\S]{0,120}NODE_ENV:\s*['"]production['"]/.test(runner)],
['production runner disables shell parsing',/shell:\s*false/.test(runner)],
['production runner invokes reviewed local tsx CLI',/node_modules['"],\s*['"]tsx['"],\s*['"]dist['"],\s*['"]cli\.mjs['"]/.test(runner)],
['production preflight refuses non-production execution',/process\.env\.NODE_ENV\s*!==\s*['"]production['"]/.test(preflight)],
['production preflight does not assign readonly NODE_ENV',!/process\.env\.NODE_ENV\s*=/.test(preflight)],
['production preflight reports production_mode gate',/name:\s*['"]production_mode['"]/.test(preflight)],
['readiness rejects placeholder values',/function looksPlaceholder/.test(readiness)],
['Firebase project rejects placeholders',/firebase_project[\s\S]{0,240}looksPlaceholder/.test(readiness)],
['Storage bucket rejects placeholders',/storage_bucket[\s\S]{0,240}looksPlaceholder/.test(readiness)],
['Firebase web configuration has an explicit gate',/firebase_web_config/.test(readiness)],
['Firebase API key format is validated',/\^AIza/.test(readiness)],
['Firebase appId and senderId consistency is validated',/appMatch\[1\]\s*===\s*senderId/.test(readiness)],
['Firebase CLI sync uses shell-free execution',/shell:\s*false/.test(sync)],
['Firebase sync redacts API key',/API key: \[REDACTED\]/.test(sync)],
['placeholder regression test exists',/placeholder values/.test(tests)],
['appId sender mismatch regression test exists',/messagingSenderId disagree/.test(tests)],
]; let failures=0; for(const [label,ok] of checks){ console.log(`${ok?'PASS':'FAIL'}  ${label}`); if(!ok) failures++; } console.log(JSON.stringify({status:failures?'FAIL':'PASS',checks:checks.length,failures},null,2)); if(failures) process.exitCode=1;
