$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Step([string]$Name,[scriptblock]$Action) {
  Write-Host ''
  Write-Host ('=' * 76) -ForegroundColor Magenta
  Write-Host " OPSIQO ONE V7.19 - $Name" -ForegroundColor Magenta
  Write-Host ('=' * 76) -ForegroundColor Magenta
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
}
function Wait-TcpPort([int]$Port,[int]$Attempts=90) {
  foreach ($Attempt in 1..$Attempts) {
    $Client = $null
    try {
      $Client = [System.Net.Sockets.TcpClient]::new()
      $Task = $Client.ConnectAsync('127.0.0.1',$Port)
      if ($Task.Wait(1000) -and $Client.Connected) { $Client.Dispose(); return }
    } catch {} finally { if ($Client) { $Client.Dispose() } }
    Start-Sleep -Seconds 1
  }
  throw "Port $Port did not become ready."
}
function Clear-V719DemoEnvironment {
  'NEXT_PUBLIC_OPSIQO_DEMO_MODE','NEXT_PUBLIC_OPSIQO_DEMO_ORG_ID','NEXT_PUBLIC_OPSIQO_ORG_ID','NEXT_PUBLIC_OPSIQO_USE_FIREBASE_EMULATORS','NEXT_PUBLIC_FIREBASE_PROJECT_ID','NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL','OPSIQO_DEMO_MODE','OPSIQO_DEMO_ORG_ID','OPSIQO_DEMO_UID','OPSIQO_DEMO_WORKER_ID','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST','FIREBASE_PROJECT_ID','GOOGLE_CLOUD_PROJECT','OPSIQO_A11Y_BASE_URL' | ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
}
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Write-Host 'OPSIQO ONE v7.19 local certification' -ForegroundColor Cyan
Write-Host "Project: $Root"
Write-Host 'SAFE - this runner does not print .env values, API keys, tokens, cookies or private keys.' -ForegroundColor Yellow
Write-Host 'SAFE - no Firebase/App Hosting production deployment is performed.' -ForegroundColor Yellow
Write-Host 'NOTE - browser accessibility evidence is not a WCAG 2.2 AA conformance claim.' -ForegroundColor Yellow
Write-Host 'NOTE - the authenticated browser pass uses only local Firebase emulators and seeded demo data.' -ForegroundColor Yellow

Step 'Frozen source verification before install' { node scripts/source-manifest.mjs verify }
Step 'Clean release audit before install' { node scripts/opsiqo-clean-release-audit.mjs }
Step 'Locked dependency installation' { npm ci --no-audit --no-fund }
Step 'V7.19 Operational UAT Translation Hardening audit' { npm run opsiqo85:opsiqo-one-v7.19:audit }
Step 'V7.19 translation inventory snapshot verification' { npm run opsiqo85:v7.19:translation-inventory:verify }
Step 'V7.18 regression' { npm run opsiqo85:opsiqo-one-v7.18:audit }
Step 'V7.17 regression' { npm run opsiqo85:opsiqo-one-v7.17:audit }
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
Step 'V7.19 targeted tests' { npm run test:opsiqo-one-v7.19 }
Step 'V7.18 targeted tests' { npm run test:opsiqo-one-v7.18 }
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
Step 'Production Next.js build' { npm run build }
Step 'Release gate' { npm run release:gate }

$PublicServer = $null
try {
  Write-Host ''
  Write-Host ('=' * 76) -ForegroundColor Magenta
  Write-Host ' OPSIQO ONE V7.19 - Built-app public browser accessibility smoke' -ForegroundColor Magenta
  Write-Host ('=' * 76) -ForegroundColor Magenta
  $PublicServer = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c','npm start -- -p 31717' -PassThru -WindowStyle Hidden
  $Ready = $false
  foreach ($Attempt in 1..90) { try { $Response=Invoke-WebRequest -Uri 'http://127.0.0.1:31717/signin' -UseBasicParsing -TimeoutSec 2; if($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500){$Ready=$true;break} } catch { Start-Sleep -Seconds 1 } }
  if(-not $Ready){throw 'Built production server did not become reachable on port 31717.'}
  $env:OPSIQO_A11Y_BASE_URL='http://127.0.0.1:31717'
  npm run opsiqo85:v7.17:browser-a11y
  if($LASTEXITCODE -ne 0){throw "Public browser accessibility smoke failed with exit code $LASTEXITCODE"}
} finally {
  Remove-Item Env:OPSIQO_A11Y_BASE_URL -ErrorAction SilentlyContinue
  if($PublicServer -and -not $PublicServer.HasExited){& taskkill /PID $PublicServer.Id /T /F | Out-Null}
}

