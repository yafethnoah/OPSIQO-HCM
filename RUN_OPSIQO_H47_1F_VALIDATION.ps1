$ErrorActionPreference = 'Stop'
Write-Host 'OPSIQO H47.1F MOBILE REPRODUCIBLE BUILD BASELINE VALIDATION' -ForegroundColor Magenta

$ProjectRoot = (Get-Location).Path
$MobileSource = Join-Path $ProjectRoot 'mobile'
$MobileLock = Join-Path $MobileSource 'package-lock.json'
if (-not (Test-Path -LiteralPath $MobileLock -PathType Leaf)) { throw 'Frozen mobile package-lock.json is missing. Run FREEZE_OPSIQO_H47_1F_MOBILE_LOCK.ps1 first.' }

if (-not (Test-Path '.\node_modules\.bin\tsc.cmd')) {
  Write-Host 'Root dependencies are not installed. Running npm ci...' -ForegroundColor Cyan
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'Root npm ci failed.' }
}

$audits = @(
  '.\scripts\opsiqo-h43-recruiting-auto-enrollment-audit.mjs',
  '.\scripts\opsiqo-h44-interview-intelligence-audit.mjs',
  '.\scripts\opsiqo-h46-frontline-operations-audit.mjs',
  '.\scripts\opsiqo-h47-mobile-employee-audit.mjs',
  '.\scripts\opsiqo-h47-1-mobile-essentials-audit.mjs',
  '.\scripts\opsiqo-h47-1a-certification-repair-audit.mjs',
  '.\scripts\opsiqo-h47-1b-historical-certification-audit.mjs',
  '.\scripts\opsiqo-h47-1c-mobile-toolchain-audit.mjs',
  '.\scripts\opsiqo-h47-1d-mobile-tab-icon-audit.mjs',
  '.\scripts\opsiqo-h47-1e-expo-doctor-isolation-audit.mjs',
  '.\scripts\opsiqo-h47-1f-lock-capture-audit.mjs',
  '.\scripts\opsiqo-h47-1f-reproducible-build-audit.mjs'
)
foreach($audit in $audits){ node $audit; if($LASTEXITCODE -ne 0){ throw "Audit failed: $audit" } }

Write-Host 'Running root TypeScript workspace...' -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Root TypeScript failed.' }

npx vitest run tests/mobile-employee-h47-1f.test.ts tests/mobile-employee-h47-1e.test.ts tests/mobile-employee-h47-1d.test.ts tests/mobile-employee-h47-1c.test.ts tests/mobile-employee-h47-1b.test.ts tests/mobile-employee-h47-1a.test.ts tests/recruiting-pdf-safety-h41.test.ts tests/recruiting-uat-readiness-h45.test.ts tests/mobile-employee-h47-1.test.ts tests/mobile-employee-h47.test.ts tests/time-attendance-expense-h46.test.ts tests/recruiting-intelligence-h45b.test.ts tests/recruiting-interview-intelligence-h44.test.ts tests/recruiting-auto-enrollment-h43.test.ts
if ($LASTEXITCODE -ne 0) { throw 'H47.1F targeted regression tests failed.' }

npm test
if ($LASTEXITCODE -ne 0) { throw 'Full Vitest failed.' }
npm run test:rules
if ($LASTEXITCODE -ne 0) { throw 'Firestore Rules tests failed.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Next.js production build failed.' }

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('opsiqo-h471f-mobile-' + [Guid]::NewGuid().ToString('N'))
$TempMobile = Join-Path $TempRoot 'mobile'
$PreviousCI = $env:CI
try {
  Write-Host 'Creating isolated Employee Mobile reproducibility workspace...' -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $TempMobile -Force | Out-Null
  Get-ChildItem -LiteralPath $MobileSource -Force |
    Where-Object { $_.Name -notin @('node_modules', '.expo', 'web-build') } |
    Copy-Item -Destination $TempMobile -Recurse -Force
  Copy-Item -LiteralPath $MobileLock -Destination (Join-Path $TempMobile 'package-lock.json') -Force
  Push-Location $TempMobile
  try {
    Write-Host 'Installing Employee Mobile exactly from the frozen package-lock.json...' -ForegroundColor Cyan
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Mobile npm ci failed.' }
    $env:CI = '1'
    npx expo install --check
    if ($LASTEXITCODE -ne 0) { throw 'Expo dependency alignment check failed.' }
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'Mobile TypeScript failed.' }
    npx expo-doctor
    if ($LASTEXITCODE -ne 0) { throw 'Expo Doctor failed.' }
  } finally { Pop-Location }
} finally {
  $env:CI = $PreviousCI
  if(Test-Path -LiteralPath $TempRoot){ Remove-Item -LiteralPath $TempRoot -Recurse -Force }
}

Write-Host 'Verifying immutable certified source manifest...' -ForegroundColor Cyan
node .\scripts\source-manifest.mjs verify
if ($LASTEXITCODE -ne 0) { throw 'Source manifest verification failed.' }
Write-Host 'H47.1F OPSIQO EMPLOYEE MOBILE REPRODUCIBLE BUILD BASELINE: PASS' -ForegroundColor Green
