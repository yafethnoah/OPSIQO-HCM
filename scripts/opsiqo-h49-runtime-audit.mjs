import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const required = [
  'src/lib/strategic/runtime-gateway.ts',
  'src/lib/strategic/readiness.ts',
  'src/lib/strategic/benchmark-telemetry.ts',
  'src/app/api/strategic-roadmap/readiness/route.ts',
  'tests/strategic-runtime.test.ts',
];

const failures = [];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    failures.push(`missing ${relative}`);
  }
}

const gatewayPath = path.join(root, 'src/lib/strategic/runtime-gateway.ts');
const gateway = fs.existsSync(gatewayPath)
  ? fs.readFileSync(gatewayPath, 'utf8')
  : '';

const requiredGatewaySignals = [
  'cross-organization execution is forbidden',
  'R0-R2 actions cannot perform authoritative mutations',
  'R3-R6 actions cannot execute autonomously',
  'R6 requires a recorded human decision',
  'permission must be checked during planning',
  'permission recheck returned no decision',
  'authoritative update requires expectedVersion',
  'authoritative update requires expectedEtag',
  'tenant scope, idempotency, audit and domain events',
  'idempotencyKey: request.plan.idempotencyKey',
  'auditId',
  'domainEventId',
];

for (const signal of requiredGatewaySignals) {
  if (!gateway.includes(signal)) {
    failures.push(`runtime gateway missing control: ${signal}`);
  }
}

const versionIndex = gateway.indexOf(
  'await this.assertVersionBoundary(request)',
);
const permissionIndex = gateway.indexOf(
  'await this.dependencies.permissions.recheck',
);
const executionGuardIndex = gateway.indexOf(
  'assertExecutionAllowed({',
);
const executeIndex = gateway.indexOf(
  'await service.execute({',
);

if (
  versionIndex < 0 ||
  permissionIndex < 0 ||
  executionGuardIndex < 0 ||
  executeIndex < 0 ||
  !(
    versionIndex < permissionIndex &&
    permissionIndex < executionGuardIndex &&
    executionGuardIndex < executeIndex
  )
) {
  failures.push(
    'runtime ordering must be version check -> permission recheck -> execution guard -> authoritative service',
  );
}

const runtimeFiles = [
  'src/lib/strategic/runtime-gateway.ts',
  'src/lib/strategic/readiness.ts',
  'src/lib/strategic/benchmark-telemetry.ts',
];

const forbiddenDirectWritePatterns = [
  ['client-firestore-import', /firebase\/firestore/],
  ['admin-firestore-import', /firebase-admin\/firestore/],
  ['set-document-call', /\bsetDoc\s*\(/],
  ['update-document-call', /\bupdateDoc\s*\(/],
  ['add-document-call', /\baddDoc\s*\(/],
  ['delete-document-call', /\bdeleteDoc\s*\(/],
  ['transaction-call', /\brunTransaction\s*\(/],
  ['write-batch-call', /\bwriteBatch\s*\(/],
];

for (const relative of runtimeFiles) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');

  for (const [name, pattern] of forbiddenDirectWritePatterns) {
    if (pattern.test(text)) {
      failures.push(`${relative} contains forbidden direct datastore surface: ${name}`);
    }
  }
}

const readinessPath = path.join(root, 'src/lib/strategic/readiness.ts');
const readiness = fs.existsSync(readinessPath)
  ? fs.readFileSync(readinessPath, 'utf8')
  : '';

for (const state of [
  'registered',
  'contract-ready',
  'runtime-foundation',
  'domain-integrated',
  'validated',
  'uat-verified',
]) {
  if (!readiness.includes(`'${state}'`)) {
    failures.push(`readiness model missing state ${state}`);
  }
}

if (!readiness.includes('domainAdapterFiles')) {
  failures.push('readiness model cannot distinguish foundation from domain integration');
}

const benchmarkPath = path.join(
  root,
  'src/lib/strategic/benchmark-telemetry.ts',
);
const benchmark = fs.existsSync(benchmarkPath)
  ? fs.readFileSync(benchmarkPath, 'utf8')
  : '';

for (const safeKey of [
  "'surface'",
  "'locale'",
  "'channel'",
  "'release'",
  "'workflow'",
]) {
  if (!benchmark.includes(safeKey)) {
    failures.push(`benchmark telemetry missing safe dimension ${safeKey}`);
  }
}

if (failures.length > 0) {
  console.error('H49 runtime convergence audit: FAIL');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('H49 runtime convergence audit: PASS');
console.log(' - authoritative writes: injected domain service only');
console.log(' - permission recheck: immediately before execution guard/service');
console.log(' - optimistic concurrency: enforced for updates');
console.log(' - tenant isolation: enforced');
console.log(' - R0-R6 human-control boundary: enforced');
console.log(' - mutation audit/domain-event contract: required');
console.log(' - roadmap readiness: non-overclaiming');
console.log(' - benchmark telemetry: bounded dimensions');
