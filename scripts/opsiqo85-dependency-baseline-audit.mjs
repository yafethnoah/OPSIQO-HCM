#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pkgPath = resolve(root, 'package.json');
const lockPath = resolve(root, 'package-lock.json');
const requireInstalled = process.argv.includes('--installed');

const expected = {
  dependencies: {
    firebase: '12.16.0',
    'firebase-admin': '14.2.0',
    next: '16.3.0',
    react: '19.2.8',
    'react-dom': '19.2.8',
    zod: '4.4.3',
  },
  devDependencies: {
    '@firebase/rules-unit-testing': '5.0.1',
    '@types/node': '26.1.1',
    '@types/react': '19.2.17',
    '@types/react-dom': '19.2.3',
    'firebase-tools': '15.26.0',
    tsx: '4.23.1',
    typescript: '7.0.2',
    vitest: '4.1.10',
  },
};

const fail = [];
const pass = [];
function check(condition, ok, bad = ok) {
  if (condition) pass.push(ok);
  else fail.push(bad);
}

check(existsSync(pkgPath), 'package.json exists', 'package.json is missing');
check(existsSync(lockPath), 'package-lock.json exists', 'package-lock.json is missing');
if (fail.length) {
  for (const m of fail) console.error(`FAIL  ${m}`);
  process.exit(2);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const lockRoot = lock.packages?.[''] || {};

for (const [section, deps] of Object.entries(expected)) {
  for (const [name, version] of Object.entries(deps)) {
    check(pkg?.[section]?.[name] === version,
      `${section}.${name}=${version}`,
      `${section}.${name} must remain pinned at ${version}; found ${pkg?.[section]?.[name] ?? '(missing)'}`);
    check(lockRoot?.[section]?.[name] === version,
      `lock root ${section}.${name}=${version}`,
      `package-lock root ${section}.${name} must be ${version}; found ${lockRoot?.[section]?.[name] ?? '(missing)'}`);
    check(lock.packages?.[`node_modules/${name}`]?.version === version,
      `lock node_modules/${name}=${version}`,
      `package-lock node_modules/${name} must resolve to ${version}; found ${lock.packages?.[`node_modules/${name}`]?.version ?? '(missing)'}`);

    if (requireInstalled) {
      const installedPath = resolve(root, 'node_modules', name, 'package.json');
      check(existsSync(installedPath),
        `installed ${name} exists`,
        `installed ${name} is missing; run npm ci`);
      if (existsSync(installedPath)) {
        const installed = JSON.parse(readFileSync(installedPath, 'utf8'));
        check(installed.version === version,
          `installed ${name}=${version}`,
          `installed ${name} must be ${version}; found ${installed.version ?? '(missing)'}`);
      }
    }
  }
}

for (const m of pass) console.log(`PASS  ${m}`);
for (const m of fail) console.error(`FAIL  ${m}`);

if (fail.length) {
  console.error('\nDependency baseline drift detected.');
  console.error('Do NOT run npm audit fix --force on this release candidate. It can rewrite pinned Firebase/Admin/CLI versions and invalidate the tested API surface.');
  console.error('Restore package.json and package-lock.json from the signed release package, then run npm ci.');
  process.exit(2);
}

console.log(JSON.stringify({ status: 'PASS', checks: pass.length, installedChecked: requireInstalled }, null, 2));
