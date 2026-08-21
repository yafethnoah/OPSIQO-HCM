$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Write-Host ''
Write-Host '==============================================' -ForegroundColor Magenta
Write-Host ' OPSIQO H23 DEPLOYMENT READINESS RUNNER FIX' -ForegroundColor Magenta
Write-Host '==============================================' -ForegroundColor Magenta
Write-Host "Project: $((Get-Location).Path)"
Write-Host 'SAFE - no .env values are read or printed.' -ForegroundColor Yellow
Write-Host 'SAFE - no Firebase production resources are changed or deployed.' -ForegroundColor Yellow

$Target = '.\RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1'
if (-not (Test-Path -LiteralPath $Target)) {
    throw "Target file not found: $Target"
}

$Resolved = (Resolve-Path -LiteralPath $Target).Path
$Source = [System.IO.File]::ReadAllText($Resolved)
$Old = "Step 'Deployment readiness report' { npm run opsiqo85:v7.32:deployment-readiness -- `$script:CertificationLedger }"
$New = "Step 'Deployment readiness report' { npm run opsiqo85:v7.32:deployment-readiness }"

if ($Source.Contains($New) -and -not $Source.Contains($Old)) {
    Write-Host 'Runner already contains the H23 fix.' -ForegroundColor Green
}
elseif ($Source.Contains($Old)) {
    $BackupDir = Join-Path $env:TEMP ('OPSIQO_H23_BACKUP_' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Copy-Item -LiteralPath $Resolved -Destination (Join-Path $BackupDir 'RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1') -Force

    $Patched = $Source.Replace($Old, $New)
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Resolved, $Patched, $Utf8NoBom)

    Write-Host 'Runner invocation patched.' -ForegroundColor Green
    Write-Host "Backup: $BackupDir" -ForegroundColor DarkGray
}
else {
    throw 'Expected V7.32 deployment-readiness runner line was not found exactly. No approximate edit was made.'
}

$Verify = [System.IO.File]::ReadAllText($Resolved)
if (-not $Verify.Contains($New)) { throw 'Post-patch verification failed: fixed invocation is absent.' }
if ($Verify.Contains($Old)) { throw 'Post-patch verification failed: old unsafe npm argument forwarding remains.' }

Write-Host ''
Write-Host '=== SOURCE VALIDATION ===' -ForegroundColor Cyan
node '.\scripts\opsiqo85-opsiqo-one-v7-32-audit.mjs'
if ($LASTEXITCODE -ne 0) { throw 'V7.32 source audit failed.' }
node '.\scripts\opsiqo85-v7-32-hotfix19-audit.mjs'
if ($LASTEXITCODE -ne 0) { throw 'H19 regression audit failed.' }
node '.\scripts\opsiqo85-v7-32-windows-powershell-compat-audit.mjs'
if ($LASTEXITCODE -ne 0) { throw 'Windows PowerShell compatibility audit failed.' }

if (Test-Path '.\node_modules') {
    Write-Host ''
    Write-Host '=== DIRECT DEPLOYMENT READINESS INVOCATION PROOF ===' -ForegroundColor Cyan
    npm run opsiqo85:v7.32:deployment-readiness
    if ($LASTEXITCODE -ne 0) { throw 'Deployment readiness invocation still fails.' }
}
else {
    Write-Host 'node_modules is absent; direct npm invocation proof is deferred to the canonical runner.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'H23 DEPLOYMENT READINESS RUNNER FIX APPLIED AND VERIFIED.' -ForegroundColor Green
Write-Host 'Next: remove this patch file, clean certification transients, regenerate the source manifest, then rerun RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1' -ForegroundColor Cyan
