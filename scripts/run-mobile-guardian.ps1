$ErrorActionPreference = 'Continue'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$launcher = Join-Path $repo 'scripts\launch-mobile.mjs'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$logDir = Join-Path $repo 'data\runtime'
$log = Join-Path $logDir 'mobile-guardian.log'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
Set-Location $repo

while ($true) {
  if ((Test-Path $log) -and (Get-Item $log).Length -gt 5MB) { Clear-Content $log }
  Add-Content $log "[$(Get-Date -Format o)] Starting Munin Mobile with $node"
  try {
    & $node $launcher *>> $log
    $exitCode = $LASTEXITCODE
  } catch {
    $exitCode = 1
    Add-Content $log "[$(Get-Date -Format o)] Runner error: $($_.Exception.Message)"
  }
  Add-Content $log "[$(Get-Date -Format o)] Munin Mobile exited with $exitCode; restarting in 5 seconds."
  Start-Sleep -Seconds 5
}
