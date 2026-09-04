$ErrorActionPreference = 'Stop'
Write-Host 'OPSIQO H47.1 EMPLOYEE MOBILE ESSENTIALS VALIDATION' -ForegroundColor Magenta
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
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Root TypeScript failed.' }
npx vitest run tests/mobile-employee-h47-1.test.ts tests/mobile-employee-h47.test.ts tests/time-attendance-expense-h46.test.ts tests/recruiting-intelligence-h45b.test.ts tests/recruiting-interview-intelligence-h44.test.ts tests/recruiting-auto-enrollment-h43.test.ts
if ($LASTEXITCODE -ne 0) { throw 'H47.1 targeted regression tests failed.' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Full Vitest failed.' }
npm run test:rules
if ($LASTEXITCODE -ne 0) { throw 'Firestore Rules tests failed.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Next.js production build failed.' }
Push-Location .\mobile
try {
  if (-not (Test-Path '.\node_modules')) {
    Write-Host 'Installing H47.1 mobile dependencies...' -ForegroundColor Cyan
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Mobile npm install failed.' }
  }
  npx expo install --fix
  if ($LASTEXITCODE -ne 0) { throw 'Expo dependency alignment failed.' }
  npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw 'Mobile TypeScript failed.' }
  npx expo-doctor
  if ($LASTEXITCODE -ne 0) { throw 'Expo Doctor failed.' }
}
finally { Pop-Location }
node .\scripts\source-manifest.mjs generate
if ($LASTEXITCODE -ne 0) { throw 'Source manifest generation failed.' }
node .\scripts\source-manifest.mjs verify
if ($LASTEXITCODE -ne 0) { throw 'Source manifest verification failed.' }
Write-Host 'H47.1 OPSIQO EMPLOYEE MOBILE ESSENTIALS: PASS' -ForegroundColor Green
