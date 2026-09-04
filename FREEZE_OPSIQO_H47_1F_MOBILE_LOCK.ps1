$ErrorActionPreference = 'Stop'
Write-Host 'OPSIQO H47.1F MOBILE LOCK FREEZE + FINAL PACKAGE' -ForegroundColor Magenta
$ProjectRoot = (Get-Location).Path
$Mobile = Join-Path $ProjectRoot 'mobile'
$Lock = Join-Path $Mobile 'package-lock.json'

Push-Location $Mobile
try {
  Write-Host 'Resolving the certified H47.1F mobile dependency graph into package-lock.json...' -ForegroundColor Cyan
  if(Test-Path -LiteralPath $Lock){ Remove-Item -LiteralPath $Lock -Force }
  npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  if($LASTEXITCODE -ne 0){ throw 'Mobile package-lock generation failed.' }
  if(-not (Test-Path -LiteralPath $Lock -PathType Leaf)){ throw 'package-lock.json was not generated.' }
  # Windows PowerShell 5.1 ConvertFrom-Json cannot reliably parse npm lockfile v3
  # because packages contains an empty-string root key. Validate with Node instead.
  & node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if(p.lockfileVersion!==3){ console.error('Expected package-lock v3, got '+String(p.lockfileVersion)); process.exit(2); } console.log('package-lock v3 verified');" $Lock
  if($LASTEXITCODE -ne 0){ throw 'package-lock.json is not a valid npm lockfile v3.' }
} finally { Pop-Location }

Write-Host 'Generating the certified source manifest including the frozen mobile lock...' -ForegroundColor Cyan
node .\scripts\source-manifest.mjs generate
if($LASTEXITCODE -ne 0){ throw 'Source manifest generation failed.' }
node .\scripts\source-manifest.mjs verify
if($LASTEXITCODE -ne 0){ throw 'Source manifest verification failed.' }

Write-Host 'Running full H47.1F certification against npm ci...' -ForegroundColor Cyan
& .\RUN_OPSIQO_H47_1F_VALIDATION.ps1
if($LASTEXITCODE -ne 0){ throw 'H47.1F validation failed.' }

$Parent = Split-Path -Parent $ProjectRoot
$Stage = Join-Path ([System.IO.Path]::GetTempPath()) ('opsiqo-h471f-package-' + [Guid]::NewGuid().ToString('N'))
$Zip = Join-Path $Parent 'OPSIQO_H47_1F_MOBILE_REPRODUCIBLE_BUILD_BASELINE.zip'
$ShaFile = "$Zip.sha256"
try {
  New-Item -ItemType Directory -Path $Stage -Force | Out-Null
  $RoboArgs = @(
    $ProjectRoot, $Stage, '/MIR', '/R:1', '/W:1',
    '/XD', 'node_modules', '.next', '.expo', 'web-build', '.git', '.firebase', 'coverage', 'dist', 'build', 'artifacts',
    '/XF', '.env', '.env.local', '.env.production', '*.log', '*.tsbuildinfo'
  )
  & robocopy @RoboArgs | Out-Null
  if($LASTEXITCODE -ge 8){ throw "robocopy packaging failed with exit code $LASTEXITCODE." }
  if(Test-Path -LiteralPath $Zip){ Remove-Item -LiteralPath $Zip -Force }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($Stage, $Zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
  $Hash=(Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash.ToLowerInvariant()
  "$Hash  $(Split-Path -Leaf $Zip)" | Set-Content -LiteralPath $ShaFile -Encoding ascii
  Write-Host ''
  Write-Host 'H47.1F FINAL WINDOWS-FROZEN PACKAGE READY' -ForegroundColor Green
  Write-Host "ZIP: $Zip" -ForegroundColor Green
  Write-Host "SHA256: $Hash" -ForegroundColor Green
  Write-Host "SHA file: $ShaFile" -ForegroundColor Green
} finally {
  if(Test-Path -LiteralPath $Stage){ Remove-Item -LiteralPath $Stage -Recurse -Force }
}
