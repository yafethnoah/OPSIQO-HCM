import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');

const patterns = [
  ['client-firestore', /firebase\/firestore/],
  ['admin-firestore', /firebase-admin\/firestore/],
  ['getFirestore', /\bgetFirestore\s*\(/],
  ['setDoc', /\bsetDoc\s*\(/],
  ['updateDoc', /\bupdateDoc\s*\(/],
  ['addDoc', /\baddDoc\s*\(/],
  ['deleteDoc', /\bdeleteDoc\s*\(/],
  ['runTransaction', /\brunTransaction\s*\(/],
  ['writeBatch', /\bwriteBatch\s*\(/],
];

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      output.push(full);
    }
  }
  return output;
}

const matches = [];

if (fs.existsSync(src)) {
  for (const full of walk(src)) {
    const relative = path.relative(root, full).replaceAll('\\', '/');

    if (relative.startsWith('src/lib/strategic/')) continue;

    const text = fs.readFileSync(full, 'utf8');
    const signals = patterns
      .filter(([, pattern]) => pattern.test(text))
      .map(([name]) => name);

    if (signals.length > 0) {
      matches.push({ relative, signals });
    }
  }
}

matches.sort((a, b) => a.relative.localeCompare(b.relative));

console.log('');
console.log('H49 AUTHORITATIVE WRITE-SURFACE DISCOVERY');
console.log('Only relative paths and pattern names are printed. No source values are printed.');
console.log(`Candidates: ${matches.length}`);

const limit = 120;
for (const item of matches.slice(0, limit)) {
  console.log(` - ${item.relative} [${item.signals.join(', ')}]`);
}

if (matches.length > limit) {
  console.log(` - ... ${matches.length - limit} additional candidates not printed`);
}

console.log('');
console.log('DISCOVERY COMPLETE - this is an inventory, not proof of domain integration.');
