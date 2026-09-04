$ErrorActionPreference = 'Stop'
Write-Host 'OPSIQO H47.1D MOBILE TAB ICON TYPE COMPATIBILITY VALIDATION' -ForegroundColor Magenta

if (-not (Test-Path '.\node_modules\.bin\tsc.cmd')) {
  Write-Host 'Root dependencies are not installed. Running npm ci...' -ForegroundColor Cyan
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'Root npm ci failed.' }
}

node .\scripts\opsiqo-h43-recruiting-auto-enrollment-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H43 audit failed.' }
node .\scripts\opsiqo-h44-interview-intelligence-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H44 audit failed.' }
node .\scripts\opsiqo-h46-frontline-operations-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H46 audit failed.' }
node .\scripts\opsiqo-h47-mobile-employee-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H47 mobile audit failed.' }
node .\scripts\opsiqo-h47-1-mobile-essentials-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H47.1 mobile essentials audit failed.' }
node .\scripts\opsiqo-h47-1a-certification-repair-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H47.1A certification repair audit failed.' }
node .\scripts\opsiqo-h47-1b-historical-certification-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H47.1B historical certification audit failed.' }
node .\scripts\opsiqo-h47-1c-mobile-toolchain-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H47.1C mobile toolchain audit failed.' }
node .\scripts\opsiqo-h47-1d-mobile-tab-icon-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H47.1D mobile tab icon audit failed.' }

Write-Host 'Running root TypeScript workspace...' -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Root TypeScript failed.' }

npx vitest run tests/mobile-employee-h47-1d.test.ts tests/mobile-employee-h47-1c.test.ts tests/mobile-employee-h47-1b.test.ts tests/mobile-employee-h47-1a.test.ts tests/recruiting-pdf-safety-h41.test.ts tests/recruiting-uat-readiness-h45.test.ts tests/mobile-employee-h47-1.test.ts tests/mobile-employee-h47.test.ts tests/time-attendance-expense-h46.test.ts tests/recruiting-intelligence-h45b.test.ts tests/recruiting-interview-intelligence-h44.test.ts tests/recruiting-auto-enrollment-h43.test.ts
if ($LASTEXITCODE -ne 0) { throw 'H47.1D targeted regression tests failed.' }

npm test
if ($LASTEXITCODE -ne 0) { throw 'Full Vitest failed.' }

npm run test:rules
if ($LASTEXITCODE -ne 0) { throw 'Firestore Rules tests failed.' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'Next.js production build failed.' }

Push-Location .\mobile
$PreviousCI = $env:CI
try {
  if (-not (Test-Path '.\node_modules\.bin\tsc.cmd')) {
    Write-Host 'Installing isolated H47.1D mobile dependencies...' -ForegroundColor Cyan
    npm install --no-package-lock --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Mobile npm install failed.' }
  }

  # Expo documents CI=1 as the immutable/non-interactive mode for --check.
  $env:CI = '1'
  Write-Host 'Checking Expo dependency alignment in immutable CI mode...' -ForegroundColor Cyan
  npx expo install --check
  if ($LASTEXITCODE -ne 0) { throw 'Expo dependency alignment check failed.' }

  npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw 'Mobile TypeScript failed.' }

  npx expo-doctor
  if ($LASTEXITCODE -ne 0) { throw 'Expo Doctor failed.' }
}
finally {
  $env:CI = $PreviousCI
  Pop-Location
}

Write-Host 'Verifying the immutable certified source manifest...' -ForegroundColor Cyan
node .\scripts\source-manifest.mjs verify
if ($LASTEXITCODE -ne 0) { throw 'Source manifest verification failed.' }

Write-Host 'H47.1D OPSIQO EMPLOYEE MOBILE TAB ICON TYPE COMPATIBILITY: PASS' -ForegroundColor Green
