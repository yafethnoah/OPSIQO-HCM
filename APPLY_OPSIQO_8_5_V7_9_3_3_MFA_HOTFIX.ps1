param(
    [string]$TargetRoot = "D:\opsiqo\git\OPSIQO-HCM-V7933-PRODUCTION"
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "hotfix/uat-mfa-flow-20260817"
$ExpectedBaseSha = "77a0609de24c40fb203fd78ac17db8efec81e6e8"
$SourceRoot = $PSScriptRoot

$Files = @(
    "src\lib\http\api-request-error.ts",
    "src\lib\auth\mfa-client.ts",
    "src\lib\http\client.ts",
    "src\app\mfa\setup\page.tsx",
    "src\app\signin\page.tsx",
    "src\components\settings-workspace.tsx",
    "src\components\superapp-workspace.tsx",
    "src\components\app-shell.tsx",
    "tests\opsiqo85\mfa-flow-v7-9-3-3.test.ts",
    "scripts\opsiqo85-mfa-flow-hotfix-audit.mjs",
    "package.json",
    "HOTFIX_UAT_MFA_FLOW_2026-08-17.md",
    "RUN_OPSIQO_8_5_V7_9_3_3_MFA_HOTFIX_VALIDATION.ps1",
    "RUN_MFA_HOTFIX_VALIDATION.cmd",
    "APPLY_OPSIQO_8_5_V7_9_3_3_MFA_HOTFIX.ps1",
    "MFA_HOTFIX_VALIDATION_REPORT.md",
    "SOURCE_MANIFEST.sha256"
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " OPSIQO 8.5 V7.9.3.3 MFA HOTFIX INSTALLER" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

if (-not (Test-Path -LiteralPath $TargetRoot)) {
    throw "Target repository not found: $TargetRoot"
}

Set-Location $TargetRoot

$Branch = (git branch --show-current).Trim()
$Head = (git rev-parse HEAD).Trim()
$Dirty = git status --porcelain

if ($Branch -ne $ExpectedBranch) {
    throw "STOP: Expected branch '$ExpectedBranch' but found '$Branch'."
}

if ($Head -ne $ExpectedBaseSha) {
    throw "STOP: Expected base SHA '$ExpectedBaseSha' but found '$Head'. Apply only to the certified hotfix base."
}

if ($Dirty) {
    throw "STOP: Target working tree has local changes. Commit/stash them before applying this hotfix."
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path (Split-Path $TargetRoot -Parent) "OPSIQO_MFA_HOTFIX_BACKUP_$Timestamp"
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

foreach ($Relative in $Files) {
    $Source = Join-Path $SourceRoot $Relative
    $Target = Join-Path $TargetRoot $Relative

    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Hotfix package is incomplete. Missing: $Relative"
    }

    if (Test-Path -LiteralPath $Target) {
        $Backup = Join-Path $BackupRoot $Relative
        New-Item -ItemType Directory -Path (Split-Path $Backup -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $Target -Destination $Backup -Force
    }

    New-Item -ItemType Directory -Path (Split-Path $Target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Target -Force
}

Write-Host "PASS: MFA hotfix source copied." -ForegroundColor Green
Write-Host "Backup: $BackupRoot" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== MFA STATIC AUDIT ===" -ForegroundColor Cyan
node ".\scripts\opsiqo85-mfa-flow-hotfix-audit.mjs"
if ($LASTEXITCODE -ne 0) {
    throw "MFA hotfix static audit failed after installation."
}

Write-Host ""
Write-Host "=== SOURCE MANIFEST VERIFY ===" -ForegroundColor Cyan
node ".\scripts\source-manifest.mjs" verify
if ($LASTEXITCODE -ne 0) {
    throw "Source manifest verification failed after installation."
}

Write-Host ""
Write-Host "=== WORKING TREE ===" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " MFA HOTFIX INSTALLED INTO CONTROLLED BRANCH" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "NO FIREBASE CHANGE." -ForegroundColor Yellow
Write-Host "NO DEPLOYMENT." -ForegroundColor Yellow
Write-Host "NO PRODUCTION CHANGE." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next: .\RUN_OPSIQO_8_5_V7_9_3_3_MFA_HOTFIX_VALIDATION.ps1" -ForegroundColor Cyan
