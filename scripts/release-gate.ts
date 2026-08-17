import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildReadinessSummary } from '../src/lib/operations/readiness';

type Gate = { name: string; pass: boolean; detail: string };
const gates: Gate[] = [];
const add = (name: string, pass: boolean, detail: string) => gates.push({ name, pass, detail });
const text = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : '';

add('package-lock.json', existsSync('package-lock.json'), 'A committed and reviewed npm lockfile is mandatory before production promotion.');
for (const file of ['firestore.rules', 'storage.rules', 'firestore.indexes.json', 'PRODUCTION_RUNBOOK.md', 'V3.6.1_ACCEPTANCE.md', 'V3.6.1_VALIDATION_REPORT.md', 'V3.6.1_PRODUCTION_RUNBOOK.md', 'UPGRADE_V3.6.1.md']) {
  add(file, existsSync(file), `${file} must ship with v3.6.1.`);
}

for (const [name, path] of [
  ['production evidence contract', 'src/lib/platform-reliability/production-evidence.ts'],
  ['cloud DR evidence collector', 'scripts/capture-firestore-dr-evidence.ts'],
  ['restored Firestore sentinel verifier', 'scripts/verify-restored-firestore.ts'],
  ['DR exercise evidence capture', 'scripts/capture-dr-exercise-result.ts'],
  ['production evidence bundle generator', 'scripts/generate-production-evidence-bundle.ts'],
  ['production evidence bundle verifier', 'scripts/verify-production-evidence-bundle.ts'],
  ['production evidence tests', 'tests/production-evidence.test.ts'],
  ['cloud DR evidence workflow', '.github/workflows/cloud-dr-evidence.yml'],
  ['production evidence closure workflow', '.github/workflows/production-evidence-closure.yml'],
  ['security analysis workflow', '.github/workflows/security-analysis.yml'],
] as const) add(name, existsSync(path), `${path} must ship.`);

const admin = text('src/lib/firebase/admin.ts');
add('Firebase Admin ADC/WIF support', admin.includes('applicationDefault()') && admin.includes("authMode === 'adc'"), 'v3.6.1 must support explicit ADC workload identity as an alternative to long-lived service-account keys.');
const readinessSource = text('src/lib/operations/readiness.ts');
add('v3.6.1 evidence readiness references', ['production_evidence_ref', 'cloud_dr_evidence_ref', 'dr_exercise_evidence_ref'].every((token) => readinessSource.includes(token)), 'Production readiness must fail closed without traceable CI/cloud-DR/restore-exercise evidence references.');

const closure = text('.github/workflows/production-evidence-closure.yml');
add('WIF cloud authentication', closure.includes('google-github-actions/auth@v3') && closure.includes('workload_identity_provider'), 'Cloud evidence workflow must use GitHub OIDC/Workload Identity Federation rather than a checked-in cloud key.');
add('controlled Firestore restore exercise', closure.includes('gcloud beta firestore databases restore') && closure.includes('RESTORE_TEST') && closure.includes('cloud:dr:sentinel'), 'The closure workflow must require explicit authorization, restore into a temporary database and verify a sentinel.');
add('temporary restore cleanup', closure.includes('gcloud firestore databases delete') && closure.includes('cleanup_status'), 'The controlled restore exercise must attempt and evidence cleanup of the temporary database.');
add('full production evidence sequence', ['review-lockfile.mjs', 'npm ci', 'npm audit', 'security:static-scan', 'gitleaks/gitleaks-action@v3', 'github/codeql-action/analyze@v4', 'supplychain:sbom', 'typecheck', 'npm test', 'test:rules', 'npm run build', 'ai:evaluate', 'ai:governance-check', 'preflight:production', 'uat:lifecycle', 'supplychain:provenance', 'production:evidence:generate', 'production:evidence:verify'].every((token) => closure.includes(token)), 'The closure workflow must execute all mandatory dependency/build/security/AI/UAT/evidence gates before final evidence verification.');

const productionWorkflow = text('.github/workflows/production-promotion.yml');
const productionCertificationRunner = text('RUN_OPSIQO_8_5_V7_9_2_PRODUCTION_CERTIFICATION.ps1');

const productionCertificationDelegation =
  productionWorkflow.includes('RUN_OPSIQO_8_5_V7_9_2_PRODUCTION_CERTIFICATION.ps1') &&
  productionCertificationRunner.includes('npm run preflight:production');

