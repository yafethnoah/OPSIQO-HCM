[CmdletBinding()]
param(
    [switch]$IncludeCurrentProjectFrontend
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Ports = @(3000,4000,4400,4500,8080,9099,9150,9199)

function Get-ListenerRows {
    $rows = @()
    foreach ($port in $Ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($connection in @($connections)) {
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)" -ErrorAction SilentlyContinue
            $rows += [pscustomobject]@{
                Port = $port
                PID = $connection.OwningProcess
                Name = $proc.Name
                CommandLine = $proc.CommandLine
            }
        }
    }
    return @($rows)
}

$rows = Get-ListenerRows
$targets = @{}

foreach ($row in $rows) {
    $cmd = [string]$row.CommandLine
    $isFirebaseEmulator =
        ($cmd -match 'cloud-firestore-emulator') -or
        (($cmd -match 'firebase-tools') -and ($cmd -match 'emulators:start'))

    $isKnownOldOpsiqo =
        ($cmd -match 'OPSIQO_HCM_8\.5_FULL_INTEGRATED_20260814-142259') -or
        ($cmd -match 'OPSIQO_HCM_8\.5_LOCAL_RUNTIME_REPAIRED_2026-08-14') -or
        ($cmd -match 'OPSIQO_HCM_8\.5_LOCAL_RUNTIME_V2_2026-08-14')

    $isCurrentFrontend =
        $IncludeCurrentProjectFrontend -and
        ($cmd -match [regex]::Escape($ProjectRoot)) -and
        ($row.Port -eq 3000)

    if ($isFirebaseEmulator -or $isKnownOldOpsiqo -or $isCurrentFrontend) {
        $targets[[int]$row.PID] = $row
    }
}

if ($targets.Count -eq 0) {
    Write-Host '[OPSIQO-LOCAL] No stale OPSIQO/Firebase listener processes found.' -ForegroundColor Green
} else {
    foreach ($pidValue in ($targets.Keys | Sort-Object)) {
        $row = $targets[$pidValue]
        Write-Host "[OPSIQO-LOCAL] Stopping PID $pidValue ($($row.Name)) from port $($row.Port)..." -ForegroundColor Yellow
        Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
}

$remaining = Get-ListenerRows
if ($remaining.Count) {
    Write-Host '[OPSIQO-LOCAL] Remaining listeners on required ports:' -ForegroundColor Yellow
    $remaining | Select-Object Port,PID,Name,CommandLine | Format-Table -AutoSize -Wrap
} else {
    Write-Host '[OPSIQO-LOCAL] All required local ports are free.' -ForegroundColor Green
}
