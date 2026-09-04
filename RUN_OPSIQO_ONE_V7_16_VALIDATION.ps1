$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Step([string]$Name,[scriptblock]$Action) {
  Write-Host ''
  Write-Host ('=' * 72) -ForegroundColor Magenta
  Write-Host " OPSIQO ONE V7.16 - $Name" -ForegroundColor Magenta
  Write-Host ('=' * 72) -ForegroundColor Magenta
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
}
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Write-Host 'OPSIQO ONE v7.16 local certification' -ForegroundColor Cyan
Write-Host "Project: $Root"
Write-Host 'SAFE - this runner does not print .env values, API keys, tokens, cookies or private keys.' -ForegroundColor Yellow
Write-Host 'SAFE - no Firebase/App Hosting deployment is performed.' -ForegroundColor Yellow
Step 'Frozen source verification before install' { node scripts/source-manifest.mjs verify }
Step 'Clean release audit before install' { node scripts/opsiqo-clean-release-audit.mjs }
Step 'Locked dependency installation' { npm ci --no-audit --no-fund }
Step 'V7.16 Accessible Multilingual Program Execution audit' { npm run opsiqo85:opsiqo-one-v7.16:audit }
Step 'V7.15 Connected Workforce Operations regression' { npm run opsiqo85:opsiqo-one-v7.15:audit }
Step 'V7.14 Launchpad/Adaptive/Mobile regression' { npm run opsiqo85:opsiqo-one-v7.14:audit }
Step 'V7.13 Agent/Memory/Policy/Marketplace regression' { npm run opsiqo85:opsiqo-one-v7.13:audit }
Step 'V7.12 Talent/Scenario/Value regression' { npm run opsiqo85:opsiqo-one-v7.12:audit }
Step 'V7.11 Cortex/Concierge/Governance regression' { npm run opsiqo85:opsiqo-one-v7.11:audit }
Step 'V7.10 foundation regression' { npm run opsiqo85:opsiqo-one-v7.10:audit }
Step 'MFA regression audit' { npm run opsiqo85:mfa-hotfix:audit }
Step 'V7.9.3 UX functional closure audit' { node scripts/opsiqo85-ux-functional-closure-v7-9-3-audit.mjs }
Step 'Enterprise Self Service regression audit' { npm run opsiqo85:enterprise-self-service-v7.9:audit }
Step 'Automation V7.7 regression audit' { npm run opsiqo85:automation-v7.7:audit }
Step 'HCM 8.5 completion audit' { npm run opsiqo85:completion:audit }
Step 'ATS/import regression audit' { npm run opsiqo85:ats-import:audit }
Step 'Semantic TypeScript' { npm run typecheck }
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
Step 'Final frozen source verification' { node scripts/source-manifest.mjs verify }
Write-Host ''
Write-Host ('=' * 72) -ForegroundColor Green
Write-Host ' OPSIQO ONE V7.16 CERTIFICATION PASS' -ForegroundColor Green
Write-Host ('=' * 72) -ForegroundColor Green
