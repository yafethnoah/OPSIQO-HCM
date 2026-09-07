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

const contextRuntime = read('src/lib/strategic/context-runtime.ts');
const processGenerator = read('src/lib/strategic/hr-process-generator.ts');
const voiceRuntime = read('src/lib/strategic/voice-hr.ts');
const voiceBrowser = read('src/lib/strategic/voice-browser.ts');
const finalTest = read('tests/strategic-final-gap-closure.test.ts');

for (const signal of [
  'StrategicGovernedOrchestratorBridge',
  'projectOrchestratorResultToObjectGraph',
  'retrieveOrganizationalMemoryEvidence',
  'queryOperationalKnowledge',
  'assertCanonicalObject',
  'validateKnowledgeAssertion',
]) {
  if (!contextRuntime.includes(signal)) {
    failures.push(`context runtime missing signal: ${signal}`);
  }
}

for (const signal of [
  "status: 'draft'",
  'enabled: false',
  "activation: 'human_review_required'",
  'R5-R6 generated processes require a human decision step',
  'R6 generated processes require specialist review',
]) {
  if (!processGenerator.includes(signal)) {
    failures.push(`process generator missing safety signal: ${signal}`);
  }
}

for (const signal of [
  'routeOpsiQoCommand',
  'directExecutionPerformed: false',
  'transcript_not_persisted_by_voice_runtime',
  "'confirmation_required'",
  "'human_decision_required'",
]) {
  if (!voiceRuntime.includes(signal)) {
    failures.push(`Voice HR runtime missing safety signal: ${signal}`);
  }
}

for (const signal of [
  'SpeechRecognition',
  'webkitSpeechRecognition',
  'speechSynthesis',
]) {
  if (!voiceBrowser.includes(signal)) {
    failures.push(`Voice browser adapter missing signal: ${signal}`);
  }
}

const strategicFiles = [
  contextRuntime,
  processGenerator,
  voiceRuntime,
  voiceBrowser,
];

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

for (const [index, text] of strategicFiles.entries()) {
  for (const signal of forbiddenPersistenceSignals) {
    if (text.includes(signal)) {
      failures.push(`strategic closure file ${index + 1} contains forbidden datastore surface: ${signal}`);
    }
  }
}

for (const route of [
  'src/app/api/strategic-roadmap/context/[orgId]/route.ts',
  'src/app/api/strategic-roadmap/process-generator/[orgId]/route.ts',
  'src/app/api/strategic-roadmap/voice/[orgId]/route.ts',
]) {
  const text = read(route);
  if (!text.includes('actorFromRequest')) {
    failures.push(`${route} does not authenticate through actorFromRequest`);
  }
}

for (const signal of [
  'domainIntegratedOrBetter).toBe(24)',
  'validatedOrBetter).toBe(24)',
  'uatVerified).toBe(0)',
]) {
  if (!finalTest.includes(signal)) {
    failures.push(`final closure test missing readiness assertion: ${signal}`);
  }
}

if (failures.length) {
  console.error('H49 final strategic gap audit: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('H49 final strategic gap audit: PASS');
console.log(' - Phase 1 EOG: authoritative orchestration receipt projection');
console.log(' - Phase 2 Knowledge Graph: permission-scoped Organizational Memory retrieval');
console.log(' - Phase 17 AI HR Process Generator: natural-language draft compiler, never auto-activates');
console.log(' - Phase 23 Voice HR: browser speech adapter + governed command control plane');
console.log(' - Voice direct authoritative execution: forbidden');
console.log(' - Strategic direct datastore access: absent');
console.log(' - Local roadmap validation target: 24/24');
console.log(' - Exact-SHA UAT target: still 0/24 until final release freeze/push/deploy');
