import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8');
const identity = read('src/lib/release/identity.ts');
const ui = read('src/components/resume-intake-assistant.tsx');
const h45 = read('tests/recruiting-uat-readiness-h45.test.ts');
const runner = read('RUN_OPSIQO_H47_1B_VALIDATION.ps1');
const checks=[]; const add=(name,ok)=>checks.push({name,ok:Boolean(ok)});
add('H47.1B-or-later patch lineage is explicit', /OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H47\.1[A-Z]?'/.test(identity));
add('H41 failed parse clears candidate fields before other catch work', /catch \(e\) \{\s*clearParsedValues\(form\)/.test(ui));
add('H45 runtime test accepts successor feature releases', h45.includes('H45-or-later runtime marker')&&h45.includes('toBeGreaterThanOrEqual(45)'));
add('H45 runtime test no longer hardcodes H45 as the current release', !h45.includes("OPSIQO_FEATURE_RELEASE = process.env.OPSIQO_FEATURE_RELEASE || 'H45'"));
add('H47 audit accepts successor patches in the H47 family', read('scripts/opsiqo-h47-mobile-employee-audit.mjs').includes('\\.\\d+[A-Z]?'));
add('H47.1 audit accepts successor letter patches', read('scripts/opsiqo-h47-1-mobile-essentials-audit.mjs').includes('H47\\.1[A-Z]?'));
add('targeted validation covers H41 PDF safety regression', runner.includes('tests/recruiting-pdf-safety-h41.test.ts'));
add('targeted validation covers H45 readiness regression', runner.includes('tests/recruiting-uat-readiness-h45.test.ts'));
add('full Vitest remains mandatory', runner.includes('npm test'));
let pass=0; for(const c of checks){console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}`); if(c.ok)pass++;}
console.log(`\nH47.1B audit: ${pass}/${checks.length} PASS`); if(pass!==checks.length) process.exit(1);