$Emulators=$null;$DemoServer=$null
try {
  Write-Host ''
  Write-Host ('=' * 76) -ForegroundColor Magenta
  Write-Host ' OPSIQO ONE V7.19 - Authenticated emulator-backed accessibility UAT' -ForegroundColor Magenta
  Write-Host ('=' * 76) -ForegroundColor Magenta
  $env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
  $env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
  $env:FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9199'
  $env:FIREBASE_PROJECT_ID='demo-opsiqo-local'
  $env:GOOGLE_CLOUD_PROJECT='demo-opsiqo-local'
  $env:OPSIQO_DEMO_MODE='true'
  $env:OPSIQO_DEMO_ORG_ID='demo-org'
  $env:OPSIQO_DEMO_UID='demo-admin'
  $env:OPSIQO_DEMO_WORKER_ID='worker-001'
  $env:NEXT_PUBLIC_OPSIQO_DEMO_MODE='true'
  $env:NEXT_PUBLIC_OPSIQO_DEMO_ORG_ID='demo-org'
  $env:NEXT_PUBLIC_OPSIQO_ORG_ID='demo-org'
  $env:NEXT_PUBLIC_OPSIQO_USE_FIREBASE_EMULATORS='true'
  $env:NEXT_PUBLIC_FIREBASE_PROJECT_ID='demo-opsiqo-local'
  $env:NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL='http://127.0.0.1:9099'
  $Emulators=Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c','firebase emulators:start --config firebase.test.json --only auth,firestore,storage --project demo-opsiqo-local' -PassThru -WindowStyle Hidden
  Wait-TcpPort 8080;Wait-TcpPort 9099;Wait-TcpPort 9199
  npm run seed
  if($LASTEXITCODE -ne 0){throw "Demo seed failed with exit code $LASTEXITCODE"}
  npm run build
  if($LASTEXITCODE -ne 0){throw "Demo accessibility build failed with exit code $LASTEXITCODE"}
  $DemoServer=Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c','npm start -- -p 31719' -PassThru -WindowStyle Hidden
  $Ready=$false
  foreach($Attempt in 1..90){try{$Response=Invoke-WebRequest -Uri 'http://127.0.0.1:31719/home' -UseBasicParsing -TimeoutSec 2;if($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500){$Ready=$true;break}}catch{Start-Sleep -Seconds 1}}
  if(-not $Ready){throw 'Authenticated demo server did not become reachable on port 31718.'}
  $env:OPSIQO_A11Y_BASE_URL='http://127.0.0.1:31719'
  npm run opsiqo85:v7.19:browser-a11y-auth
  if($LASTEXITCODE -ne 0){throw "Authenticated browser accessibility UAT failed with exit code $LASTEXITCODE"}
} finally {
  if($DemoServer -and -not $DemoServer.HasExited){& taskkill /PID $DemoServer.Id /T /F | Out-Null}
  if($Emulators -and -not $Emulators.HasExited){& taskkill /PID $Emulators.Id /T /F | Out-Null}
  Clear-V719DemoEnvironment
}

Step 'Final production rebuild after emulator UAT' { npm run build }
Step 'Final release gate after production rebuild' { npm run release:gate }
Step 'Final frozen source verification' { node scripts/source-manifest.mjs verify }
Write-Host ''
Write-Host ('=' * 76) -ForegroundColor Green
Write-Host ' OPSIQO ONE V7.19 CERTIFICATION PASS' -ForegroundColor Green
Write-Host ('=' * 76) -ForegroundColor Green
