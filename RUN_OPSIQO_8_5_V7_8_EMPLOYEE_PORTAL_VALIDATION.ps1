$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Run-Gate([string]$Name,[scriptblock]$Action) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
  Write-Host "PASS: $Name" -ForegroundColor Green
}

Write-Host 'OPSIQO 8.5 V7.8 EMPLOYEE PORTAL - immutable-source validation' -ForegroundColor Cyan
Write-Host 'This verifier NEVER regenerates SOURCE_MANIFEST.sha256.' -ForegroundColor Yellow
Write-Host 'Do NOT run npm audit fix --force on this release candidate.' -ForegroundColor Yellow

Run-Gate 'Frozen source manifest (before install)' { npm run source:manifest:verify }
Run-Gate 'Clean release packaging audit' { npm run opsiqo:clean-release:audit }
Run-Gate 'Dependency baseline (manifest + lock)' { npm run opsiqo85:dependency-baseline:audit }
Run-Gate 'Clean dependency install' { npm ci }
Run-Gate 'Dependency baseline (installed tree)' { npm run opsiqo85:dependency-baseline:audit -- --installed }
Run-Gate 'V7.7 automation coverage audit' { npm run opsiqo85:automation-v7.7:audit }
Run-Gate 'V7.8 Employee Portal audit' { npm run opsiqo85:employee-portal-v7.8:audit }
Run-Gate 'V7 People / Members import audit' { npm run opsiqo85:people-import-v7:audit }
Run-Gate 'ATS + Universal Import audit' { npm run opsiqo85:ats-import:audit }
Run-Gate '8.5 completion audit' { npm run opsiqo85:completion:audit }
Run-Gate 'Firestore Rules isolation audit' { npm run opsiqo85:rules-isolation:audit }
Run-Gate 'Settings prerender safety audit' { npm run opsiqo85:settings-prerender:audit }
Run-Gate 'Production preflight truth audit' { npm run opsiqo85:production-preflight-truth:audit }
Run-Gate 'TypeScript' { npm run typecheck }
Run-Gate 'V7.8 Employee Portal governance tests' { npm run test:employee-portal-v7.8 }
Run-Gate 'V7.7 automation governance tests' { npm run test:automation-v7.7 }
Run-Gate 'V7.1 ATS domain-event tests' { npm run test:v7.1-codegate }
Run-Gate 'Full Vitest suite' { npm test }
Run-Gate 'V7 employee PDF import tests' { npm run test:employee-import-v7 }
Run-Gate 'ATS + universal import V2 tests' { npm run test:ats-import:v2 }
Run-Gate 'OPSIQO 8.x tests' { npm run test:opsiqo8 }
Run-Gate 'Firestore Rules (isolated emulator)' { npm run test:rules }
Run-Gate 'Production build' { npm run build }
Run-Gate 'Security static scan' { npm run security:static-scan }
Run-Gate 'Lockfile structural review' { npm run supplychain:lockfile-review }
Run-Gate '8.x integration validation' { npm run opsiqo8:integration:validate }
Run-Gate 'Local runtime audit' { npm run opsiqo85:local-runtime:audit }
Run-Gate 'Production preflight' { npm run preflight:production }
Run-Gate 'Frozen source manifest (after all gates)' { npm run source:manifest:verify }

Write-Host "`nPASS: OPSIQO 8.5 V7.8 EMPLOYEE PORTAL validation completed." -ForegroundColor Green
