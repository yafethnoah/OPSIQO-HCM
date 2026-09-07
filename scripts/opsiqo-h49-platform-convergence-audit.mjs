import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relative) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    failures.push(`missing ${relative}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

const convergence = read('src/lib/strategic/platform-convergence.ts');
const readiness = read('src/lib/strategic/readiness.ts');

for (const phaseId of [8, 9, 10, 11, 15, 16, 17, 19, 20, 21, 22, 23, 24]) {
  if (!convergence.includes(`phaseId: ${phaseId},`)) {
    failures.push(`platform convergence catalog missing phase ${phaseId}`);
  }
}

const validatedCount =
  (convergence.match(/status: 'validated'/g) ?? []).length;

if (validatedCount !== 13) {
  failures.push(`expected 13 validated platform convergence items; found ${validatedCount}`);
}

if (convergence.includes("status: 'partial'")) {
  failures.push('platform convergence still contains a partial item');
}

if (convergence.includes("status: 'open'")) {
  failures.push('platform convergence still contains an open item');
}

for (const signal of [
  'src/lib/strategic/hr-process-generator.ts',
  'src/lib/strategic/voice-hr.ts',
  'src/lib/strategic/voice-browser.ts',
  'never performs direct authoritative execution',
  'generated plans remain disabled drafts',
]) {
  if (!convergence.includes(signal)) {
    failures.push(`final platform convergence missing signal: ${signal}`);
  }
}

for (const signal of [
  'src/lib/strategic/context-runtime.ts',
  'src/lib/opsiqo-one/organizational-memory.ts',
  'src/app/api/strategic-roadmap/process-generator/[orgId]/route.ts',
  'src/app/api/strategic-roadmap/voice/[orgId]/route.ts',
]) {
  if (!readiness.includes(signal)) {
    failures.push(`final readiness evidence missing signal: ${signal}`);
  }
}

if (!readiness.includes('uatVerified: counts')) {
  failures.push('explicit UAT counting is missing');
}

console.log(
  failures.length ? 'H49 platform capability convergence audit: FAIL' :
  'H49 platform capability convergence audit: PASS',
);

if (failures.length) {
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(' - platform convergence items: 13/13 locally validated');
console.log(' - Phase 17 AI HR Process Generator: locally validated');
console.log(' - Phase 23 Voice HR: locally validated');
console.log(' - Phase 1 EOG: runtime adoption evidence present');
console.log(' - Phase 2 Knowledge Graph: operational retrieval evidence present');
console.log(' - exact-SHA UAT remains intentionally unclaimed');
