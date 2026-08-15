$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$Evidence = Join-Path $Root ("artifacts\OPSIQO_8_5_COMPLETE_VALIDATION_" + $Stamp)
New-Item -ItemType Directory -Force -Path $Evidence | Out-Null
$results = @(); $failed = $false
function Run-Gate { param([string]$Name,[string]$Command)
  $log = Join-Path $Evidence ("gate-" + $Name + ".log")
  $old = $ErrorActionPreference
  Push-Location $Root
  try { $ErrorActionPreference="Continue"; cmd.exe /d /s /c "set CI=true&& set VITE_CONFIG_NATIVE_IGNORE_WARNING=true&& $Command" *> $log; $code=$LASTEXITCODE }
  finally { $ErrorActionPreference=$old; Pop-Location }
  $status=if($code -eq 0){"PASS"}else{"FAIL"}; if($code -ne 0){$script:failed=$true}
  $script:results += [pscustomobject]@{name=$Name;command=$Command;status=$status;exitCode=$code;log=$log}
  Write-Host ("{0,-34} {1}" -f $Name,$status) -ForegroundColor $(if($code -eq 0){"Green"}else{"Red"})
}
Write-Host "=== OPSIQO 8.5 COMPLETE IMPLEMENTATION VALIDATION ===" -ForegroundColor Cyan
Run-Gate "npm-ci" "npm ci"
Run-Gate "completion-audit" "npm run opsiqo85:completion:audit"
Run-Gate "typecheck" "npm run typecheck"
Run-Gate "test" "npm run test"
Run-Gate "test-opsiqo85" "npm run test:opsiqo85"
Run-Gate "build" "npm run build"
Run-Gate "test-opsiqo8" "npm run test:opsiqo8"
Run-Gate "test-rules" "npm run test:rules"
Run-Gate "security" "npm run security:static-scan"
Run-Gate "integration" "npm run opsiqo8:integration:validate"
Run-Gate "source-manifest-generate" "npm run source:manifest:generate"
if(-not $failed){Run-Gate "source-manifest-verify" "npm run source:manifest:verify"}
Run-Gate "production-preflight" "npm run preflight:production"
Run-Gate "invitation-diagnostic" "npm run opsiqo:invitation:diagnostic"
$summary=[ordered]@{schemaVersion="8.5-complete-implementation";generatedAtUtc=(Get-Date).ToUniversalTime().ToString("o");projectRoot=$Root;status=if($failed){"FAIL"}else{"PASS"};results=$results;productionGo="NOT_IMPLIED"}
$summary|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $Evidence "SUMMARY.json") -Encoding UTF8
if($failed){Write-Host "Validation FAILED. Review evidence: $Evidence" -ForegroundColor Red;exit 2}
Write-Host "Validation PASS. Evidence: $Evidence" -ForegroundColor Green
Write-Host "Source is code-green only after this PASS; production GO still requires deployed UAT/cutover/rollback evidence." -ForegroundColor Yellow
