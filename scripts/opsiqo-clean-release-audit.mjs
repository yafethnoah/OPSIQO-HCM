import { existsSync, readdirSync, lstatSync, readFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const root = resolve('.');
const allowCertificationLocalEnvOverlay = process.argv.includes('--certification-local-env-overlay');
const allowedCertificationOverlay = '.env.local';
const forbiddenDirs = new Set(['node_modules','.next','.git','.firebase','coverage','dist','build','artifacts']);
const forbiddenRootFiles = ['.env','.env.local','firebase-debug.log','firestore-debug.log'];
const findings = [];
const excludedLocalOverlays = [];

function isAllowedCertificationOverlay(rel, name) {
  return allowCertificationLocalEnvOverlay && rel === allowedCertificationOverlay && name === allowedCertificationOverlay;
}

for (const name of forbiddenRootFiles) {
  const abs = resolve(root,name);
  if (!existsSync(abs)) continue;
  const st = lstatSync(abs);
  if (name === allowedCertificationOverlay && allowCertificationLocalEnvOverlay && st.isFile() && !st.isSymbolicLink()) {
    excludedLocalOverlays.push(name);
    continue;
  }
  findings.push(`forbidden:${name}`);
}

function walk(dir){
  for(const name of readdirSync(dir)){
    const abs=resolve(dir,name); const rel=relative(root,abs).split(sep).join('/'); const st=lstatSync(abs);
    if(st.isSymbolicLink()){ findings.push(`symlink:${rel}`); continue; }
    if(st.isDirectory()){
      if(forbiddenDirs.has(name)){ findings.push(`forbidden-dir:${rel}`); continue; }
      walk(abs); continue;
    }
    if(!st.isFile()) continue;
    if(/^\.env\.(?!example$|sample$|template$)/.test(name) && !isAllowedCertificationOverlay(rel,name)) findings.push(`environment-file:${rel}`);
    if(/\.(?:tsbuildinfo|bak|log|tmp)$/i.test(name)) findings.push(`transient-file:${rel}`);
    if(/(?:^|\/)(?:gha-creds-.*\.json)$/.test(rel)) findings.push(`credential-artifact:${rel}`);
  }
}
walk(root);

const attrs=existsSync(resolve(root,'.gitattributes'))?readFileSync(resolve(root,'.gitattributes'),'utf8'):'';
if(!attrs.includes('* text=auto eol=lf')) findings.push('gitattributes:missing-lf-policy');

const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
if(pkg.engines?.node !== '>=22 <24') findings.push('node-engine:not->=22-<24');
if(pkg.scripts?.['test:rules'] !== 'node scripts/run-firestore-rules-isolated.mjs') findings.push('rules-runner:not-isolated');
if(pkg.scripts?.['preflight:production'] !== 'node scripts/run-production-preflight.mjs') findings.push('preflight-runner:not-production-safe');

console.log(JSON.stringify({
  status:findings.length?'FAIL':'PASS',
  findings,
  certificationLocalEnvironmentOverlay:{
    enabled:allowCertificationLocalEnvOverlay,
    excluded:excludedLocalOverlays,
    boundary:'Certification-only exception for root .env.local. Contents are not read, copied, hashed or printed. Strict release audit still rejects local environment files.'
  }
},null,2));
if(findings.length) process.exit(1);
