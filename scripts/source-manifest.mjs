#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  readdirSync,
  readFileSync,
  lstatSync,
  writeFileSync,
} from 'node:fs';
import {
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';

const command = process.argv[2] || 'verify';

const outputArgIndex = process.argv.indexOf('--output');

const outputName =
  outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? process.argv[outputArgIndex + 1]
    : 'SOURCE_MANIFEST.sha256';

const root = resolve('.');
const outputPath = resolve(outputName);

const excludedDirs = new Set([
  '.git',
  'node_modules',
  '.next',
  'artifacts',
  'coverage',
  '.firebase',
  'dist',
  'build',
]);

const excludedFileNames = new Set([
  '.DS_Store',
  'Thumbs.db',
]);

const excludedFileSuffixes = [
  '.tsbuildinfo',
  '.bak',
  '.log',
];

const toPosix = (value) =>
  value.split(sep).join('/');

const hash = (filePath) =>
  createHash('sha256')
    .update(readFileSync(filePath))
    .digest('hex');

function isLocalEnvironmentFile(name) {
  if (name === '.env') return true;

  if (!name.startsWith('.env.')) {
    return false;
  }

  /*
   * Keep documentation/templates in source control and in the
   * source manifest, but exclude environment-specific secret files.
   */
  return !(
    name.endsWith('.example') ||
    name.endsWith('.sample') ||
    name.endsWith('.template')
  );
}

function isExcludedFile(name) {
  if (excludedFileNames.has(name)) {
    return true;
  }

  if (isLocalEnvironmentFile(name)) {
    return true;
  }

  return excludedFileSuffixes.some((suffix) =>
    name.toLowerCase().endsWith(suffix)
  );
}

function isInsideRoot(absPath) {
  const rel = relative(root, absPath);

  return (
    rel === '' ||
    (
      rel !== '..' &&
      !rel.startsWith(`..${sep}`) &&
      !isAbsolute(rel)
    )
  );
}

function resolveManifestPath(manifestPath) {
  if (
    !manifestPath ||
    manifestPath.includes('\\') ||
    manifestPath.startsWith('/') ||
    /^[A-Za-z]:/.test(manifestPath)
  ) {
    throw new Error(
      `Unsafe manifest path: ${manifestPath}`
    );
  }

  const segments = manifestPath.split('/');

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..'
    )
  ) {
    throw new Error(
      `Unsafe manifest path: ${manifestPath}`
    );
  }

  const abs = resolve(root, ...segments);

  if (!isInsideRoot(abs)) {
    throw new Error(
      `Manifest path escapes project root: ${manifestPath}`
    );
  }

  return abs;
}

function assertOutputIsSafe() {
  if (
    existsSync(outputPath) &&
    lstatSync(outputPath).isSymbolicLink()
  ) {
    throw new Error(
      `Manifest output must not be a symbolic link: ${outputName}`
    );
  }
}

function releaseFiles() {
  const files = [];

  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = resolve(dir, name);

      /*
       * Check symlink status before directory/file exclusion so an
       * excluded name cannot hide a symbolic link.
       */
      const st = lstatSync(abs);

      if (st.isSymbolicLink()) {
        throw new Error(
          `Symbolic links are not permitted in the release source tree: ${toPosix(
            relative(root, abs),
          )}`
        );
      }

      if (st.isDirectory()) {
        if (excludedDirs.has(name)) {
          continue;
        }

        walk(abs);
        continue;
      }

      if (!st.isFile()) {
        continue;
      }

      if (abs === outputPath) {
        continue;
      }

      if (isExcludedFile(name)) {
        continue;
      }

      files.push(abs);
    }
  };

  walk(root);

  return files.sort((a, b) =>
    toPosix(relative(root, a)).localeCompare(
      toPosix(relative(root, b)),
    )
  );
}

assertOutputIsSafe();

if (command === 'generate') {
  const files = releaseFiles();

  const lines = files.map(
    (abs) =>
      `${hash(abs)}  ${toPosix(relative(root, abs))}`
  );

  writeFileSync(
    outputPath,
    `${lines.join('\n')}\n`,
  );

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        operation: 'generate',
        entries: files.length,
        output: toPosix(
          relative(root, outputPath),
        ),
      },
      null,
      2,
    ),
  );

  process.exit();
}

if (command !== 'verify') {
  console.error(
    'Usage: node scripts/source-manifest.mjs generate|verify [--output SOURCE_MANIFEST.sha256]',
  );
  process.exit(2);
}

if (!existsSync(outputPath)) {
  console.error(
    `FAIL Missing ${toPosix(
      relative(root, outputPath),
    )}`,
  );
  process.exit(2);
}

const expected = new Map();

for (
  const raw of readFileSync(outputPath, 'utf8').split(
    /\r?\n/,
  )
) {
  if (!raw.trim()) {
    continue;
  }

  const match = raw.match(
    /^([a-f0-9]{64})  (.+)$/i,
  );

  if (!match) {
    console.error(
      `FAIL Malformed manifest line: ${raw}`,
    );
    process.exit(2);
  }

  const manifestPath = match[2];

  try {
    resolveManifestPath(manifestPath);
  } catch (error) {
    console.error(
      `FAIL ${
        error instanceof Error
          ? error.message
          : 'Unsafe manifest path'
      }`,
    );
    process.exit(2);
  }

  if (expected.has(manifestPath)) {
    console.error(
      `FAIL Duplicate manifest path: ${manifestPath}`,
    );
    process.exit(2);
  }

  expected.set(
    manifestPath,
    match[1].toLowerCase(),
  );
}

const actualFiles = releaseFiles();

const actualPaths = new Set(
  actualFiles.map((abs) =>
    toPosix(relative(root, abs)),
  ),
);

const errors = [];

for (const [manifestPath, digest] of expected) {
  let abs;

  try {
    abs = resolveManifestPath(manifestPath);
  } catch {
    errors.push(`unsafe:${manifestPath}`);
    continue;
  }

  if (!existsSync(abs)) {
    errors.push(`missing:${manifestPath}`);
    continue;
  }

  const actual = hash(abs);

  if (actual !== digest) {
    errors.push(`hash:${manifestPath}`);
  }
}

for (const manifestPath of actualPaths) {
  if (!expected.has(manifestPath)) {
    errors.push(`unlisted:${manifestPath}`);
  }
}

for (const manifestPath of expected.keys()) {
  if (!actualPaths.has(manifestPath)) {
    errors.push(`stale:${manifestPath}`);
  }
}

console.log(
  JSON.stringify(
    {
      status: errors.length
        ? 'FAIL'
        : 'PASS',
      operation: 'verify',
      expectedEntries: expected.size,
      actualEntries: actualPaths.size,
      errors: errors.slice(0, 50),
      errorCount: errors.length,
    },
    null,
    2,
  ),
);

if (errors.length) {
  process.exitCode = 2;
}