$ErrorActionPreference = "Stop"

$ProjectId = "opsiqo-hcm-uat-2026"
$UatAppId  = "1:68136784443:web:8c05e5e25ec2ee943e021e"
$UatUrl    = "https://uat.opsiqo.ca"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " OPSIQO H48.3 TIME PRECISION + PAYROLL INTEGRITY VALIDATION" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

foreach ($Required in @(
    ".\package.json",
    ".\package-lock.json",
    ".\src\components\time-workspace.tsx",
    ".\src\lib\time\precision.ts",
    ".\src\lib\time\schemas.ts",
    ".\src\lib\time\service.ts",
    ".\scripts\opsiqo-h48-3-time-precision-audit.mjs",
    ".\tests\h48-3-time-precision.test.ts"
)) {
    if (-not (Test-Path -LiteralPath $Required -PathType Leaf)) {
        throw "STOP - required H48.3 file missing: $Required"
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
Write-Host "UAT environment prepared; values not displayed." -ForegroundColor Green

Write-Host ""
Write-Host "=== H48.3 STATIC AUDIT ===" -ForegroundColor Cyan
npm run h48.3:time:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.3 static audit failed." }

Write-Host ""
Write-Host "=== H48.3 TARGETED + TIME REGRESSION TESTS ===" -ForegroundColor Cyan
npm run test:h48.3
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.3 targeted tests failed." }

Write-Host ""
Write-Host "=== H48.2 PREFLIGHT REGRESSION ===" -ForegroundColor Cyan
npm run h48.2:time:audit
if ($LASTEXITCODE -ne 0) { throw "STOP - H48.2 time-preflight audit failed." }

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
Write-Host " H48.3 TIME PRECISION + PAYROLL INTEGRITY VALIDATION: PASS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "H48.3 audit: PASS" -ForegroundColor Green
Write-Host "H48.3 targeted/time tests: PASS" -ForegroundColor Green
Write-Host "H48.2 preflight regression: PASS" -ForegroundColor Green
Write-Host "H48.1 runtime regression: PASS" -ForegroundColor Green
Write-Host "TypeScript: PASS" -ForegroundColor Green
Write-Host "Next.js build: PASS" -ForegroundColor Green
Write-Host "Source manifest: PASS" -ForegroundColor Green
Write-Host "Secret values displayed: NO" -ForegroundColor Green
Write-Host "UAT deployment performed: NO" -ForegroundColor Yellow
