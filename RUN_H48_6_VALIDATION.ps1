$ErrorActionPreference = "Stop"

$Repo      = "D:\opsiqo\git\OPSIQO-H48-1-UAT"
$Branch    = "uat/h48-6-20260904"
$ProjectId = "opsiqo-hcm-uat-2026"
$UatAppId  = "1:68136784443:web:8c05e5e25ec2ee943e021e"

Set-Location -LiteralPath $Repo

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " OPSIQO H48.6 ADMIN TIMESHEET OVERRIDE VALIDATION" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

if ((git branch --show-current).Trim() -ne $Branch) {
    throw "STOP - expected H48.6 branch $Branch."
}

foreach ($Required in @(
    ".\package.json",
    ".\package-lock.json",
    ".\src\domain\time.ts",
    ".\src\lib\time\service.ts",
    ".\src\components\time-workspace.tsx",
    ".\scripts\opsiqo-h48-6-timesheet-admin-override-audit.mjs",
    ".\tests\h48-6-timesheet-admin-override.test.ts"
)) {
    if (-not (Test-Path -LiteralPath $Required -PathType Leaf)) {
        throw "STOP - required H48.6 file missing: $Required"
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
Write-Host "=== H48.6 STATIC AUDIT ===" -ForegroundColor Cyan
npm run h48.6:timesheet-admin:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.6 static audit failed." }

Write-Host ""
Write-Host "=== H48.6 TARGETED + TIME REGRESSION TESTS ===" -ForegroundColor Cyan
npm run test:h48.6
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.6 targeted tests failed." }

Write-Host ""
Write-Host "=== H48.5 LIVE ATTENDANCE REGRESSION ===" -ForegroundColor Cyan
npm run h48.5:attendance-sync:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.5 audit regression failed." }
npm run test:h48.5
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.5 regression tests failed." }

Write-Host ""
Write-Host "=== H48.4 ATTENDANCE VISIBILITY REGRESSION ===" -ForegroundColor Cyan
npm run h48.4:attendance:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.4 audit regression failed." }
npm run test:h48.4
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.4 regression tests failed." }

Write-Host ""
Write-Host "=== H48.3 PRECISION REGRESSION ===" -ForegroundColor Cyan
npm run h48.3:time:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.3 precision audit failed." }
npm run test:h48.3
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.3 precision regression tests failed." }

Write-Host ""
Write-Host "=== H48.2 PREFLIGHT REGRESSION ===" -ForegroundColor Cyan
npm run h48.2:time:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.2 preflight regression failed." }

Write-Host ""
Write-Host "=== H48.1 RUNTIME REGRESSION ===" -ForegroundColor Cyan
npm run h48.1:runtime:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.1 runtime regression audit failed." }
npm run test:h48.1
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.1 regression tests failed." }

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
Write-Host " H48.6 ADMIN TIMESHEET OVERRIDE VALIDATION: PASS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Admin self-approval controls: ACTIVE + GOVERNED" -ForegroundColor Green
Write-Host "Org/Super Admin override roles: PASS" -ForegroundColor Green
Write-Host "Override reason requirement: PASS" -ForegroundColor Green
Write-Host "Explicit override audit evidence: PASS" -ForegroundColor Green
Write-Host "Timesheet employee name/number: PASS" -ForegroundColor Green
Write-Host "Non-admin self-approval block: PRESERVED" -ForegroundColor Green
Write-Host "H48.5 live sync regression: PASS" -ForegroundColor Green
Write-Host "H48.4 visibility regression: PASS" -ForegroundColor Green
Write-Host "H48.3 precision regression: PASS" -ForegroundColor Green
Write-Host "H48.2 preflight regression: PASS" -ForegroundColor Green
Write-Host "H48.1 runtime regression: PASS" -ForegroundColor Green
Write-Host "TypeScript: PASS" -ForegroundColor Green
Write-Host "Next.js build: PASS" -ForegroundColor Green
Write-Host "Source manifest: PASS" -ForegroundColor Green
Write-Host "Secret values displayed: NO" -ForegroundColor Green
Write-Host "UAT deployment performed: NO" -ForegroundColor Yellow
