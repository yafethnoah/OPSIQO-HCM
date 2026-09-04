$ErrorActionPreference = "Stop"
Write-Host "OPSIQO H43 VALIDATION" -ForegroundColor Magenta

Write-Host "H43 DEPENDENCY PRE-FLIGHT" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath ".\node_modules\.bin\tsc.cmd" -PathType Leaf)) {
    throw "Dependencies are not installed. Run: npm ci --no-audit --no-fund"
}


node .\scripts\opsiqo-h43-recruiting-auto-enrollment-audit.mjs
if ($LASTEXITCODE -ne 0) { throw "H43 static audit failed." }

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript failed." }

npx vitest run tests/recruiting-auto-enrollment-h43.test.ts tests/recruiting-document-first-intake-h40.test.ts tests/recruiting-pdf-safety-h41.test.ts
if ($LASTEXITCODE -ne 0) { throw "H43 recruiting regression tests failed." }

npm test
if ($LASTEXITCODE -ne 0) { throw "Full Vitest regression failed." }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Production build failed." }

node .\scripts\source-manifest.mjs generate
if ($LASTEXITCODE -ne 0) { throw "Source manifest generation failed." }
node .\scripts\source-manifest.mjs verify
if ($LASTEXITCODE -ne 0) { throw "Source manifest verification failed." }

Write-Host "H43 RECRUITING AUTO-ENROLLMENT + DISPOSITION: PASS" -ForegroundColor Green
