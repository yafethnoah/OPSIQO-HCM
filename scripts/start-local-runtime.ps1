[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$DoNotOpenBrowser
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $ProjectRoot

function Wait-ForPort {
    param(
        [Parameter(Mandatory=$true)][int]$Port,
        [int]$TimeoutSeconds = 60
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listener) { return $true }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    return $false
}

function Assert-FreePort {
    param([Parameter(Mandatory=$true)][int]$Port)
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
        throw "Port $Port is already in use by PID $($listener.OwningProcess) ($($proc.Name)). Command: $($proc.CommandLine)"
    }
}

Write-Host ''
Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host ' OPSIQO HCM 8.5 - Clean Local Runtime' -ForegroundColor Cyan
Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

# Clean only known stale OPSIQO/Firebase processes, never arbitrary Node/Java processes.
& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'cleanup-local-runtime.ps1') -IncludeCurrentProjectFrontend
if ($LASTEXITCODE -ne 0) { throw 'Local runtime cleanup failed.' }

foreach ($port in @(3000,4000,4400,4500,8080,9099,9150,9199)) {
    Assert-FreePort -Port $port
}

if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) { throw 'package.json not found in project root.' }
if (-not (Test-Path (Join-Path $ProjectRoot 'package-lock.json'))) { throw 'package-lock.json not found in project root.' }

if (-not $SkipInstall -and -not (Test-Path (Join-Path $ProjectRoot 'node_modules'))) {
    Write-Host '[OPSIQO-LOCAL] node_modules not found. Running npm ci...' -ForegroundColor Cyan
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE" }
}

Write-Host '[OPSIQO-LOCAL] Starting Firebase emulators in a dedicated window...' -ForegroundColor Cyan
$backendArgs = @(
    '-NoExit','-NoLogo','-NoProfile','-ExecutionPolicy','Bypass',
    '-Command', "Set-Location -LiteralPath '$($ProjectRoot.Replace("'","''"))'; npm.cmd run dev:backend"
)
$backend = Start-Process powershell.exe -ArgumentList $backendArgs -PassThru

foreach ($port in @(8080,9099,9199,4000)) {
    if (-not (Wait-ForPort -Port $port -TimeoutSeconds 90)) {
        throw "Firebase local runtime did not open port $port within 90 seconds. Check backend window PID $($backend.Id)."
    }
}
Write-Host '[OPSIQO-LOCAL] Firebase Auth/Firestore/Storage emulators are ready.' -ForegroundColor Green

Write-Host '[OPSIQO-LOCAL] Starting the V6 Next.js frontend in a dedicated window...' -ForegroundColor Cyan
$frontendArgs = @(
    '-NoExit','-NoLogo','-NoProfile','-ExecutionPolicy','Bypass',
    '-Command', "Set-Location -LiteralPath '$($ProjectRoot.Replace("'","''"))'; npm.cmd run dev:frontend"
)
$frontend = Start-Process powershell.exe -ArgumentList $frontendArgs -PassThru

if (-not (Wait-ForPort -Port 3000 -TimeoutSeconds 90)) {
    throw "Next.js did not open port 3000 within 90 seconds. Check frontend window PID $($frontend.Id)."
}

$fresh = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$healthUrl = "http://127.0.0.1:3000/register?runtime=v5&fresh=$fresh"
$ok = $false
for ($i=0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200 -and $r.Content -match 'Register account') { $ok = $true; break }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ok) {
    throw "Port 3000 opened but OPSIQO did not return an HTTP response at $healthUrl. Check the frontend window."
}

Write-Host ''
Write-Host '[OPSIQO-LOCAL] READY' -ForegroundColor Green
Write-Host "Backend window PID : $($backend.Id)"
Write-Host "Frontend window PID: $($frontend.Id)"
Write-Host 'Firebase UI        : http://127.0.0.1:4000'
Write-Host 'OPSIQO Register     : http://127.0.0.1:3000/register'
Write-Host 'OPSIQO Setup        : http://127.0.0.1:3000/setup'
Write-Host ''
Write-Host 'Keep both spawned PowerShell windows open while testing.' -ForegroundColor Yellow

if (-not $DoNotOpenBrowser) {
    Start-Process $healthUrl
}
