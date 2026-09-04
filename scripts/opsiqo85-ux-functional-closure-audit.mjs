#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const pass = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    errors.push(`Missing required file: ${rel}`);
    return '';
  }
  return fs.readFileSync(p, 'utf8');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.next','.git','coverage','artifacts'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const nav = read('src/components/nav.tsx');
const shell = read('src/components/app-shell.tsx');
const home = read('src/app/home/page.tsx');

if (nav.includes('navFinderInput') && nav.includes('Find')) pass.push('Permission-aware navigation finder present');
else errors.push('Navigation finder is missing');

if (nav.includes("area:'more'") && nav.includes("area:'admin'")) pass.push('Advanced/admin destinations are grouped away from daily navigation');
else errors.push('Advanced/admin grouping is missing');

if (nav.includes("href:'/home'") && nav.includes("aria-current={active?'page':undefined}")) pass.push('Home-first navigation and active-page accessibility present');
else errors.push('Home-first or aria-current behavior missing');

if (shell.includes('href="#main-content"') && shell.includes('id="main-content"')) pass.push('Skip-link/main-landmark keyboard navigation present');
else errors.push('Skip-link/main-landmark contract missing');

if (!home) errors.push('Home route missing');
else pass.push('Home route present');

const hrefs = [...nav.matchAll(/href:'(\/[^']+)'/g)].map(m=>m[1]);
const unique = new Set();
for (const href of hrefs) {
  if (unique.has(href)) errors.push(`Duplicate navigation route: ${href}`);
  unique.add(href);
  const relative = href.replace(/^\//,'');
  const direct = path.join(root,'src','app',relative,'page.tsx');
  const directJs = path.join(root,'src','app',relative,'page.js');
  if (!fs.existsSync(direct) && !fs.existsSync(directJs)) {
    errors.push(`Navigation route has no page: ${href}`);
  }
}
if (hrefs.length) pass.push(`Navigation route inventory checked: ${hrefs.length} destinations`);

const sourceFiles = walk(path.join(root,'src')).filter(p=>/\.(tsx?|jsx?)$/.test(p));

const literalApiPaths = new Set();
for (const file of sourceFiles) {
  const text = fs.readFileSync(file,'utf8');
  for (const match of text.matchAll(/(?:apiFetch|fetch)\s*(?:<[^\n;]{0,120}>)?\s*\(\s*['"]((?:\/api\/)[^'"?#]+)(?:[?#][^'"]*)?['"]/g)) {
    literalApiPaths.add(match[1]);
  }
}
for (const apiPath of [...literalApiPaths].sort()) {
  const relative = apiPath.replace(/^\/api\//,'');
  const routeTs = path.join(root,'src','app','api',relative,'route.ts');
  const routeJs = path.join(root,'src','app','api',relative,'route.js');
  if (!fs.existsSync(routeTs) && !fs.existsSync(routeJs)) {
    errors.push(`Literal API call has no route handler: ${apiPath}`);
  }
}
if (literalApiPaths.size) pass.push(`Literal API wiring checked: ${literalApiPaths.size} endpoints`);

const suspectPatterns = [
  { re:/href\s*=\s*["']#["']/g, label:'dead href="#"' },
  { re:/javascript:void\s*\(/g, label:'javascript:void control' },
  { re:/throw new Error\(\s*["'][^"']*not implemented/ig, label:'not-implemented error' },
  { re:/\bCOMING SOON\b/ig, label:'COMING SOON placeholder' },
];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file,'utf8');
  const rel = path.relative(root,file).replaceAll('\\','/');
  for (const {re,label} of suspectPatterns) {
    re.lastIndex = 0;
    if (re.test(text)) warnings.push(`${label}: ${rel}`);
  }
}

const requiredScripts = [
  'scripts/opsiqo85-ux-functional-closure-audit.mjs',
  'src/components/nav.tsx',
  'src/components/app-shell.tsx',
];
for (const rel of requiredScripts) {
  if (!fs.existsSync(path.join(root,rel))) errors.push(`Closure artifact missing: ${rel}`);
}

console.log('OPSIQO 8.5 UX + Functional Closure Audit');
console.log('=========================================');
for (const item of pass) console.log(`PASS  ${item}`);
for (const item of warnings) console.log(`WARN  ${item}`);
for (const item of errors) console.log(`FAIL  ${item}`);
console.log('');
console.log(`PASS: ${pass.length} | WARN: ${warnings.length} | FAIL: ${errors.length}`);

if (errors.length) process.exit(1);
