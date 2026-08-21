$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repo

function Invoke-Git([string[]]$GitArgs) {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & git @GitArgs 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) { throw "git $($GitArgs -join ' ') failed: $output" }
  return ($output -join "`n")
}

$branch = (Invoke-Git @('branch','--show-current')).Trim()
if ($branch -ne 'main') { throw "Bootstrap requires main; current branch is '$branch'." }
$status = (Invoke-Git @('status','--porcelain')).Trim()
if ($status) { throw 'Working tree is not clean; refusing automatic update.' }

Write-Host '[Munin] Updating main with fast-forward only...'
Invoke-Git @('fetch','origin','main') | Out-Null
Invoke-Git @('merge','--ff-only','origin/main') | Write-Host

Write-Host '[Munin] Installing Host Worker startup shortcut...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\install-host-worker-startup.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Host Worker startup installation failed.' }

Write-Host '[Munin] Installing Workspace Supervisor startup shortcut...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\install-workspace-supervisor-startup.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Workspace Supervisor startup installation failed.' }

Write-Host '[Munin] Installing Email Intelligence startup shortcut...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\install-email-intelligence-startup.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Email Intelligence startup installation failed.' }

$apiHealth = 'http://127.0.0.1:4310/api/health'
$webUrl = 'http://127.0.0.1:5173'
$apiReady = $false
$webReady = $false
try { $apiReady = (Invoke-WebRequest -UseBasicParsing -Uri $apiHealth -TimeoutSec 2).StatusCode -eq 200 } catch {}
try { $webReady = (Invoke-WebRequest -UseBasicParsing -Uri $webUrl -TimeoutSec 2).StatusCode -eq 200 } catch {}
$workspaceReady = $apiReady -and $webReady
if (-not $workspaceReady) {
  Write-Host '[Munin] Starting governed Workspace Supervisor...'
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', "cd /d `"$repo`" && npm run workspace:supervisor") -WorkingDirectory $repo -WindowStyle Minimized
  for ($i=0; $i -lt 30 -and -not $workspaceReady; $i++) {
    Start-Sleep -Seconds 1
    try { $apiReady = (Invoke-WebRequest -UseBasicParsing -Uri $apiHealth -TimeoutSec 2).StatusCode -eq 200 } catch { $apiReady = $false }
    try { $webReady = (Invoke-WebRequest -UseBasicParsing -Uri $webUrl -TimeoutSec 2).StatusCode -eq 200 } catch { $webReady = $false }
    $workspaceReady = $apiReady -and $webReady
  }
} else {
  Write-Host '[Munin] Existing workspace is healthy. Supervisor is installed for the next clean Windows session; no unsafe process takeover attempted.'
}
if (-not $workspaceReady) { throw "Munin workspace did not become healthy (API ready: $apiReady; Web ready: $webReady)." }

Write-Host '[Munin] Running ChatGPT-first host acceptance...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\acceptance-chatgpt-first.ps1')
if ($LASTEXITCODE -ne 0) { throw 'ChatGPT-first acceptance failed.' }

Write-Host '[Munin] Bootstrap complete. Host Worker, Workspace Supervisor and Email Intelligence are installed for Windows startup.'
