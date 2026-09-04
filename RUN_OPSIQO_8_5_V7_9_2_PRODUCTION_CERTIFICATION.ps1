param([switch]$SkipCodeCertification)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
function Run([string]$Label,[scriptblock]$Command){Write-Host "`n=== $Label ===" -ForegroundColor Cyan;& $Command;if($LASTEXITCODE -ne 0){throw "$Label failed with exit code $LASTEXITCODE"};Write-Host "PASS: $Label" -ForegroundColor Green}
Write-Host "OPSIQO 8.5 PRODUCTION CERTIFICATION" -ForegroundColor Magenta
if(-not $SkipCodeCertification){& "$PSScriptRoot\RUN_OPSIQO_8_5_V7_9_2_CODE_CERTIFICATION.ps1" -SkipInstall;if($LASTEXITCODE -ne 0){throw "Code certification must pass first."}}
Run "Frozen source manifest" { node scripts/source-manifest.mjs verify }
$AdminAuthMode = ([string]$env:OPSIQO_FIREBASE_ADMIN_AUTH_MODE).Trim().ToLowerInvariant()
if($AdminAuthMode -ne 'adc'){throw "Production certification requires OPSIQO_FIREBASE_ADMIN_AUTH_MODE=adc."}
$DeploymentPlatform = ([string]$env:OPSIQO_DEPLOYMENT_PLATFORM).Trim().ToLowerInvariant()
if($DeploymentPlatform -ne 'firebase_app_hosting'){throw "Production certification requires OPSIQO_DEPLOYMENT_PLATFORM=firebase_app_hosting."}
Run "Current npm vulnerability gate" { npm audit --audit-level=high }
Run "Production readiness / real evidence" { npm run preflight:production }
Run "AI evaluation" { npm run ai:evaluate }
Run "AI governance" { npm run ai:governance-check }
Run "Production evidence bundle generation" { npm run production:evidence:generate }
Run "Production evidence bundle verification" { npm run production:evidence:verify }
Run "Frozen source manifest after production gates" { node scripts/source-manifest.mjs verify }
Write-Host "`nPRODUCTION CERTIFICATION PASSED." -ForegroundColor Green
