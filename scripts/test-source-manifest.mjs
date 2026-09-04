#!/usr/bin/env node

import {
  cpSync,
  mkdtempSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve('.');
const dir = mkdtempSync(
  join(tmpdir(), 'opsiqo-manifest-test-'),
);
const script = join(dir, 'source-manifest.mjs');

function run(...args) {
  return spawnSync(
    process.execPath,
    [script, ...args],
    {
      cwd: dir,
      encoding: 'utf8',
    },
  );
}

function output(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

function assertStatus(result, expected, label) {
  if (result.status !== expected) {
    throw new Error(
      `${label} returned ${result.status}; expected ${expected}\n${output(result)}`,
    );
  }
}

function assertIncludes(result, value, label) {
  if (!output(result).includes(value)) {
    throw new Error(
      `${label} did not contain ${value}\n${output(result)}`,
    );
  }
}

const lfText = 'alpha\nbeta\ngamma\n';
const crlfText = 'alpha\r\nbeta\r\ngamma\r\n';
const mixedText = 'alpha\r\nbeta\ngamma\r\n';

const binaryBaseline = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x00,
  0xff,
]);

try {
  cpSync(
    join(root, 'scripts', 'source-manifest.mjs'),
    script,
  );

  const textPath = join(dir, 'a.txt');
  const binaryPath = join(dir, 'fixture.png');

  writeFileSync(textPath, lfText, 'utf8');
  writeFileSync(binaryPath, binaryBaseline);

  const generated = run('generate');
  assertStatus(
    generated,
    0,
    'baseline generate',
  );

  const verified = run('verify');
  assertStatus(
    verified,
    0,
    'baseline verify',
  );

  /*
   * Cross-platform text portability:
   * LF, CRLF and mixed LF/CRLF represent the same canonical source.
   */
  writeFileSync(textPath, crlfText, 'utf8');

  const crlfVerified = run('verify');
  assertStatus(
    crlfVerified,
    0,
    'CRLF portability verify',
  );

  writeFileSync(textPath, mixedText, 'utf8');

  const mixedVerified = run('verify');
  assertStatus(
    mixedVerified,
    0,
    'mixed-EOL portability verify',
  );

  /*
   * A real text change must still fail.
   */
  writeFileSync(
    textPath,
    'alpha\nBETA\ngamma\n',
    'utf8',
  );

  const textTampered = run('verify');
  assertStatus(
    textTampered,
    2,
    'text tamper verify',
  );
  assertIncludes(
    textTampered,
    'hash:a.txt',
    'text tamper verify',
  );

  writeFileSync(textPath, lfText, 'utf8');

  /*
   * Binary bytes are never EOL-normalized.
   * Changing only one byte in a binary file must fail.
   */
  const binaryTampered = Buffer.from(
    binaryBaseline,
  );
  binaryTampered[5] = 0x0b;

  writeFileSync(
    binaryPath,
    binaryTampered,
  );

  const binaryVerify = run('verify');
  assertStatus(
    binaryVerify,
    2,
    'binary tamper verify',
  );
  assertIncludes(
    binaryVerify,
    'hash:fixture.png',
    'binary tamper verify',
  );

  writeFileSync(
    binaryPath,
    binaryBaseline,
  );

  /*
   * Added/unlisted source must fail.
   */
  const extraPath = join(dir, 'extra.txt');

  writeFileSync(
    extraPath,
    'extra\n',
    'utf8',
  );

  const extra = run('verify');
  assertStatus(
    extra,
    2,
    'unlisted file verify',
  );
  assertIncludes(
    extra,
    'unlisted:extra.txt',
    'unlisted file verify',
  );

  unlinkSync(extraPath);

  /*
   * Deleted source must fail.
   */
  unlinkSync(textPath);

  const missing = run('verify');
  assertStatus(
    missing,
    2,
    'missing file verify',
  );
  assertIncludes(
    missing,
    'missing:a.txt',
    'missing file verify',
  );

  writeFileSync(textPath, lfText, 'utf8');

  /*
   * Path/rename changes must fail even when bytes are unchanged.
   */
  const renamedPath = join(
    dir,
    'renamed.txt',
  );

  renameSync(
    textPath,
    renamedPath,
  );

  const renamed = run('verify');
  assertStatus(
    renamed,
    2,
    'rename verify',
  );
  assertIncludes(
    renamed,
    'missing:a.txt',
    'rename verify',
  );
  assertIncludes(
    renamed,
    'unlisted:renamed.txt',
    'rename verify',
  );

  renameSync(
    renamedPath,
    textPath,
  );

  const finalVerify = run('verify');
  assertStatus(
    finalVerify,
    0,
    'final verify',
  );

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        baseline: 'verified',
        lfCrlfEquivalent: true,
        mixedEolEquivalent: true,
        textTamper: 'rejected',
        binaryTamper: 'rejected',
        unlistedFile: 'rejected',
        missingFile: 'rejected',
        rename: 'rejected',
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(
    dir,
    {
      recursive: true,
      force: true,
    },
  );
}
