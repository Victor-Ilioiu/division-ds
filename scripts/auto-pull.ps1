# Keeps the local division-ds checkout in step with origin/main after merges on GitHub.
# Run by the Windows scheduled task "division-ds-auto-pull" every 10 minutes.
# It only fast-forwards. It does nothing if you are on another branch or have
# uncommitted changes to tracked files, so it can never overwrite your work.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$log  = Join-Path $env:LOCALAPPDATA 'division-ds-auto-pull.log'
function Log($m) { "$(Get-Date -Format s)  $m" | Add-Content $log }

try {
  Set-Location $repo
  $branch = (git branch --show-current).Trim()
  if ($branch -ne 'main') { exit 0 }                     # quiet: you are working on a branch
  if (git status --porcelain --untracked-files=no) { Log 'skipped: uncommitted changes'; exit 0 }
  git fetch --quiet origin main 2>&1 | Out-Null
  $behind = [int](git rev-list --count HEAD..origin/main)
  if ($behind -eq 0) { exit 0 }
  $out = git merge --ff-only origin/main 2>&1
  if ($LASTEXITCODE -ne 0) { Log "FAILED fast-forward: $out"; exit 1 }
  Log "pulled $behind commit(s), now $(git rev-parse --short HEAD)"
} catch { Log "ERROR: $_" ; exit 1 }

# Keep the log short.
if (Test-Path $log) { Get-Content $log -Tail 200 | Set-Content $log }
