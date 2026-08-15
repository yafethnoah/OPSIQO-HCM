$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Run-Gate([string]$Name,[scriptblock]$Action) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
  Write-Host "PASS: $Name" -ForegroundColor Green
}

Write-Host "OPSIQO V7.1 validates the signed dependency baseline before installation." -ForegroundColor Yellow
Write-Host "Do NOT run npm audit fix --force on this release candidate." -ForegroundColor Yellow

Run-Gate 'Dependency baseline (manifest + lock)' { npm run opsiqo85:dependency-baseline:audit }
Run-Gate 'Clean dependency install' { npm ci }
Run-Gate 'Dependency baseline (installed tree)' { npm run opsiqo85:dependency-baseline:audit -- --installed }
Run-Gate 'V7 People / Members import audit' { npm run opsiqo85:people-import-v7:audit }
Run-Gate 'TypeScript' { npm run typecheck }
Run-Gate 'V7.1 ATS domain-event tests' { npm run test:v7.1-codegate }
Run-Gate 'Full Vitest suite' { npm test }
Run-Gate 'V7 employee PDF import tests' { npm run test:employee-import-v7 }
Run-Gate 'ATS + universal import V2 tests' { npm run test:ats-import:v2 }
Run-Gate 'OPSIQO 8.x tests' { npm run test:opsiqo8 }
Run-Gate 'Firestore Rules isolation audit' { npm run opsiqo85:rules-isolation:audit }
Run-Gate 'Firestore Rules (isolated emulator)' { npm run test:rules }
Run-Gate 'Production build' { npm run build }
Run-Gate 'Security static scan' { npm run security:static-scan }
Run-Gate 'Lockfile structural review' { npm run supplychain:lockfile-review }
Run-Gate '8.x integration validation' { npm run opsiqo8:integration:validate }
Run-Gate 'Local runtime audit' { npm run opsiqo85:local-runtime:audit }
Run-Gate 'Source manifest generation' { npm run source:manifest:generate }
Run-Gate 'Source manifest verification' { npm run source:manifest:verify }
Run-Gate 'Production preflight' { npm run preflight:production }

Write-Host "`nOPSIQO 8.5 V7.2 validation gates completed successfully." -ForegroundColor Green
