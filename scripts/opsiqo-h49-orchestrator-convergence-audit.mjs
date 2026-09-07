import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const required = [
  'src/lib/strategic/orchestrator-bridge.ts',
  'src/lib/strategic/readiness.ts',
  'tests/strategic-orchestrator-convergence.test.ts',
  'src/lib/orchestrator/engine.ts',
  'src/lib/orchestrator/governance.ts',
  'src/lib/orchestrator/serviceBindings.ts',
  'src/lib/orchestrator/types.ts',
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    failures.push(`missing ${relative}`);
  }
}

function read(relative) {
  const full = path.join(root, relative);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

const bridge = read('src/lib/strategic/orchestrator-bridge.ts');
const engine = read('src/lib/orchestrator/engine.ts');
const governance = read('src/lib/orchestrator/governance.ts');
const bindings = read('src/lib/orchestrator/serviceBindings.ts');
const readiness = read('src/lib/strategic/readiness.ts');

const bridgeSignals = [
  "strategicExecutionAuthority = 'governed-orchestrator'",
  "return 'read_only'",
  "return 'administrative'",
  "return 'high_impact_admin'",
  "return 'consequential'",
  'R4 requires independent approval evidence',
  'R5-R6 require recorded human-decision evidence',
  'R6 requires specialist-review evidence',
  'new GovernedOrchestrator',
];

for (const signal of bridgeSignals) {
  if (!bridge.includes(signal)) {
    failures.push(`strategic bridge missing control: ${signal}`);
  }
}

const existingEngineSignals = [
  'PERMISSION_DENIED_AT_EXECUTION',
  'TENANT_SCOPE_DENIED',
  'AUTHORITATIVE_SERVICE_UNBOUND',
  'buildIdempotencyKey',
  'createStepReceipt',
  'reconciliation_required',
];

for (const signal of existingEngineSignals) {
  if (!engine.includes(signal)) {
    failures.push(`existing orchestrator missing expected control: ${signal}`);
  }
}

const governanceSignals = [
  'CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED',
  'PROHIBITED_AUTONOMOUS_GOALS',
  'IDEMPOTENCY_REQUIRED',
  'HUMAN_CHECKPOINT_REQUIRES_CONFIRMATION',
];

for (const signal of governanceSignals) {
  if (!governance.includes(signal)) {
    failures.push(`existing orchestrator governance missing control: ${signal}`);
  }
}

if (!bindings.includes('Duplicate service binding')) {
  failures.push('existing service binding registry duplicate protection is missing');
}

if (!bindings.includes('UNBOUND_SERVICE')) {
  failures.push('existing service binding validation is missing');
}

const forbiddenStrategicDatastorePatterns = [
  ['client-firestore-import', /firebase\/firestore/],
  ['admin-firestore-import', /firebase-admin\/firestore/],
  ['set-document-call', /\bsetDoc\s*\(/],
  ['update-document-call', /\bupdateDoc\s*\(/],
  ['add-document-call', /\baddDoc\s*\(/],
  ['delete-document-call', /\bdeleteDoc\s*\(/],
  ['transaction-call', /\brunTransaction\s*\(/],
  ['write-batch-call', /\bwriteBatch\s*\(/],
];

for (const [name, pattern] of forbiddenStrategicDatastorePatterns) {
  if (pattern.test(bridge)) {
    failures.push(`strategic orchestrator bridge contains forbidden datastore surface: ${name}`);
  }
}

for (const signal of [
  "domainAdapterFiles: ['src/lib/strategic/orchestrator-bridge.ts']",
  "'tests/strategic-orchestrator-convergence.test.ts'",
  'uatVerified: counts',
  'not UAT verification',
]) {
  if (!readiness.includes(signal)) {
    failures.push(`readiness evidence missing signal: ${signal}`);
  }
}

if (failures.length > 0) {
  console.error('H49 strategic/orchestrator convergence audit: FAIL');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('H49 strategic/orchestrator convergence audit: PASS');
console.log(' - execution authority: existing GovernedOrchestrator');
console.log(' - service binding authority: existing ServiceBindingRegistry');
console.log(' - R0-R2: read-only orchestration class');
console.log(' - R3: administrative + confirmation');
console.log(' - R4: high-impact + approval evidence + confirmation');
console.log(' - R5: consequential direct execution prohibited');
console.log(' - R6: consequential + human decision + specialist-review evidence');
console.log(' - permission recheck: existing execution-time guard');
console.log(' - tenant isolation: existing execution-time guard');
console.log(' - idempotency/receipts/reconciliation: existing runtime');
console.log(' - strategic direct datastore access: absent');
console.log(' - UAT status: intentionally not claimed');
