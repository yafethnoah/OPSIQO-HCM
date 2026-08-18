$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " OPSIQO 8.5 V7.9.3.3 MFA HOTFIX CODE VALIDATION" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

function Invoke-Gate {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "FAILED: $Name"
    }
    Write-Host "PASS: $Name" -ForegroundColor Green
}

Write-Host ""
Write-Host "This runner does not print configured secret values." -ForegroundColor Yellow
Write-Host "It does not deploy or change Firebase." -ForegroundColor Yellow

Invoke-Gate "Clean dependency install" { npm ci }
Invoke-Gate "MFA hotfix static audit" { npm run opsiqo85:mfa-hotfix:audit }
Invoke-Gate "TypeScript" { npm run typecheck }
Invoke-Gate "OPSIQO 8.5 tests" { npm run test:opsiqo85 }
Invoke-Gate "Full Vitest suite" { npm test }
Invoke-Gate "Release gate" { npm run release:gate }
Invoke-Gate "Firestore Rules" { npm run test:rules }
Invoke-Gate "Production build" { npm run build }
Invoke-Gate "Generate source manifest" { npm run source:manifest:generate }
Invoke-Gate "Verify source manifest" { npm run source:manifest:verify }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " MFA HOTFIX CODE VALIDATION PASSED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "No Firebase change was performed." -ForegroundColor Yellow
Write-Host "Do not enable TOTP or deploy until the resulting commit is reviewed." -ForegroundColor Yellow
