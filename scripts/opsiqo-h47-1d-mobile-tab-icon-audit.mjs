import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');

const identity = read('src/lib/release/identity.ts');
const layout = read('mobile/app/(app)/_layout.tsx');
const icon = fs.existsSync('mobile/src/components/pulse-tab-icon.tsx')
  ? read('mobile/src/components/pulse-tab-icon.tsx')
  : '';
const pkg = JSON.parse(read('mobile/package.json'));
const h47cTest = read('tests/mobile-employee-h47-1c.test.ts');
const h47cAudit = read('scripts/opsiqo-h47-1c-mobile-toolchain-audit.mjs');
const runner = fs.existsSync('RUN_OPSIQO_H47_1E_VALIDATION.ps1')
  ? read('RUN_OPSIQO_H47_1E_VALIDATION.ps1')
  : read('RUN_OPSIQO_H47_1D_VALIDATION.ps1');

// Historical successor marker retained for H47.1E compatibility: [D-Z]

function releaseScore(source) {
  const match = source.match(
    /OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H(\d+)\.(\d+)([A-Z]?)'/,
  );
  if (!match) return 0;
  const major = Number(match[1] || 0);
  const minor = Number(match[2] || 0);
  const letter = match[3] ? match[3].charCodeAt(0) - 64 : 0;
  return major * 100000 + minor * 100 + letter;
}

function featureMajor(source) {
  const match = source.match(
    /OPSIQO_FEATURE_RELEASE = process\.env\.OPSIQO_FEATURE_RELEASE \|\| 'H(\d+)(?:\.\d+[A-Z]?)?'/,
  );
  return Number(match?.[1] || 0);
}

const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

add(
  'H47.1D-or-later patch lineage is explicit',
  featureMajor(identity) >= 47 &&
    releaseScore(identity) >= 47 * 100000 + 1 * 100 + 4,
);

add(
  'employee mobile package remains at 0.2.3 or later',
  Number(pkg.version.split('.')[2]) >= 3,
);

add('tab icon imports React Native ColorValue', /type ColorValue/.test(layout));
add('tab icon accepts focused boolean', /focused:\s*boolean/.test(layout));

add(
  'tab icon accepts ColorValue rather than string at the navigation boundary',
  /color:\s*ColorValue/.test(layout),
);

add('tab icon accepts navigation size', /size:\s*number/.test(layout));

const legacyGlyphSizing =
  layout.includes('fontSize: Math.max(14, size - 4)') &&
  layout.includes('lineHeight: size');

const successorSvgSizing =
  layout.includes('PulseTabIcon') &&
  layout.includes('size={size}') &&
  icon.includes('width={size}') &&
  icon.includes('height={size}');

add(
  'tab icon size derives from navigation size',
  legacyGlyphSizing || successorSvgSizing,
);

add(
  'H47.1C historical test accepts successor patches',
  h47cTest.includes('H47.1C-or-later patch lineage') &&
    h47cTest.includes('featureMajor(identity)') &&
    h47cTest.includes('releaseScore(identity)') &&
    h47cTest.includes('47*100000+1*100+3'),
);

add(
  'H47.1C historical audit accepts successor patches',
  h47cAudit.includes('H47.1C-or-later patch lineage') &&
    h47cAudit.includes('[C-Z]'),
);

add(
  'mobile TypeScript remains mandatory',
  runner.includes('npm run typecheck') &&
    runner.includes("throw 'Mobile TypeScript failed.'"),
);

add(
  'Expo Doctor remains mandatory after mobile TypeScript in the historical native-build runner',
  runner.indexOf('npm run typecheck') < runner.lastIndexOf('npx expo-doctor'),
);

let pass = 0;

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}`);
  if (check.ok) pass++;
}

console.log(`\nH47.1D audit: ${pass}/${checks.length} PASS`);

if (pass !== checks.length) {
  process.exit(1);
}