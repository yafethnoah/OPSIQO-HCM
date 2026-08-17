import fs from 'node:fs';
const files = {
  rules: fs.readFileSync('firestore.rules','utf8'),
  next: fs.readFileSync('next.config.ts','utf8'),
  perf: fs.readFileSync('src/components/performance-workspace.tsx','utf8'),
  security: fs.readFileSync('src/domain/security.ts','utf8'),
  perms: fs.readFileSync('src/lib/auth/permissions.ts','utf8'),
  session: fs.readFileSync('src/lib/auth/session.ts','utf8'),
  hr: fs.readFileSync('src/lib/hr/service.ts','utf8'),
  bootstrap: fs.readFileSync('src/lib/organization/bootstrap.ts','utf8'),
  apphosting: fs.readFileSync('apphosting.yaml','utf8'),
  scheduler: fs.readFileSync('.github/workflows/automation-scheduler.yml','utf8'),
  promotion: fs.readFileSync('.github/workflows/production-promotion.yml','utf8'),
  closure: fs.readFileSync('.github/workflows/production-evidence-closure.yml','utf8'),
};
const workflows=['.github/workflows/quality-gates.yml','.github/workflows/quality.yml','.github/workflows/security-analysis.yml','.github/workflows/software-supply-chain.yml'].map(p=>fs.readFileSync(p,'utf8'));
const checks=[
 ['performance mojibake removed', !/[ÂÃ]|â(?:€|€¦|†|œ|‰)/.test(files.perf)],
 ['privacy-minimized worker directory rule exists', files.rules.includes('match /workerDirectory/{docId}') && files.rules.includes('membership(orgId).data.workerId == docId')],
 ['raw assignments no longer readable by every active member', files.rules.includes('resource.data.managerWorkerId == membership(orgId).data.workerId')],
 ['employee create writes directory projection', files.hr.includes('workerDirectoryEntry(worker)')],
 ['bootstrap creates directory projection', files.bootstrap.includes('/workerDirectory/${workerId}')],
 ['directory backfill exists', fs.existsSync('scripts/backfill-worker-directory.ts')],
 ['CSP header configured', files.next.includes("Content-Security-Policy") && files.next.includes("frame-ancestors 'none'")],
 ['CORP header configured', files.next.includes('Cross-Origin-Resource-Policy')],
 ['team permission types exist', ['recruiting.manage.team','onboarding.manage.team','time.manage.team','performance.pip.team','learning.verify.team'].every(v=>files.security.includes(v))],
 ['manager uses team-scoped permissions', ['recruiting.manage.team','onboarding.manage.team','time.manage.team','performance.pip.team','learning.verify.team'].every(v=>files.perms.includes(v))],
 ['permission fallback is centralized', files.session.includes('TEAM_PERMISSION_FALLBACK') && files.session.includes('hasPermission')],
 ['production branch patterns trigger standard CI', workflows.every(v=>v.includes("'production-*'"))],
 ['production CI receives complete Firebase web config', [files.promotion,files.closure].every(v=>['NEXT_PUBLIC_FIREBASE_API_KEY','NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN','NEXT_PUBLIC_FIREBASE_APP_ID','NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'].every(k=>v.includes(k)))],
 ['production scheduler exists and is protected', files.scheduler.includes("cron: '17 * * * *'") && files.scheduler.includes('OPSIQO_JOB_SECRET') && files.scheduler.includes('scope')],
 ['apphosting config uses ADC', files.apphosting.includes('OPSIQO_FIREBASE_ADMIN_AUTH_MODE') && files.apphosting.includes('value: adc')],
 ['apphosting config uses Secret Manager references', files.apphosting.includes('secret: OPSIQO_JOB_SECRET') && files.apphosting.includes('secret: OPSIQO_GEMINI_API_KEY')],
 ['apphosting public web app identity matches backend', files.apphosting.includes('1:303296177079:web:1f1048d8669c6e41323e32')],
 ['release identity module exists', fs.existsSync('src/lib/release/identity.ts')],
 ['package keeps certification baseline', JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.6.1'],
 ['validation runner exists', fs.existsSync('RUN_OPSIQO_8_5_V7_9_1_STABILIZATION_VALIDATION.ps1')],
];
let failures=0; for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${label}`);if(!ok)failures++;}
console.log(JSON.stringify({status:failures?'FAIL':'PASS',checks:checks.length,failures},null,2));process.exit(failures?1:0);
