$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Magenta
Write-Host " OPSIQO H48 WINDOWS PLATFORM START" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta

if (-not (Test-Path -LiteralPath ".\package.json")) {
    throw "Run this script from the extracted OPSIQO H48 project folder."
}

if (-not (Test-Path -LiteralPath ".\.env.local")) {
    Write-Host ""
    Write-Host ".env.local is missing." -ForegroundColor Yellow
    Write-Host "Copy .env.example to .env.local and add your existing UAT values first." -ForegroundColor Yellow
    exit 2
}

Write-Host ""
Write-Host "Installing frozen dependencies..." -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }

Write-Host ""
Write-Host "TypeScript..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript failed." }

Write-Host ""
Write-Host "Starting OPSIQO H48..." -ForegroundColor Green
npm run dev
