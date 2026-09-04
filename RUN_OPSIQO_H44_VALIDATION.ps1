$ErrorActionPreference = 'Stop'
Write-Host 'OPSIQO H44 VALIDATION' -ForegroundColor Magenta
if (-not (Test-Path '.\node_modules\.bin\tsc.cmd')) { Write-Host 'Dependencies are not installed in this extracted project.' -ForegroundColor Yellow; Write-Host 'Running reproducible npm ci...' -ForegroundColor Cyan; npm ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' } }
node .\scripts\opsiqo-h44-interview-intelligence-audit.mjs
if ($LASTEXITCODE -ne 0) { throw 'H44 static audit failed.' }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'TypeScript failed.' }
npx vitest run tests/recruiting-interview-intelligence-h44.test.ts tests/recruiting-auto-enrollment-h43.test.ts tests/recruiting-pdf-safety-h41.test.ts tests/recruiting-document-first-intake-h40.test.ts
if ($LASTEXITCODE -ne 0) { throw 'H44 recruiting regression tests failed.' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Full Vitest failed.' }
npm run test:rules
if ($LASTEXITCODE -ne 0) { throw 'Firestore Rules tests failed.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
node .\scripts\source-manifest.mjs generate
if ($LASTEXITCODE -ne 0) { throw 'Source manifest generation failed.' }
node .\scripts\source-manifest.mjs verify
if ($LASTEXITCODE -ne 0) { throw 'Source manifest verification failed.' }
Write-Host 'H44 AI STRUCTURED INTERVIEW INTELLIGENCE: PASS' -ForegroundColor Green
