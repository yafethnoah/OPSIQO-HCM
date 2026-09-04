$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$Evidence = Join-Path $Root ("artifacts\OPSIQO_8_5_UNIVERSAL_IMPORT_ATS_VALIDATION_" + $Stamp)
New-Item -ItemType Directory -Force -Path $Evidence | Out-Null
$results = @()
$codeFailed = $false
$environmentFailed = $false

function Run-Gate {
  param([string]$Name,[string]$Category,[string]$Command)
  $log = Join-Path $Evidence ("gate-" + $Name + ".log")
  $old = $ErrorActionPreference
  Push-Location $Root
  try {
    # Windows PowerShell 5.1 can surface harmless native stderr as NativeCommandError.
    # The native process exit code remains authoritative.
    $ErrorActionPreference = "Continue"
    cmd.exe /d /s /c "set CI=true&& set VITE_CONFIG_NATIVE_IGNORE_WARNING=true&& $Command" *> $log
    $code = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $old
    Pop-Location
  }
  $status = if($code -eq 0){"PASS"}else{"FAIL"}
  if($code -ne 0){
    if($Category -eq "code"){$script:codeFailed=$true}else{$script:environmentFailed=$true}
  }
  $script:results += [pscustomobject]@{name=$Name;category=$Category;command=$Command;status=$status;exitCode=$code;log=$log}
  Write-Host ("{0,-38} {1}" -f $Name,$status) -ForegroundColor $(if($code -eq 0){"Green"}else{"Red"})
}

Write-Host "=== OPSIQO 8.5 UNIVERSAL IMPORT + ATS VALIDATION ===" -ForegroundColor Cyan
Write-Host "Project : $Root"
Write-Host "Evidence: $Evidence"
Write-Host ""

Run-Gate "npm-ci" "code" "npm ci"
Run-Gate "completion-audit" "code" "npm run opsiqo85:completion:audit"
Run-Gate "ats-import-audit" "code" "npm run opsiqo85:ats-import:audit"
Run-Gate "typecheck" "code" "npm run typecheck"
Run-Gate "test" "code" "npm run test"
Run-Gate "test-opsiqo85" "code" "npm run test:opsiqo85"
Run-Gate "test-ats-import-v2" "code" "npm run test:ats-import:v2"
Run-Gate "build" "code" "npm run build"
Run-Gate "test-opsiqo8" "code" "npm run test:opsiqo8"
Run-Gate "test-rules" "code" "npm run test:rules"
Run-Gate "security" "code" "npm run security:static-scan"
Run-Gate "integration" "code" "npm run opsiqo8:integration:validate"
Run-Gate "source-manifest-generate" "code" "npm run source:manifest:generate"
Run-Gate "source-manifest-verify" "code" "npm run source:manifest:verify"
Run-Gate "production-preflight" "environment" "npm run preflight:production"
Run-Gate "invitation-diagnostic" "environment" "npm run opsiqo:invitation:diagnostic"

$summary=[ordered]@{
  schemaVersion="8.5-universal-import-ats-v2"
  generatedAtUtc=(Get-Date).ToUniversalTime().ToString("o")
  projectRoot=$Root
  evidenceRoot=$Evidence
  codeStatus=if($codeFailed){"FAIL"}else{"PASS"}
  environmentStatus=if($environmentFailed){"FAIL"}else{"PASS"}
  results=$results
  productionGo="NOT_IMPLIED"
}
$summary|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $Evidence "SUMMARY.json") -Encoding UTF8

if($codeFailed -or $environmentFailed){
  Write-Host ""
  Write-Host "Validation FAILED. Review evidence: $Evidence" -ForegroundColor Red
  foreach($f in @($results|Where-Object {$_.status -eq 'FAIL'})){
    Write-Host " - $($f.name): $($f.log)" -ForegroundColor Yellow
    if(Test-Path $f.log){Get-Content -LiteralPath $f.log -Tail 80}
  }
  exit 2
}

Write-Host ""
Write-Host "Validation PASS. Evidence: $Evidence" -ForegroundColor Green
Write-Host "This proves source/code and local environment gates only. Production GO still requires deployed ATS/import UAT, tenant/RBAC UAT, cutover and rollback evidence." -ForegroundColor Yellow
exit 0
