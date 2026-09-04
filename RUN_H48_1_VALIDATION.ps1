$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '======================================================' -ForegroundColor Magenta
Write-Host ' OPSIQO H48.1 WINDOWS VALIDATION' -ForegroundColor Magenta
Write-Host '======================================================' -ForegroundColor Magenta

npm ci
if ($LASTEXITCODE -ne 0) { throw 'STOP - npm ci failed.' }

npm run h48.1:runtime:audit
if ($LASTEXITCODE -ne 0) { throw 'STOP - H48.1 runtime audit failed.' }

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'STOP - TypeScript failed.' }

npm run test:h48.1
if ($LASTEXITCODE -ne 0) { throw 'STOP - H48.1 tests failed.' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'STOP - production build failed.' }

Write-Host ''
Write-Host '======================================================' -ForegroundColor Green
Write-Host ' H48.1 WINDOWS VALIDATION: PASS' -ForegroundColor Green
Write-Host '======================================================' -ForegroundColor Green
