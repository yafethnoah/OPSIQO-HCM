$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Magenta
Write-Host " OPSIQO H48 WINDOWS VALIDATION" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta

if (-not (Test-Path -LiteralPath ".\package.json")) {
    throw "Run this script from the extracted OPSIQO H48 project folder."
}

Write-Host ""
Write-Host "H48 source audit..." -ForegroundColor Cyan
node .\scripts\h48-platform-audit.mjs
if ($LASTEXITCODE -ne 0) { throw "H48 source audit failed." }

Write-Host ""
Write-Host "Installing frozen dependencies..." -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }

Write-Host ""
Write-Host "TypeScript..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript failed." }

Write-Host ""
Write-Host "H48 invitation/platform tests..." -ForegroundColor Cyan
npm run test:h48
if ($LASTEXITCODE -ne 0) { throw "H48 tests failed." }

Write-Host ""
Write-Host "Production build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Production build failed." }

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host " H48 WINDOWS VALIDATION: PASS" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
