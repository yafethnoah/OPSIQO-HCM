#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const tsxCli = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const preflight = resolve(scriptDir, 'production-preflight.ts');

if (!existsSync(tsxCli)) {
  console.error('Production preflight runner could not locate the reviewed tsx CLI. Run `npm ci` first.');
  process.exit(2);
}

const result = spawnSync(
  process.execPath,
  [tsxCli, preflight],
  {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit',
    shell: false,
  },
);

if (result.error) {
  console.error('Production preflight runner failed to start.');
  console.error(result.error);
  process.exit(1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
