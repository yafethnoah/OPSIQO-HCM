$ErrorActionPreference = 'Stop'
Write-Host 'OPSIQO H45 VALIDATION' -ForegroundColor Magenta
if (-not (Test-Path '.\node_modules\.bin\tsc.cmd')) {
  Write-Host 'Dependencies are not installed in this extracted project.' -ForegroundColor Yellow
  Write-Host 'Running reproducible npm ci...' -ForegroundColor Cyan
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
}
node .\scripts\opsiqo-h45-stabilization-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H45 static audit failed.' }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'TypeScript failed.' }
npx vitest run tests/recruiting-uat-readiness-h45.test.ts tests/recruiting-interview-intelligence-h44.test.ts tests/recruiting-auto-enrollment-h43.test.ts tests/recruiting-pdf-safety-h41.test.ts tests/recruiting-document-first-intake-h40.test.ts
if ($LASTEXITCODE -ne 0) { throw 'H45 recruiting/auth regression tests failed.' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Full Vitest failed.' }
npm run test:rules
if ($LASTEXITCODE -ne 0) { throw 'Firestore Rules tests failed.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
node .\scripts\source-manifest.mjs generate
if ($LASTEXITCODE -ne 0) { throw 'Source manifest generation failed.' }
node .\scripts\source-manifest.mjs verify
if ($LASTEXITCODE -ne 0) { throw 'Source manifest verification failed.' }
Write-Host 'H45 STABILIZATION + UAT READINESS: PASS' -ForegroundColor Green
