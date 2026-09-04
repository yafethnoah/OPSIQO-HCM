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

const browserCandidates=process.platform==='win32'?[process.env.CHROME_PATH,process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Google','Chrome','Application','chrome.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'),process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Google','Chrome','Application','chrome.exe'),process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Microsoft','Edge','Application','msedge.exe')].filter(Boolean):[process.env.CHROME_PATH,'/usr/bin/chromium','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const browser=browserCandidates.find(p=>fs.existsSync(p));add('browser',browser?'pass':'fail',browser?`Browser found: ${path.basename(browser)}`:'Chrome/Chromium/Edge not found; set CHROME_PATH if installed in a non-standard location');

const java=run('java',['-version']);add('java-runtime',java.ok?'pass':'fail',java.ok?'Java runtime available for Firebase emulators':'Java is required for Firestore emulator certification');

async function portFree(port){return await new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});}
for(const p of [8080,9099,9199,31726,31727])add(`port-${p}`,await portFree(p)?'pass':'fail',`127.0.0.1:${p} must be available for isolated certification`);

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
console.log(`\nV7.24 certification preflight: ${failed.length?'FAIL':'PASS'} (${checks.filter(x=>x.status==='pass').length}/${checks.length} checks passed${checks.some(x=>x.status==='warn')?', warnings present':''}).`);
console.log('SAFE: no environment secret values are printed; only tool/runtime readiness and local port availability are inspected.');
if(failed.length)process.exit(1);
