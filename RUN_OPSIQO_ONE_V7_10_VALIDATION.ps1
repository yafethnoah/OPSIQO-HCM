$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Run-Step([string]$Label, [scriptblock]$Command) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host " $Label" -ForegroundColor Magenta
    Write-Host "============================================================" -ForegroundColor Magenta
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE" }
}

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host ""
Write-Host "OPSIQO ONE v7.10 - FULL SOURCE VALIDATION" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot" -ForegroundColor Cyan
Write-Host "No secret values are printed by this runner." -ForegroundColor Yellow

Run-Step "1. VERIFY FROZEN SOURCE BEFORE INSTALL" { node scripts/source-manifest.mjs verify }
Run-Step "2. CLEAN LOCKFILE INSTALL" { npm ci }
Run-Step "3. OPSIQO ONE V7.10 FOUNDATION AUDIT" { npm run opsiqo85:opsiqo-one-v7.10:audit }
Run-Step "4. OPSIQO ONE V7.10 TARGETED TEST" { npm run test:opsiqo-one-v7.10 }
Run-Step "5. TYPESCRIPT SEMANTIC CHECK" { npm run typecheck }
Run-Step "6. OPSIQO 8.5 REGRESSION SUITE" { npm run test:opsiqo85 }
Run-Step "7. FULL TEST SUITE" { npm test }
Run-Step "8. FIRESTORE RULES ISOLATED TEST" { npm run test:rules }
Run-Step "9. SECURITY STATIC SCAN" { npm run security:static-scan }
Run-Step "10. NEXT.JS PRODUCTION BUILD" { npm run build }
Run-Step "11. RELEASE GATE" { npm run release:gate }
Run-Step "12. VERIFY FROZEN SOURCE AFTER VALIDATION" { node scripts/source-manifest.mjs verify }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " OPSIQO ONE v7.10 VALIDATION PASS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Source is ready for controlled UAT evaluation. No deployment was performed." -ForegroundColor Green