add(
  'v3.6.1 production promotion workflow',
  productionWorkflow.includes("OPSIQO_RELEASE_VERSION: '3.6.1'") &&
    productionWorkflow.includes('OPSIQO_PRODUCTION_EVIDENCE_REF') &&
    productionWorkflow.includes('review-lockfile.mjs') &&
    productionCertificationDelegation,
  'Production promotion must identify v3.6.1, require approved evidence references, review the lockfile, and delegate fail-closed production preflight to the production certification runner.',
);
const lockfileBootstrap = text('.github/workflows/lockfile-bootstrap.yml');
add('reviewed lockfile bootstrap workflow', Boolean(lockfileBootstrap) && lockfileBootstrap.includes('GENERATE_LOCKFILE') && lockfileBootstrap.includes('review-lockfile.mjs') && lockfileBootstrap.includes('npm ci --ignore-scripts') && lockfileBootstrap.includes('actions/upload-artifact@v4') && !lockfileBootstrap.includes('git push'), 'Lockfile bootstrap must be explicit, dependency-reviewed and artifact-only; it must not auto-commit or push the generated lockfile.');
add('dependency-free lockfile reviewer', existsSync('scripts/review-lockfile.mjs'), 'The lockfile review script must ship so generated lockfiles can be structurally reviewed before protected production closure.');
add('exact-tree source manifest tool', existsSync('scripts/source-manifest.mjs') && closure.includes('source-manifest.mjs verify'), 'Protected closure must verify an exact release tree, including unexpected/unlisted-file detection.');
add('source manifest self-test', existsSync('scripts/test-source-manifest.mjs') && closure.includes('test-source-manifest.mjs'), 'Exact-tree source manifest verification must have a dependency-free hash/unlisted-file self-test.');
add('lockfile reviewer self-test', existsSync('scripts/test-lockfile-review.mjs') && lockfileBootstrap.includes('test-lockfile-review.mjs'), 'The dependency-free reviewer must ship with a positive/negative fixture self-test executed before lockfile generation.');

const supplyChainWorkflow = text('.github/workflows/software-supply-chain.yml');
add('software supply-chain workflow retained', Boolean(supplyChainWorkflow) && supplyChainWorkflow.includes('npm audit') && supplyChainWorkflow.includes('review-lockfile.mjs') && supplyChainWorkflow.includes('supplychain:sbom') && supplyChainWorkflow.includes('supplychain:provenance'), 'Software supply-chain evidence workflow must remain protected.');

const uat = text('scripts/lifecycle-uat.ts');
add('platform reliability UAT route', uat.includes('/platform-reliability/dashboard'), 'Platform Reliability must remain in integrated UAT.');

if (existsSync('package.json')) {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as any;
  add('release version', pkg.version === '3.6.1', 'package.json must identify 3.6.1.');
  add('node engine', Boolean(pkg.engines?.node), 'Supported Node engine range must be declared.');
  for (const script of ['source:manifest:generate', 'source:manifest:verify', 'source:manifest:test', 'supplychain:lockfile-review', 'supplychain:lockfile-review:test', 'platform:review', 'supplychain:sbom', 'supplychain:provenance', 'security:static-scan', 'cloud:dr:capture', 'cloud:dr:sentinel', 'cloud:dr:exercise:capture', 'production:evidence:generate', 'production:evidence:verify', 'production:evidence:test']) {
    add(`script ${script}`, Boolean(pkg.scripts?.[script]), `${script} must be declared.`);
  }
  console.log(`package.json sha256 prefix: ${createHash('sha256').update(readFileSync('package.json')).digest('hex').slice(0, 12)}`);
}

if (process.env.NODE_ENV === 'production') {
  const readiness = buildReadinessSummary();
  add('production runtime configuration', readiness.ok, 'Production environment must satisfy all fail-closed readiness checks, including v3.6.1 evidence references.');
}

console.log('\nOPSIQO HCM v3.6.1 release gate\n');
for (const gate of gates) console.log(`${gate.pass ? 'PASS' : 'FAIL'}  ${gate.name}: ${gate.detail}`);
const failed = gates.filter((gate) => !gate.pass);
console.log(`\n${gates.length - failed.length}/${gates.length} gates passed; ${failed.length} failure(s).`);
if (failed.length) process.exitCode = 2;
