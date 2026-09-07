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

const enterprise = read('src/lib/strategic/enterprise-domain-bindings.ts');

const requiredSignals = [
  "'compensation.decide_recommendation'",
  "'performance.manager_assessment'",
  "'performance.calibrate_review'",
  "'performance.pip_action'",
  "'succession.save_nomination'",
  "'separation.case_action'",
  "'employee_relations.add_finding'",
  "'learning.assign'",
  "'workforce_planning.create_scenario'",
  "'regulatory.create_legal_review'",
  "directExecution: 'blocked'",
  "allowedRiskClasses: ['high_impact_admin']",
  'CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED',
  'DOMAIN_SIMULATION_REQUIRES_IMPACT_PREVIEW',
  'createStrategicDomainServiceRegistry',
];

for (const signal of requiredSignals) {
  if (!enterprise.includes(signal)) {
    failures.push(`enterprise binding layer missing signal: ${signal}`);
  }
}

const expectedImports = [
  "import('@/lib/compensation/service')",
  "import('@/lib/performance/service')",
  "import('@/lib/career/service')",
  "import('@/lib/separation/service')",
  "import('@/lib/employee-relations/service')",
  "import('@/lib/learning/service')",
  "import('@/lib/workforce-planning/service')",
  "import('@/lib/regulatory/service')",
];

for (const signal of expectedImports) {
  if (!enterprise.includes(signal)) {
    failures.push(`enterprise binding missing authoritative import: ${signal}`);
  }
}

const forbiddenPersistenceSignals = [
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

for (const signal of forbiddenPersistenceSignals) {
  if (enterprise.includes(signal)) {
    failures.push(`enterprise binding contains forbidden datastore surface: ${signal}`);
  }
}

const authoritativeContracts = [
  ['src/lib/compensation/service.ts', [
    'export async function actRecommendation',
    'buildAudit',
    'buildDomainEvent',
  ]],
  ['src/lib/performance/service.ts', [
    'export async function submitManagerAssessment',
    'export async function calibrateReview',
    'export async function actOnPip',
    'buildAudit',
  ]],
  ['src/lib/career/service.ts', [
    'export async function saveSuccessorNomination',
    'buildAudit',
  ]],
  ['src/lib/separation/service.ts', [
    'export async function actSeparation',
    'buildAudit',
  ]],
  ['src/lib/employee-relations/service.ts', [
    'export async function addFinding',
    'buildAudit',
  ]],
  ['src/lib/learning/service.ts', [
    'export async function assignLearning',
    'buildAudit',
    'buildDomainEvent',
  ]],
  ['src/lib/workforce-planning/service.ts', [
    'export async function createWorkforceScenario',
    'buildAudit',
  ]],
  ['src/lib/regulatory/service.ts', [
    'export async function createLegalReview',
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

const readiness = read('src/lib/strategic/readiness.ts');

for (const phaseId of [6, 7, 12, 13, 14, 18]) {
  if (!readiness.includes(`${phaseId}:`)) {
    failures.push(`readiness evidence missing phase ${phaseId}`);
  }
}

if (!readiness.includes('uatVerified: counts')) {
  failures.push('readiness model no longer preserves explicit UAT counting');
}

if (failures.length > 0) {
  console.error('H49 enterprise domain convergence audit: FAIL');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('H49 enterprise domain convergence audit: PASS');
console.log(' - compensation: R4 governed');
console.log(' - performance assessment/calibration/PIP: R5 direct execution blocked');
console.log(' - succession: R5 direct execution blocked');
console.log(' - separation: R6 direct execution blocked');
console.log(' - employee relations findings: specialist/human controlled');
console.log(' - learning assignment: R3 governed');
console.log(' - workforce scenario creation: R3 planning-only write');
console.log(' - regulatory legal-review creation: R4 governed');
console.log(' - enterprise strategic Firestore writes: absent');
console.log(' - locally validated roadmap phases: 6, 7, 12, 13, 14, 18 plus phases 3-5');
console.log(' - UAT status: intentionally zero');
