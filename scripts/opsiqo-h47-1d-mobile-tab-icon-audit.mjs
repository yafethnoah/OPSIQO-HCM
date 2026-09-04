import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8');
const identity = read('src/lib/release/identity.ts');
const layout = read('mobile/app/(app)/_layout.tsx');
const pkg = JSON.parse(read('mobile/package.json'));
const h47cTest = read('tests/mobile-employee-h47-1c.test.ts');
const h47cAudit = read('scripts/opsiqo-h47-1c-mobile-toolchain-audit.mjs');
const runner = fs.existsSync('RUN_OPSIQO_H47_1E_VALIDATION.ps1') ? read('RUN_OPSIQO_H47_1E_VALIDATION.ps1') : read('RUN_OPSIQO_H47_1D_VALIDATION.ps1');
const checks=[]; const add=(name,ok)=>checks.push({name,ok:Boolean(ok)});
add('H47.1D-or-later patch lineage is explicit', /OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H47\.1[D-Z]'/.test(identity));
add('employee mobile package remains at 0.2.3 or later', Number(pkg.version.split('.')[2]) >= 3);
add('tab icon imports React Native ColorValue', /type ColorValue/.test(layout));
add('tab icon accepts focused boolean', /focused:\s*boolean/.test(layout));
add('tab icon accepts ColorValue rather than string', /color:\s*ColorValue/.test(layout) && !/color:\s*string/.test(layout));
add('tab icon accepts navigation size', /size:\s*number/.test(layout));
add('tab glyph size derives from navigation size', layout.includes('fontSize: Math.max(14, size - 4)') && layout.includes('lineHeight: size'));
add('H47.1C historical test accepts successor patches', h47cTest.includes('H47.1C-or-later patch lineage') && h47cTest.includes('[C-Z]'));
add('H47.1C historical audit accepts successor patches', h47cAudit.includes('H47.1C-or-later patch lineage') && h47cAudit.includes('[C-Z]'));
add('mobile TypeScript remains mandatory', runner.includes('npm run typecheck') && runner.includes("throw 'Mobile TypeScript failed.'"));
add('Expo Doctor remains mandatory after mobile TypeScript', runner.indexOf('npm run typecheck') < runner.lastIndexOf('npx expo-doctor'));
let pass=0; for(const c of checks){console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}`); if(c.ok)pass++;}
console.log(`
H47.1D audit: ${pass}/${checks.length} PASS`); if(pass!==checks.length) process.exit(1);
