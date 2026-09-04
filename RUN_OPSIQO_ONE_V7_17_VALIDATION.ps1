$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Step([string]$Name,[scriptblock]$Action) {
  Write-Host ''
  Write-Host ('=' * 72) -ForegroundColor Magenta
  Write-Host " OPSIQO ONE V7.17 - $Name" -ForegroundColor Magenta
  Write-Host ('=' * 72) -ForegroundColor Magenta
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host 'OPSIQO ONE v7.17 local certification' -ForegroundColor Cyan
Write-Host "Project: $Root"
Write-Host 'SAFE - this runner does not print .env values, API keys, tokens, cookies or private keys.' -ForegroundColor Yellow
Write-Host 'SAFE - no Firebase/App Hosting deployment is performed.' -ForegroundColor Yellow
Write-Host 'NOTE - browser accessibility smoke is evidence, not a WCAG 2.2 AA conformance claim.' -ForegroundColor Yellow

Step 'Frozen source verification before install' { node scripts/source-manifest.mjs verify }
Step 'Clean release audit before install' { node scripts/opsiqo-clean-release-audit.mjs }
Step 'Locked dependency installation' { npm ci --no-audit --no-fund }
Step 'V7.17 Accessibility Translation Portfolio Execution audit' { npm run opsiqo85:opsiqo-one-v7.17:audit }
Step 'V7.16 regression' { npm run opsiqo85:opsiqo-one-v7.16:audit }
Step 'V7.15 regression' { npm run opsiqo85:opsiqo-one-v7.15:audit }
Step 'V7.14 regression' { npm run opsiqo85:opsiqo-one-v7.14:audit }
Step 'V7.13 regression' { npm run opsiqo85:opsiqo-one-v7.13:audit }
Step 'V7.12 regression' { npm run opsiqo85:opsiqo-one-v7.12:audit }
Step 'V7.11 regression' { npm run opsiqo85:opsiqo-one-v7.11:audit }
Step 'V7.10 regression' { npm run opsiqo85:opsiqo-one-v7.10:audit }
Step 'MFA regression audit' { npm run opsiqo85:mfa-hotfix:audit }
Step 'V7.9.3 UX functional closure audit' { npm run opsiqo85:ux-functional-closure-v7.9.3:audit }
Step 'Enterprise Self Service regression audit' { npm run opsiqo85:enterprise-self-service-v7.9:audit }
Step 'Automation V7.7 regression audit' { npm run opsiqo85:automation-v7.7:audit }
Step 'HCM 8.5 completion audit' { npm run opsiqo85:completion:audit }
Step 'ATS/import regression audit' { npm run opsiqo85:ats-import:audit }
Step 'Semantic TypeScript' { npm run typecheck }
Step 'V7.17 targeted tests' { npm run test:opsiqo-one-v7.17 }
Step 'V7.16 targeted tests' { npm run test:opsiqo-one-v7.16 }
Step 'V7.15 targeted tests' { npm run test:opsiqo-one-v7.15 }
Step 'V7.14 targeted tests' { npm run test:opsiqo-one-v7.14 }
Step 'V7.13 targeted tests' { npm run test:opsiqo-one-v7.13 }
Step 'V7.12 targeted tests' { npm run test:opsiqo-one-v7.12 }
Step 'V7.11 targeted tests' { npm run test:opsiqo-one-v7.11 }
Step 'V7.10 targeted tests' { npm run test:opsiqo-one-v7.10 }
Step 'HCM 8.5 regression suite' { npm run test:opsiqo85 }
Step 'Full Vitest suite' { npm test }
Step 'Firestore Rules isolation' { npm run test:rules }
Step 'Security static scan' { npm run security:static-scan }
Step 'Translation source inventory' { npm run opsiqo85:v7.17:translation-inventory }
Step 'Production Next.js build' { npm run build }
Step 'Release gate' { npm run release:gate }

$Server = $null
try {
  Write-Host ''
  Write-Host ('=' * 72) -ForegroundColor Magenta
  Write-Host ' OPSIQO ONE V7.17 - Built-app browser accessibility smoke' -ForegroundColor Magenta
  Write-Host ('=' * 72) -ForegroundColor Magenta

  $Server = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c','npm start -- -p 31717' -PassThru -WindowStyle Hidden
  $Ready = $false
  foreach ($Attempt in 1..90) {
    try {
      $Response = Invoke-WebRequest -Uri 'http://127.0.0.1:31717/signin' -UseBasicParsing -TimeoutSec 2
      if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500) { $Ready = $true; break }
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $Ready) { throw 'Built local Next.js server did not become reachable on port 31717.' }

  $env:OPSIQO_A11Y_BASE_URL = 'http://127.0.0.1:31717'
  npm run opsiqo85:v7.17:browser-a11y
  if ($LASTEXITCODE -ne 0) { throw "Browser accessibility smoke failed with exit code $LASTEXITCODE" }
}
finally {
  Remove-Item Env:OPSIQO_A11Y_BASE_URL -ErrorAction SilentlyContinue
  if ($Server -and -not $Server.HasExited) {
    & taskkill /PID $Server.Id /T /F | Out-Null
  }
}

Step 'Final frozen source verification' { node scripts/source-manifest.mjs verify }

Write-Host ''
Write-Host ('=' * 72) -ForegroundColor Green
Write-Host ' OPSIQO ONE V7.17 CERTIFICATION PASS' -ForegroundColor Green
Write-Host ('=' * 72) -ForegroundColor Green
