import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const runner = fs.readFileSync(path.join(root, 'scripts', 'run-firestore-rules-isolated.mjs'), 'utf8');

const checks = [
  ['test:rules uses isolated runner', pkg.scripts?.['test:rules'] === 'node scripts/run-firestore-rules-isolated.mjs'],
  ['isolated runner has dedicated port pool', runner.includes('8180') && runner.includes('8189')],
  ['isolated runner does not reserve dev port 8080', !runner.includes('candidatePorts = [8080')],
  ['isolated runner disables emulator UI', runner.includes("ui: { enabled: false }")],
  ['isolated runner uses dedicated test project', runner.includes('demo-opsiqo-rules-test')],
  ['isolated runner preserves live dev emulator', runner.includes('will not be touched')],
  ['isolated runner deletes temporary config', runner.includes('fs.unlinkSync(configPath)')],
  ['isolated runner executes Firestore rules test as one argument', runner.includes("'vitest run tests/firestore.rules.test.ts'")],
  ['Windows-safe runner invokes Firebase JS entry point', runner.includes("firebase-tools', 'lib', 'bin', 'firebase.js")],
  ['Windows-safe runner invokes Node directly', runner.includes('spawn(process.execPath, firebaseArgs')],
  ['Windows-safe runner disables shell parsing', runner.includes('shell: false')],
  ['runner does not spawn firebase.cmd', !runner.includes("'firebase.cmd'")]
];

let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures += 1;
}
console.log(JSON.stringify({ status: failures ? 'FAIL' : 'PASS', checks: checks.length, failures }, null, 2));
process.exit(failures ? 1 : 0);
