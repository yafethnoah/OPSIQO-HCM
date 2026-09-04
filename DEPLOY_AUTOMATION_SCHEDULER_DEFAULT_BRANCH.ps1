param(
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$DefaultBranch = "main",
  [switch]$Apply
)
$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$Scheduler = Join-Path $ProjectRoot ".github\workflows\automation-scheduler.yml"
if (-not (Test-Path -LiteralPath $Scheduler)) { throw "Scheduler workflow not found: $Scheduler" }
Set-Location $ProjectRoot
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot ".git"))) { throw "Run this helper from a Git clone; .git is required." }
$remote = (git remote get-url origin).Trim(); if (-not $remote) { throw "origin remote is not configured." }
$worktree = Join-Path $env:TEMP ("opsiqo-scheduler-" + [guid]::NewGuid().ToString("N"))
Write-Host "Scheduler source: $Scheduler" -ForegroundColor Cyan
Write-Host "Target branch: $DefaultBranch" -ForegroundColor Cyan
Write-Host "Mode: $(if($Apply){'APPLY'}else{'DRY RUN'})" -ForegroundColor Yellow
if (-not $Apply) {
  Write-Host "Dry run only. Re-run with -Apply after review to synchronize only the scheduler workflow to the default branch." -ForegroundColor Green
  exit 0
}
try {
  git fetch origin $DefaultBranch
  if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }
  git worktree add --detach $worktree "origin/$DefaultBranch"
  if ($LASTEXITCODE -ne 0) { throw "git worktree add failed" }
  $dest = Join-Path $worktree ".github\workflows\automation-scheduler.yml"
  New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
  Copy-Item -LiteralPath $Scheduler -Destination $dest -Force
  Push-Location $worktree
  git checkout -B $DefaultBranch "origin/$DefaultBranch"
  git add ".github/workflows/automation-scheduler.yml"
  if (-not (git status --porcelain)) { Write-Host "Scheduler already matches $DefaultBranch." -ForegroundColor Green; Pop-Location; exit 0 }
  git commit -m "chore(automation): synchronize production scheduler workflow"
  if ($LASTEXITCODE -ne 0) { throw "git commit failed" }
  git push origin "HEAD:$DefaultBranch"
  if ($LASTEXITCODE -ne 0) { throw "git push failed" }
  Pop-Location
  Write-Host "Scheduler workflow synchronized to $DefaultBranch." -ForegroundColor Green
}
finally {
  if ((Get-Location).Path -eq $worktree) { Pop-Location }
  git -C $ProjectRoot worktree remove --force $worktree 2>$null | Out-Null
  if (Test-Path -LiteralPath $worktree) { Remove-Item -LiteralPath $worktree -Recurse -Force -ErrorAction SilentlyContinue }
}
