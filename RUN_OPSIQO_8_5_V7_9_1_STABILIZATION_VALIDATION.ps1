$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
function Run-Gate([string]$Name,[scriptblock]$Action){Write-Host "`n=== $Name ===" -ForegroundColor Cyan;& $Action;if($LASTEXITCODE -ne 0){throw "$Name failed with exit code $LASTEXITCODE"};Write-Host "PASS: $Name" -ForegroundColor Green}
Write-Host 'OPSIQO HCM 8.5 V7.9.1 immutable stabilization validation' -ForegroundColor Magenta
Write-Host 'Do NOT run npm audit fix --force on this release candidate.' -ForegroundColor Yellow
Run-Gate 'Frozen source manifest (before install)' { npm run source:manifest:verify:immutable }
Run-Gate 'Clean release audit' { npm run opsiqo:clean-release:audit }
Run-Gate 'Dependency baseline (manifest + lock)' { npm run opsiqo85:dependency-baseline:audit }
Run-Gate 'Clean dependency install' { npm ci }
Run-Gate 'Dependency baseline (installed tree)' { npm run opsiqo85:dependency-baseline:audit -- --installed }
Run-Gate 'V7.9.1 stabilization audit' { npm run opsiqo85:stabilization-v7.9.1:audit }
Run-Gate 'V7.9 enterprise self-service audit' { npm run opsiqo85:enterprise-self-service-v7.9:audit }
Run-Gate 'V7.8 employee portal audit' { npm run opsiqo85:employee-portal-v7.8:audit }
Run-Gate 'V7.7 automation audit' { npm run opsiqo85:automation-v7.7:audit }
Run-Gate 'People import audit' { npm run opsiqo85:people-import-v7:audit }
Run-Gate 'ATS/import audit' { npm run opsiqo85:ats-import:audit }
Run-Gate 'Completion audit' { npm run opsiqo85:completion:audit }
Run-Gate 'Rules isolation audit' { npm run opsiqo85:rules-isolation:audit }
Run-Gate 'Settings prerender audit' { npm run opsiqo85:settings-prerender:audit }
Run-Gate 'Production preflight truth audit' { npm run opsiqo85:production-preflight-truth:audit }
Run-Gate 'TypeScript' { npm run typecheck }
Run-Gate 'V7.9.1 stabilization tests' { npm run test:stabilization-v7.9.1 }
Run-Gate 'V7.9 tests' { npm run test:enterprise-self-service-v7.9 }
Run-Gate 'V7.8 tests' { npm run test:employee-portal-v7.8 }
Run-Gate 'V7.7 automation tests' { npm run test:automation-v7.7 }
Run-Gate 'V7.1 ATS domain-event tests' { npm run test:v7.1-codegate }
Run-Gate 'Full Vitest suite' { npm test }
Run-Gate 'Employee PDF import tests' { npm run test:employee-import-v7 }
Run-Gate 'ATS + universal import V2 tests' { npm run test:ats-import:v2 }
Run-Gate 'OPSIQO 8.x tests' { npm run test:opsiqo8 }
Run-Gate 'Firestore Rules' { npm run test:rules }
Run-Gate 'Production build' { npm run build }
Run-Gate 'Security static scan' { npm run security:static-scan }
Run-Gate 'Lockfile structural review' { npm run supplychain:lockfile-review }
Run-Gate '8.x integration validation' { npm run opsiqo8:integration:validate }
Run-Gate 'Production preflight' { npm run preflight:production }
Run-Gate 'Frozen source manifest (final)' { npm run source:manifest:verify:immutable }
Write-Host "`nOPSIQO HCM 8.5 V7.9.1 stabilization gates completed successfully." -ForegroundColor Green
