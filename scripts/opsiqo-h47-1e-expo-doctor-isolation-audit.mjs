import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8');
const identity = read('src/lib/release/identity.ts');
const pkg = JSON.parse(read('mobile/package.json'));
const app = JSON.parse(read('mobile/app.json'));
const runner = read('RUN_OPSIQO_H47_1E_VALIDATION.ps1');
const historicalTest = read('tests/mobile-employee-h47-1d.test.ts');
const historicalAudit = read('scripts/opsiqo-h47-1d-mobile-tab-icon-audit.mjs');

const checks=[]; const add=(name,ok)=>checks.push({name,ok:Boolean(ok)});
add('H47.1E-or-later patch lineage is explicit', /OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H47\.1[E-Z]'/.test(identity));
add('employee mobile package patch is 0.2.4 or later', Number(String(pkg.version||'0').split('.')[2]||0) >= 4);
add('SDK 57 config removes obsolete root newArchEnabled field', !Object.hasOwn(app.expo || {}, 'newArchEnabled'));
add('Expo Router required linking peer is explicit', pkg.dependencies?.['expo-linking'] === '~57.0.9');
add('mobile release marker preserves v1.1e-or-later lineage', /^employee-mobile-v1\.1[e-z]$/i.test(String(app.expo?.extra?.h47Release||'')));
add('mobile certification uses a temporary isolated workspace', runner.includes('opsiqo-h471e-mobile-') && runner.includes('$TempMobile'));
add('temporary mobile install generates a lock file for Expo Doctor', /npm install --no-audit --no-fund/.test(runner) && runner.includes("Test-Path '.\\package-lock.json'"));
add('temporary mobile workspace is outside the root dependency tree', runner.includes('[System.IO.Path]::GetTempPath()'));
add('Expo dependency alignment remains immutable CI check', runner.includes("$env:CI = '1'") && runner.includes('expo install --check'));
add('mobile TypeScript remains mandatory before Expo Doctor', runner.indexOf('npm run typecheck') < runner.lastIndexOf('npx expo-doctor'));
add('Expo Doctor remains mandatory', runner.includes("throw 'Expo Doctor failed.'"));
add('temporary mobile workspace is removed after certification', runner.includes('Remove-Item -LiteralPath $TempRoot -Recurse -Force'));
add('H47.1D historical test accepts successor patches', historicalTest.includes('H47.1D-or-later patch lineage') && historicalTest.includes('[D-Z]'));
add('H47.1D historical audit accepts successor patches', historicalAudit.includes('H47.1D-or-later patch lineage') && historicalAudit.includes('[D-Z]'));

let pass=0; for(const c of checks){console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}`); if(c.ok)pass++;}
console.log(`\nH47.1E audit: ${pass}/${checks.length} PASS`);
if(pass!==checks.length) process.exit(1);
