#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const fail = (message) => { console.error(`FAIL ${message}`); process.exitCode = 2; };
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const packagePath = resolve(arg('--package', 'package.json'));
const lockPath = resolve(arg('--lockfile', 'package-lock.json'));
const artifactPath = arg('--artifact', '');

if (!existsSync(packagePath)) { fail(`Missing ${packagePath}`); process.exit(); }
if (!existsSync(lockPath)) { fail(`Missing ${lockPath}. Generate it in the approved network-enabled workflow.`); process.exit(); }

const packageBytes = readFileSync(packagePath);
const lockBytes = readFileSync(lockPath);
const pkg = JSON.parse(packageBytes.toString('utf8'));
const lock = JSON.parse(lockBytes.toString('utf8'));
const errors = [];
const warnings = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

check(Number(lock.lockfileVersion) === 3, `lockfileVersion must be 3; found ${String(lock.lockfileVersion)}`);
check(lock.name === pkg.name, `lockfile root name ${lock.name ?? '(missing)'} must match package.json ${pkg.name}`);
check(lock.version === pkg.version, `lockfile root version ${lock.version ?? '(missing)'} must match package.json ${pkg.version}`);
check(lock.packages && typeof lock.packages === 'object', 'lockfile packages map is required');
const rootEntry = lock.packages?.[''];
check(Boolean(rootEntry), 'lockfile packages[""] root entry is required');
if (rootEntry) {
  check(rootEntry.name === pkg.name, `packages[""] name must match ${pkg.name}`);
  check(rootEntry.version === pkg.version, `packages[""] version must match ${pkg.version}`);
}

const categories = ['dependencies','devDependencies','optionalDependencies','peerDependencies'];
const direct = [];
for (const category of categories) {
  const expected = pkg[category] || {};
  const lockedRoot = rootEntry?.[category] || {};
  const expectedNames = Object.keys(expected).sort();
  const lockedNames = Object.keys(lockedRoot).sort();
  check(JSON.stringify(lockedNames) === JSON.stringify(expectedNames), `${category} root dependency names must exactly match package.json`);
  for (const [name, spec] of Object.entries(expected)) {
    const exact = /^\d+\.\d+\.\d+(?:[-+].+)?$/.test(String(spec));
    check(exact, `${category}.${name} must use an exact version for production lockfile bootstrap; found ${spec}`);
    check(lockedRoot[name] === spec, `${category}.${name} root spec mismatch: package.json=${spec}; lockfile=${lockedRoot[name] ?? '(missing)'}`);
    const entry = lock.packages?.[`node_modules/${name}`];
    check(Boolean(entry), `direct package node_modules/${name} missing from lockfile`);
    if (entry) {
      if (exact) check(entry.version === spec, `${name} locked version ${entry.version ?? '(missing)'} must equal exact package.json version ${spec}`);
      check(Boolean(entry.integrity), `${name} direct lockfile entry must contain integrity metadata`);
      check(/^https:\/\//i.test(String(entry.resolved || '')), `${name} direct lockfile entry must resolve over HTTPS`);
      direct.push({ category, name, spec, lockedVersion: entry.version || null, integrity: Boolean(entry.integrity), resolved: entry.resolved || null });
    }
  }
}

const packageEntries = Object.entries(lock.packages || {}).filter(([path]) => path !== '');
let integrityCount = 0;
let resolvedHttpsCount = 0;
let registryEntryCount = 0;
let localOrGitCount = 0;
for (const [path, entryRaw] of packageEntries) {
  const entry = entryRaw || {};
  if (entry.link) continue;
  const resolved = String(entry.resolved || '');
  if (entry.integrity) integrityCount++;
  if (resolved.startsWith('https://')) resolvedHttpsCount++;
  if (/^https:\/\/registry\.npmjs\.org\//.test(resolved)) registryEntryCount++;
  if (/^(?:file:|git\+|github:|https?:\/\/github\.com\/.*\.git)/i.test(resolved)) localOrGitCount++;
  if (resolved.startsWith('http://')) errors.push(`${path} uses insecure HTTP resolved URL`);
  if (/^(?:file:|link:)/i.test(resolved)) errors.push(`${path} uses local file/link dependency in production lockfile`);
}

const integrityCoverage = packageEntries.length ? integrityCount / packageEntries.length : 0;
if (integrityCoverage < 0.95) warnings.push(`Integrity coverage is ${(integrityCoverage*100).toFixed(1)}%; investigate non-registry/linked entries before approval.`);
if (localOrGitCount > 0) warnings.push(`${localOrGitCount} package entries use git/local-style resolution; independently review before approval.`);

let npmVersion = null;
try { npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(); } catch {}

const review = {
  schema: 'opsiqo.lockfile-review.v1',
  reviewedAt: new Date().toISOString(),
  nodeVersion: process.version,
  npmVersion,
  npmUserAgent: process.env.npm_config_user_agent || null,
  package: { name: pkg.name, version: pkg.version, sha256: sha256(packageBytes) },
  lockfile: { path: lockPath, lockfileVersion: lock.lockfileVersion, sha256: sha256(lockBytes) },
  summary: {
    packageEntries: packageEntries.length,
    directDependencies: direct.length,
    integrityEntries: integrityCount,
    integrityCoverage: Number(integrityCoverage.toFixed(6)),
    httpsResolvedEntries: resolvedHttpsCount,
    npmRegistryEntries: registryEntryCount,
    localOrGitEntries: localOrGitCount,
    errors: errors.length,
    warnings: warnings.length,
  },
  directDependencies: direct,
  errors,
  warnings,
  readyForHumanReview: errors.length === 0,
  decisionBoundary: 'This report validates lockfile structure, root dependency alignment and basic resolution/integrity evidence. It does not prove packages are vulnerability-free, trustworthy, buildable, or suitable for production; protected CI must still run npm ci, audit, tests, Rules tests and build.',
};

if (artifactPath) {
  const out = resolve(artifactPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(review, null, 2) + '\n');
}

console.log(`OPSIQO lockfile review ${review.readyForHumanReview ? 'PASS' : 'FAIL'}`);
console.log(`package: ${pkg.name}@${pkg.version}`);
console.log(`lockfile sha256: ${review.lockfile.sha256}`);
console.log(`package entries: ${review.summary.packageEntries}`);
console.log(`integrity coverage: ${(integrityCoverage * 100).toFixed(1)}%`);
for (const message of warnings) console.log(`WARN ${message}`);
for (const message of errors) console.error(`FAIL ${message}`);
if (errors.length) process.exitCode = 2;
