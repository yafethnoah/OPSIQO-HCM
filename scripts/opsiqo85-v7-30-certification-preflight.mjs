import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const postInstall=process.argv.includes('--post-install');
const root=process.cwd();
const checks=[];
const add=(id,status,detail)=>checks.push({id,status,detail});
const run=(cmd,args=[])=>{const r=spawnSync(cmd,args,{encoding:'utf8',shell:process.platform==='win32'});return{ok:r.status===0,status:r.status,out:String(r.stdout||'').trim(),err:String(r.stderr||'').trim()}};
const exists=p=>fs.existsSync(path.join(root,p));
const major=v=>Number(String(v).replace(/^v/,'').split('.')[0]||0);
const nodeMajor=major(process.version);
add('node-version',nodeMajor>=22&&nodeMajor<24?'pass':'fail',`Node ${process.version}; required >=22 <24`);
const npm=run('npm',['--version']);add('npm-cli',npm.ok?'pass':'fail',npm.ok?`npm ${npm.out}`:'npm is not callable');
add('package-lock',exists('package-lock.json')?'pass':'fail','package-lock.json must be present for npm ci');
add('frozen-manifest',exists('SOURCE_MANIFEST.sha256')?'pass':'fail','SOURCE_MANIFEST.sha256 must be present in the frozen release');
add('clean-release-script',exists('scripts/opsiqo-clean-release-audit.mjs')?'pass':'fail','clean-release audit script present');
add('isolated-emulator-config',exists('firebase.test.json')?'pass':'fail','firebase.test.json must be packaged for authenticated emulator UAT');
try{
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'firebase.test.json'),'utf8'));
 const ports=[cfg.emulators?.firestore?.port,cfg.emulators?.auth?.port,cfg.emulators?.storage?.port];
 add('isolated-emulator-ports',JSON.stringify(ports)===JSON.stringify([8080,9099,9199])?'pass':'fail',`firebase.test.json ports=${ports.join(',')}; expected 8080,9099,9199`);
 const raw=fs.readFileSync(path.join(root,'firebase.test.json'),'utf8');
 add('isolated-emulator-no-production-project',!/opsiqo-hcm-prod-2026/i.test(raw)?'pass':'fail','firebase.test.json must not contain the production project id');
 add('emulator-ui-disabled',cfg.emulators?.ui?.enabled===false?'pass':'warn','Firebase emulator UI should remain disabled during certification');
}catch{add('isolated-emulator-json','fail','firebase.test.json must be valid JSON');}
const runnerPath=path.join(root,'RUN_OPSIQO_ONE_V7_30_VALIDATION.ps1');
if(fs.existsSync(runnerPath)){
 const runner=fs.readFileSync(runnerPath,'utf8');
 add('runner-no-production-deploy',!/(firebase\s+deploy|apphosting:rollouts:create|gcloud\s+(?:run\s+)?deploy)/i.test(runner)?'pass':'fail','certification runner must contain no production deployment command');
 add('runner-demo-project',/--project\s+demo-opsiqo-local/i.test(runner)?'pass':'fail','authenticated emulator runner must pin the demo project id');
 add('runner-isolated-config',/--config\s+firebase\.test\.json/i.test(runner)?'pass':'fail','authenticated emulator runner must use firebase.test.json');
 add('runner-ledger',/v7-30-certification-ledger\.json/i.test(runner)?'pass':'fail','runner must persist a sanitized certification gate ledger');
 add('runner-env-snapshot',/Capture-V730Environment/.test(runner)&&/Restore-V730Environment/.test(runner)?'pass':'fail','runner must snapshot and restore environment variables around browser/emulator UAT');
 add('runner-env-restore-auth',/AuthEnvSnapshot\s*=\s*Capture-V730Environment/.test(runner)&&/Restore-V730Environment \$AuthEnvSnapshot/.test(runner)?'pass':'fail','authenticated UAT must restore the pre-existing shell environment');
 add('runner-env-restore-public',/PublicEnvSnapshot\s*=\s*Capture-V730Environment/.test(runner)&&/Restore-V730Environment \$PublicEnvSnapshot/.test(runner)?'pass':'fail','public browser smoke must restore OPSIQO_A11Y_BASE_URL');
 add('runner-safe-failure-summary',/opsiqo85-v7-30-certification-summary\.mjs/.test(runner)?'pass':'fail','runner must print a dependency-free sanitized summary on failure and completion');
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const missing=[...runner.matchAll(/npm\s+run\s+([A-Za-z0-9:._-]+)/g)].map(m=>m[1]).filter(x=>!pkg.scripts?.[x]);
 add('runner-script-contract',missing.length===0?'pass':'fail',missing.length?`missing package scripts: ${[...new Set(missing)].join(', ')}`:'every npm run command in the runner exists in package.json');
}else add('v7-30-runner','fail','RUN_OPSIQO_ONE_V7_30_VALIDATION.ps1 must be packaged');
try{const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));add('lockfile-root-contract',lock.lockfileVersion===3&&lock.packages?.['']?.name===pkg.name&&lock.packages?.['']?.version===pkg.version?'pass':'fail',`lockfileVersion=${lock.lockfileVersion}; root=${lock.packages?.['']?.name}@${lock.packages?.['']?.version}`)}catch{add('lockfile-root-contract','fail','package-lock.json must be valid and match package.json');}
if(process.platform==='win32')add('windows-path-length',root.length<=160?'pass':'warn',`project path length=${root.length}; use a short extraction path such as D:\opsiqo\v730 when possible`);

