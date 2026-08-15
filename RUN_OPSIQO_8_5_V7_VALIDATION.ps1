$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'RUN_OPSIQO_8_5_V7_1_VALIDATION.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
