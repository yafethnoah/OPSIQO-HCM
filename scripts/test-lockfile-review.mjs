#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve('.');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'opsiqo-lock-review-'));
try {
  const packagePath = join(dir, 'package.json');
  const lockPath = join(dir, 'package-lock.json');
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  const rootEntry = { name: pkg.name, version: pkg.version, dependencies: pkg.dependencies, devDependencies: pkg.devDependencies };
  const packages = { '': rootEntry };
  for (const group of ['dependencies', 'devDependencies']) {
    for (const [name, version] of Object.entries(pkg[group] || {})) {
      packages[`node_modules/${name}`] = {
        version,
        resolved: `https://registry.npmjs.org/${encodeURIComponent(name)}/-/${name.split('/').pop()}-${version}.tgz`,
        integrity: `sha512-${Buffer.from(`fixture:${name}`).toString('base64')}`,
      };
    }
  }
  writeFileSync(lockPath, JSON.stringify({ name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages }, null, 2));
  const reviewer = join(root, 'scripts', 'review-lockfile.mjs');
  const good = spawnSync(process.execPath, [reviewer, '--package', packagePath, '--lockfile', lockPath], { encoding: 'utf8' });
  if (good.status !== 0) throw new Error(`Expected aligned fixture to pass.\n${good.stdout}\n${good.stderr}`);

  const bad = JSON.parse(readFileSync(lockPath, 'utf8'));
  bad.packages['node_modules/next'].version = '0.0.0';
  const badPath = join(dir, 'bad-package-lock.json');
  writeFileSync(badPath, JSON.stringify(bad, null, 2));
  const mismatch = spawnSync(process.execPath, [reviewer, '--package', packagePath, '--lockfile', badPath], { encoding: 'utf8' });
  if (mismatch.status !== 2) throw new Error(`Expected mismatched fixture to fail with exit 2. Got ${mismatch.status}.`);
  if (!`${mismatch.stdout}\n${mismatch.stderr}`.includes('next locked version 0.0.0')) throw new Error('Mismatch reason was not surfaced.');
  console.log(JSON.stringify({ status: 'PASS', alignedFixture: 'accepted', directVersionMismatch: 'rejected' }, null, 2));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
