$script:OPSIQORealNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
function global:npm {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$NpmArgs)
    $joined = ($NpmArgs -join ' ').Trim()
    $isAuditFix = $joined -match '(?i)^audit\s+fix(?:\s|$)'
    $hasForce = $joined -match '(?i)(?:^|\s)--force(?:\s|$)'
    if ($isAuditFix -and $hasForce) {
        throw 'BLOCKED by OPSIQO release guard: npm audit fix --force invalidates the reviewed dependency baseline. Use npm audit --json instead.'
    }
    & $script:OPSIQORealNpm @NpmArgs
}
Write-Host 'OPSIQO release npm guard enabled for this PowerShell session.' -ForegroundColor Green
Write-Host 'Blocked command: npm audit fix --force' -ForegroundColor Yellow