const registry=run('npm',['config','get','registry']);
if(registry.ok){try{const u=new URL(registry.out);add('npm-registry-host','pass',`npm registry host=${u.host}`)}catch{add('npm-registry-host','warn','npm registry is configured but could not be parsed safely')}}else add('npm-registry-host','warn','Unable to read npm registry configuration');
if(process.platform==='win32'){add('windows-url-encoded-path',/%[0-9a-f]{2}/i.test(root)?'warn':'pass',/%[0-9a-f]{2}/i.test(root)?'Project path contains URL-encoded fragments such as %28/%29; extract the ZIP to a clean short path before certification.':'Project path contains no URL-encoded fragments.');add('windows-onedrive-path',/onedrive/i.test(root)?'warn':'pass',/onedrive/i.test(root)?'Project is under OneDrive; file synchronization can interfere with npm/build operations. Prefer a local nonsynced path.':'Project is not under a OneDrive path.')}

const browserCandidates=process.platform==='win32'?[process.env.CHROME_PATH,process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Google','Chrome','Application','chrome.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'),process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Google','Chrome','Application','chrome.exe'),process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Microsoft','Edge','Application','msedge.exe')].filter(Boolean):[process.env.CHROME_PATH,'/usr/bin/chromium','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const browser=browserCandidates.find(p=>fs.existsSync(p));add('browser',browser?'pass':'fail',browser?`Browser found: ${path.basename(browser)}`:'Chrome/Chromium/Edge not found; set CHROME_PATH if installed in a non-standard location');

const java=run('java',['-version']);add('java-runtime',java.ok?'pass':'fail',java.ok?'Java runtime available for Firebase emulators':'Java is required for Firestore emulator certification');

async function portFree(port){return await new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});}
for(const p of [8080,9099,9199,31742,31743])add(`port-${p}`,await portFree(p)?'pass':'fail',`127.0.0.1:${p} must be available for isolated certification`);

try{const st=fs.statfsSync(root);const free=Number(st.bavail)*Number(st.bsize);add('disk-space',free>=2*1024**3?'pass':'fail',`${(free/1024**3).toFixed(1)} GiB free; >=2 GiB recommended for npm/build/emulator certification`);}catch{add('disk-space','warn','Unable to calculate free disk space; verify at least 2 GiB manually');}

if(postInstall){
 const firebase=process.platform==='win32'?'node_modules/.bin/firebase.cmd':'node_modules/.bin/firebase';
 const tsc=process.platform==='win32'?'node_modules/.bin/tsc.cmd':'node_modules/.bin/tsc';
 const vitest=process.platform==='win32'?'node_modules/.bin/vitest.cmd':'node_modules/.bin/vitest';
 for(const [id,p] of [['locked-firebase-cli',firebase],['locked-typescript',tsc],['locked-vitest',vitest]])add(id,exists(p)?'pass':'fail',exists(p)?`${p} present`:`${p} missing after npm ci`);
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 add('firebase-version-pinned',pkg.devDependencies?.['firebase-tools']==='15.26.0'?'pass':'fail',`firebase-tools=${pkg.devDependencies?.['firebase-tools']||'missing'}`);
 add('typescript-version-pinned',pkg.devDependencies?.typescript==='7.0.2'?'pass':'fail',`typescript=${pkg.devDependencies?.typescript||'missing'}`);
 add('vitest-version-pinned',pkg.devDependencies?.vitest==='4.1.10'?'pass':'fail',`vitest=${pkg.devDependencies?.vitest||'missing'}`);
}

const failed=checks.filter(x=>x.status==='fail');
for(const c of checks)console.log(`${c.status==='pass'?'PASS':c.status==='warn'?'WARN':'FAIL'} ${c.id} — ${c.detail}`);
console.log(`\nV7.30 certification preflight: ${failed.length?'FAIL':'PASS'} (${checks.filter(x=>x.status==='pass').length}/${checks.length} checks passed${checks.some(x=>x.status==='warn')?', warnings present':''}).`);
console.log('SAFE: no environment secret values are printed; only tool/runtime readiness and local port availability are inspected.');
if(failed.length)process.exit(1);
