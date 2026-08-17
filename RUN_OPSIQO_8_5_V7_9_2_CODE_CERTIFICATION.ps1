param([switch]$SkipInstall)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
function Run([string]$Label,[scriptblock]$Command){Write-Host "`n=== $Label ===" -ForegroundColor Cyan;& $Command;if($LASTEXITCODE -ne 0){throw "$Label failed with exit code $LASTEXITCODE"};Write-Host "PASS: $Label" -ForegroundColor Green}
Write-Host "OPSIQO 8.5 V7.9.3.3 CODE CERTIFICATION" -ForegroundColor Magenta

# Code certification must be deterministic and must not depend on a developer's
# local .env files or on production credentials. These non-secret public values
# exist only in this PowerShell process and are used solely to compile/test the
# Firebase client bundle. Production certification remains a separate gate.
$env:NEXT_PUBLIC_FIREBASE_API_KEY = "opsiqo-code-certification-key"
$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "opsiqo-code-certification.firebaseapp.com"
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = "opsiqo-code-certification"
$env:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "opsiqo-code-certification.appspot.com"
$env:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789012"
$env:NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789012:web:opsiqocodecertification"
$env:NEXT_PUBLIC_OPSIQO_PRODUCT_RELEASE = "8.5-v7.9.3.3"
$env:NEXT_PUBLIC_OPSIQO_CERTIFICATION_BASELINE = "3.6.1"

Run "Frozen source manifest before install" { node scripts/source-manifest.mjs verify }
Run "Clean release pre-install" { node scripts/opsiqo-clean-release-audit.mjs }
if(-not $SkipInstall){Run "Deterministic dependency install" { npm ci --registry=https://registry.npmjs.org --no-audit --no-fund }}
Run "TypeScript" { npm run typecheck }
Run "Full Vitest" { npm test }
Run "Firestore Rules" { npm run test:rules }
Run "Next.js production build" { npm run build }
Run "Security static scan" { npm run security:static-scan }
Run "Lockfile review" { npm run supplychain:lockfile-review }
Run "V7.9.2 certification repair audit" { npm run opsiqo85:certification-repair-v7.9.2:audit }
Run "V7.9.3 UX functional closure audit" { npm run opsiqo85:ux-functional-closure-v7.9.3:audit }
Run "ATS + universal import audit" { npm run opsiqo85:ats-import:audit }
Run "Enterprise self-service audit" { npm run opsiqo85:enterprise-self-service-v7.9:audit }
Run "Employee portal audit" { npm run opsiqo85:employee-portal-v7.8:audit }
Run "Automation audit" { npm run opsiqo85:automation-v7.7:audit }
Run "Integration validation" { npm run opsiqo8:integration:validate }
Run "Frozen source manifest after code gates" { node scripts/source-manifest.mjs verify }
Write-Host "`nCODE CERTIFICATION PASSED. Production evidence remains a separate gate." -ForegroundColor Green
