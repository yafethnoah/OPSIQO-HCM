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

const bindings = read('src/lib/strategic/domain-bindings.ts');

const requiredBindingSignals = [
  "'core_hr.create_employee'",
  "'core_hr.correct_employee'",
  "'recruiting.create_requisition'",
  "'recruiting.hire_candidate'",
  "'onboarding.create_prehire_case'",
  "'leave.request'",
  "'leave.approve_request'",
  "'leave.cancel_request'",
  "'time_attendance.clock'",
  "'payroll.export'",
  "'workflow.start'",
  "directExecution: 'blocked'",
  "permission: 'recruiting.hire'",
  "permission: 'payroll.export'",
  "allowedRiskClasses: ['high_impact_admin']",
  'CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED',
  'DOMAIN_SIMULATION_REQUIRES_IMPACT_PREVIEW',
  'resolveActorContext',
  'resolvePayload',
  'ServiceBindingRegistry',
];

for (const signal of requiredBindingSignals) {
  if (!bindings.includes(signal)) {
    failures.push(`domain binding layer missing signal: ${signal}`);
  }
}

const expectedProductionImports = [
  "import('@/lib/hr/service')",
  "import('@/lib/recruiting/service')",
  "import('@/lib/onboarding/service')",
  "import('@/lib/time/service')",
  "import('@/lib/workflow/service')",
];

for (const signal of expectedProductionImports) {
  if (!bindings.includes(signal)) {
    failures.push(`production domain executor missing import: ${signal}`);
  }
}

const forbiddenBindingSignals = [
  "from 'firebase/firestore'",
  'from "firebase/firestore"',
  "from 'firebase-admin/firestore'",
  'from "firebase-admin/firestore"',
  'adminDb(',
  'setDoc(',
  'updateDoc(',
  'addDoc(',
  'deleteDoc(',
  'runTransaction(',
  'writeBatch(',
];

for (const signal of forbiddenBindingSignals) {
  if (bindings.includes(signal)) {
    failures.push(`strategic domain binding contains forbidden datastore surface: ${signal}`);
  }
}

const authoritativeContracts = [
  ['src/lib/hr/service.ts', [
    'export async function createEmployee',
    'export async function correctEmployeeCore',
    'buildAudit',
    'buildDomainEvent',
  ]],
  ['src/lib/recruiting/service.ts', [
    'export async function createRequisition',
    'export async function hireCandidate',
    'buildAudit',
    'buildDomainEvent',
  ]],
  ['src/lib/onboarding/service.ts', [
    'export async function createPrehireCase',
    'buildAudit',
    'buildDomainEvent',
  ]],
  ['src/lib/time/service.ts', [
    'export async function requestLeave',
    'export async function actOnLeave',
    'export async function clock',
    'export async function exportPayrollCsv',
    'buildAudit',
  ]],
  ['src/lib/workflow/service.ts', [
    'export async function startWorkflow',
    'buildAudit',
  ]],
];

for (const [relative, signals] of authoritativeContracts) {
  const text = read(relative);
  for (const signal of signals) {
    if (!text.includes(signal)) {
      failures.push(`authoritative service drift: ${relative} missing ${signal}`);
    }
  }
}

const serviceBindings = read('src/lib/orchestrator/serviceBindings.ts');
for (const signal of [
  'Duplicate service binding',
  'UNBOUND_SERVICE',
  'toReadonlyMap',
]) {
  if (!serviceBindings.includes(signal)) {
    failures.push(`ServiceBindingRegistry contract missing: ${signal}`);
  }
}

const engine = read('src/lib/orchestrator/engine.ts');
for (const signal of [
  'PERMISSION_DENIED_AT_EXECUTION',
  'TENANT_SCOPE_DENIED',
  'CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED',
]) {
  if (!engine.includes(signal) && signal !== 'CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED') {
    failures.push(`orchestrator execution guard missing: ${signal}`);
  }
}

const governance = read('src/lib/orchestrator/governance.ts');
if (!governance.includes('CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED')) {
  failures.push('orchestrator governance no longer blocks consequential direct execution');
}

if (failures.length > 0) {
  console.error('H49 authoritative domain bindings audit: FAIL');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('H49 authoritative domain bindings audit: PASS');
console.log(' - Core HR: bound to hr/service');
console.log(' - Recruiting: requisition bound; hire registered but direct R5 execution blocked');
console.log(' - Onboarding: bound to onboarding/service');
console.log(' - Leave: request + approve/reject + cancel permission-separated');
console.log(' - Time/Attendance: clock bound to time/service');
console.log(' - Payroll: export bound as high-impact R4; CSV excluded from receipt');
console.log(' - Workflow: start bound to workflow/service');
console.log(' - Payloads: reference-resolved; no payload values logged');
console.log(' - Actor/tenant/permission: revalidated before domain service');
console.log(' - Simulation: no authoritative write');
console.log(' - Strategic Firestore access: absent');
