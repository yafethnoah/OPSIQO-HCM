#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, lstatSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const command = process.argv[2] || 'verify';
const outputArgIndex = process.argv.indexOf('--output');
const outputName = outputArgIndex >= 0 && process.argv[outputArgIndex + 1] ? process.argv[outputArgIndex + 1] : 'SOURCE_MANIFEST.sha256';
const root = resolve('.');
const outputPath = resolve(outputName);
const excludedDirs = new Set(['.git','node_modules','.next','artifacts','coverage','.firebase','dist','build']);
const toPosix = (p) => p.split(sep).join('/');
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function releaseFiles() {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (excludedDirs.has(name)) continue;
      const abs = resolve(dir, name);
      if (abs === outputPath) continue;
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) throw new Error(`Symbolic links are not permitted in the release source tree: ${toPosix(relative(root, abs))}`);
      if (st.isDirectory()) walk(abs);
      else if (st.isFile()) files.push(abs);
    }
  };
  walk(root);
  return files.sort((a,b)=>toPosix(relative(root,a)).localeCompare(toPosix(relative(root,b))));
}

if (command === 'generate') {
  const files = releaseFiles();
  const lines = files.map((abs) => `${hash(abs)}  ${toPosix(relative(root, abs))}`);
  writeFileSync(outputPath, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({ status:'PASS', operation:'generate', entries:files.length, output:toPosix(relative(root,outputPath)) }, null, 2));
  process.exit();
}

if (command !== 'verify') {
  console.error('Usage: node scripts/source-manifest.mjs generate|verify [--output SOURCE_MANIFEST.sha256]');
  process.exit(2);
}
if (!existsSync(outputPath)) {
  console.error(`FAIL Missing ${toPosix(relative(root,outputPath))}`);
  process.exit(2);
}
const expected = new Map();
for (const raw of readFileSync(outputPath,'utf8').split(/\r?\n/)) {
  if (!raw.trim()) continue;
  const m = raw.match(/^([a-f0-9]{64})  (.+)$/i);
  if (!m) { console.error(`FAIL Malformed manifest line: ${raw}`); process.exit(2); }
  expected.set(m[2], m[1].toLowerCase());
}
const actualFiles = releaseFiles();
const actualPaths = new Set(actualFiles.map((abs)=>toPosix(relative(root,abs))));
const errors=[];
for (const [path, digest] of expected) {
  const abs=resolve(root,path);
  if (!existsSync(abs)) { errors.push(`missing:${path}`); continue; }
  const actual=hash(abs); if(actual!==digest) errors.push(`hash:${path}`);
}
for (const path of actualPaths) if(!expected.has(path)) errors.push(`unlisted:${path}`);
for (const path of expected.keys()) if(!actualPaths.has(path)) errors.push(`stale:${path}`);
console.log(JSON.stringify({status:errors.length?'FAIL':'PASS',operation:'verify',expectedEntries:expected.size,actualEntries:actualPaths.size,errors:errors.slice(0,50),errorCount:errors.length},null,2));
if(errors.length) process.exitCode=2;
