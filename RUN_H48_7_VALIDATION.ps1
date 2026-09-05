$ErrorActionPreference = "Stop"

$Repo      = "D:\opsiqo\git\OPSIQO-H48-1-UAT"
$Branch    = "uat/h48-7-20260904"
$ProjectId = "opsiqo-hcm-uat-2026"
$UatAppId  = "1:68136784443:web:8c05e5e25ec2ee943e021e"

Set-Location -LiteralPath $Repo

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " OPSIQO H48.7 PAYROLL PERIOD INTEGRITY VALIDATION" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

if ((git branch --show-current).Trim() -ne $Branch) {
    throw "STOP - expected H48.7 branch $Branch."
}

foreach ($Required in @(
    ".\package.json",
    ".\package-lock.json",
    ".\src\components\time-workspace.tsx",
    ".\src\lib\time\service.ts",
    ".\src\app\api\organizations\[orgId]\time\payroll-export\route.ts",
    ".\scripts\opsiqo-h48-7-payroll-period-integrity-audit.mjs",
    ".\tests\h48-7-payroll-period-integrity.test.ts"
)) {
    if (-not (Test-Path -LiteralPath $Required -PathType Leaf)) {
        throw "STOP - required H48.7 file missing: $Required"
    }
}

Write-Host ""
Write-Host "=== CLEAN DEPENDENCY GRAPH ===" -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { throw "STOP - npm ci failed." }

Write-Host ""
Write-Host "=== TEMPORARY UAT FIREBASE WEB CONFIG ===" -ForegroundColor Cyan
npm run firebase:sync-web-config -- --project $ProjectId --app $UatAppId
if ($LASTEXITCODE -ne 0) { throw "STOP - UAT Firebase client synchronization failed." }

node -e "
const fs=require('fs');
const p='.env.local';
let s=fs.readFileSync(p,'utf8');
function set(k,v){const r=new RegExp('^'+k+'=.*$','m');s=r.test(s)?s.replace(r,k+'='+v):s+(s.endsWith('\n')?'':'\n')+k+'='+v+'\n';}
set('APP_BASE_URL','https://uat.opsiqo.ca');
set('NEXT_PUBLIC_APP_BASE_URL','https://uat.opsiqo.ca');
fs.writeFileSync(p,s);
"
if ($LASTEXITCODE -ne 0) { throw "STOP - UAT base URL configuration failed." }

Write-Host "UAT environment prepared; secret values not displayed." -ForegroundColor Green

Write-Host ""
Write-Host "=== H48.7 STATIC AUDIT ===" -ForegroundColor Cyan
npm run h48.7:payroll:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.7 static audit failed." }

Write-Host ""
Write-Host "=== H48.7 TARGETED + TIME REGRESSION TESTS ===" -ForegroundColor Cyan
npm run test:h48.7
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.7 targeted tests failed." }

Write-Host ""
Write-Host "=== H48.6 ADMIN TIMESHEET REGRESSION ===" -ForegroundColor Cyan
npm run h48.6:timesheet-admin:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.6 audit regression failed." }
npm run test:h48.6
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.6 regression tests failed." }

Write-Host ""
Write-Host "=== H48.5 LIVE ATTENDANCE REGRESSION ===" -ForegroundColor Cyan
npm run h48.5:attendance-sync:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.5 audit regression failed." }

Write-Host ""
Write-Host "=== H48.4 ATTENDANCE VISIBILITY REGRESSION ===" -ForegroundColor Cyan
npm run h48.4:attendance:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.4 audit regression failed." }

Write-Host ""
Write-Host "=== H48.3 PRECISION REGRESSION ===" -ForegroundColor Cyan
npm run h48.3:time:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.3 precision audit failed." }

Write-Host ""
Write-Host "=== H48.2 PREFLIGHT REGRESSION ===" -ForegroundColor Cyan
npm run h48.2:time:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.2 preflight audit failed." }

Write-Host ""
Write-Host "=== H48.1 RUNTIME REGRESSION ===" -ForegroundColor Cyan
npm run h48.1:runtime:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.1 runtime regression failed." }

Write-Host ""
Write-Host "=== TYPESCRIPT ===" -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "STOP - TypeScript failed." }

Write-Host ""
Write-Host "=== NEXT.JS PRODUCTION BUILD ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "STOP - Next.js production build failed." }

Write-Host ""
Write-Host "=== CLEAN LOCAL-ONLY ARTIFACTS ===" -ForegroundColor Cyan
if (Test-Path -LiteralPath ".\.env.local") { Remove-Item -LiteralPath ".\.env.local" -Force }
if (Test-Path -LiteralPath ".\.next") { Remove-Item -LiteralPath ".\.next" -Recurse -Force }
if (Test-Path -LiteralPath ".\.firebase") { Remove-Item -LiteralPath ".\.firebase" -Recurse -Force }
if (Test-Path -LiteralPath ".\.env.local") { throw "STOP - .env.local cleanup failed." }

Write-Host ""
Write-Host "=== SOURCE MANIFEST ===" -ForegroundColor Cyan
npm run source:manifest:generate
if ($LASTEXITCODE -ne 0) { throw "STOP - source manifest generation failed." }
npm run source:manifest:verify
if ($LASTEXITCODE -ne 0) { throw "STOP - source manifest verification failed." }

git diff --check
if ($LASTEXITCODE -ne 0) { throw "STOP - Git whitespace/integrity check failed." }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " H48.7 PAYROLL PERIOD INTEGRITY VALIDATION: PASS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Explicit pay-period selection: PASS" -ForegroundColor Green
Write-Host "UTC calendar rollover dependency: REMOVED" -ForegroundColor Green
Write-Host "Authoritative week defaults: PASS" -ForegroundColor Green
Write-Host "Approved-only payroll export: PRESERVED" -ForegroundColor Green
Write-Host "Full-period timesheet containment: PASS" -ForegroundColor Green
Write-Host "Partial-week over-export: BLOCKED" -ForegroundColor Green
Write-Host "Payroll export audit evidence: PRESERVED" -ForegroundColor Green
Write-Host "Payroll route cache: NO-STORE" -ForegroundColor Green
Write-Host "H48.6 admin approval regression: PASS" -ForegroundColor Green
Write-Host "H48.5 live attendance regression: PASS" -ForegroundColor Green
Write-Host "H48.4 visibility regression: PASS" -ForegroundColor Green
Write-Host "H48.3 precision regression: PASS" -ForegroundColor Green
Write-Host "H48.2 preflight regression: PASS" -ForegroundColor Green
Write-Host "H48.1 runtime regression: PASS" -ForegroundColor Green
Write-Host "TypeScript: PASS" -ForegroundColor Green
Write-Host "Next.js build: PASS" -ForegroundColor Green
Write-Host "Source manifest: PASS" -ForegroundColor Green
Write-Host "Secret values displayed: NO" -ForegroundColor Green
Write-Host "UAT rollout performed: NO" -ForegroundColor Yellow
Write-Host "Production modified: NO" -ForegroundColor Green
