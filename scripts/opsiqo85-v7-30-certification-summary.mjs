import fs from 'node:fs';
import path from 'node:path';
const supplied=process.argv[2];
const candidates=[supplied,path.join(process.cwd(),'artifacts','v7-30-certification-ledger.json'),path.join(process.env.TEMP||process.env.TMP||'/tmp','opsiqo-v7-30-certification-ledger.json')].filter(Boolean);
const ledgerPath=candidates.find(p=>fs.existsSync(p));
if(!ledgerPath){console.log('V7.30 certification summary: no sanitized ledger exists yet.');process.exit(0)}
let data;try{data=JSON.parse(fs.readFileSync(ledgerPath,'utf8'))}catch{console.log('V7.30 certification summary: ledger exists but is not valid JSON.');process.exit(1)}
const gates=Array.isArray(data.gates)?data.gates:[];const passed=gates.filter(g=>g.status==='pass'),failed=gates.filter(g=>g.status==='fail');const first=failed[0];
console.log('\nOPSIQO ONE V7.30 CERTIFICATION SUMMARY');
console.log(`Ledger: ${ledgerPath}`);
console.log(`Gates recorded: ${gates.length} | PASS: ${passed.length} | FAIL: ${failed.length}`);
if(first){console.log(`First failing gate: ${first.name}`);console.log('Next action: review only that gate\'s console output first; do not share secret values.');}
else if(gates.length){console.log('No failing gate is recorded in the current sanitized ledger.');}
console.log('Safety: this summary prints gate metadata only and never reads .env files, credentials, tokens, cookies or private keys.');
