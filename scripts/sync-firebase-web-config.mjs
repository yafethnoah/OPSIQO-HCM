import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
function arg(name) { const i=process.argv.indexOf(name); return i>=0 ? String(process.argv[i+1]||'').trim() : ''; }
function parseEnv(text) { const out=new Map(); const order=[]; for (const raw of text.split(/\r?\n/)) { const m=raw.trimEnd().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if(m){ if(!out.has(m[1])) order.push(m[1]); out.set(m[1],m[2]); } } return {out,order}; }
function placeholder(v) { const s=String(v||'').trim(); return !s || /^(?:PASTE|YOUR|CHANGE_ME|CHANGEME|REPLACE|TODO|TBD|EXAMPLE|<|__)/i.test(s) || /(?:_HERE|HERE>|PLACEHOLDER)/i.test(s); }
const projectId=arg('--project')||process.env.FIREBASE_PROJECT_ID||process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const appId=arg('--app')||process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
if(!projectId||!appId){ console.error('Usage: node scripts/sync-firebase-web-config.mjs --project <firebase-project-id> --app <firebase-web-app-id>'); process.exit(2); }
const firebaseCli=resolve('node_modules/firebase-tools/lib/bin/firebase.js');
if(!existsSync(firebaseCli)){ console.error('firebase-tools is not installed. Run npm ci from the reviewed lockfile first.'); process.exit(2); }
const run=spawnSync(process.execPath,[firebaseCli,'apps:sdkconfig','WEB',appId,'--project',projectId],{encoding:'utf8',shell:false,env:process.env});
if(run.status!==0){ process.stderr.write(run.stderr||run.stdout||'Firebase CLI failed.\n'); process.exit(run.status||1); }
const output=`${run.stdout||''}\n${run.stderr||''}`; const start=output.indexOf('{'); const end=output.lastIndexOf('}');
if(start<0||end<=start){ console.error('Could not locate Firebase Web config JSON in Firebase CLI output.'); process.exit(2); }
let cfg; try{ cfg=JSON.parse(output.slice(start,end+1)); }catch(error){ console.error('Firebase Web config JSON could not be parsed.'); console.error(error instanceof Error?error.message:String(error)); process.exit(2); }
for(const key of ['projectId','appId','storageBucket','apiKey','authDomain','messagingSenderId']){ if(placeholder(cfg[key])){ console.error(`Firebase CLI returned an invalid/placeholder ${key}.`); process.exit(2); } }
if(cfg.projectId!==projectId||cfg.appId!==appId){ console.error('Firebase CLI returned configuration for an unexpected project/app.'); process.exit(2); }
const appMatch=String(cfg.appId).match(/^1:(\d+):web:[0-9a-f]+$/i); if(!appMatch||appMatch[1]!==String(cfg.messagingSenderId)){ console.error('Firebase appId and messagingSenderId are inconsistent.'); process.exit(2); }
const envPath=resolve('.env.local'); const existingText=existsSync(envPath)?readFileSync(envPath,'utf8').replace(/^\uFEFF/,''):''; const {out,order}=parseEnv(existingText);
const updates={FIREBASE_PROJECT_ID:cfg.projectId,FIREBASE_STORAGE_BUCKET:cfg.storageBucket,OPSIQO_FIREBASE_ADMIN_AUTH_MODE:out.get('OPSIQO_FIREBASE_ADMIN_AUTH_MODE')||'adc',NEXT_PUBLIC_FIREBASE_PROJECT_ID:cfg.projectId,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:cfg.storageBucket,NEXT_PUBLIC_FIREBASE_API_KEY:cfg.apiKey,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:cfg.authDomain,NEXT_PUBLIC_FIREBASE_APP_ID:cfg.appId,NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:String(cfg.messagingSenderId)};
for(const [key,val] of Object.entries(updates)){ if(!out.has(key)) order.push(key); out.set(key,String(val)); }
writeFileSync(envPath,`${order.map(key=>`${key}=${out.get(key)}`).join('\n')}\n`,{encoding:'utf8'});
console.log('PASS: Firebase Web configuration synchronized from Firebase CLI.'); console.log(`Project: ${cfg.projectId}`); console.log(`Storage bucket: ${cfg.storageBucket}`); console.log(`Auth domain: ${cfg.authDomain}`); console.log(`App ID: ${cfg.appId}`); console.log(`Messaging sender ID: ${cfg.messagingSenderId}`); console.log('API key: [REDACTED]'); console.log(`Environment file: ${envPath}`);
