$ErrorActionPreference = 'Stop'
$taskName = 'Munin Mobile Guardian'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host 'Munin Mobile Guardian scheduled task removed.'
} else {
  Write-Host 'Munin Mobile Guardian scheduled task is not installed.'
}

$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Mobile.lnk'
if (Test-Path $shortcutPath) {
  Remove-Item $shortcutPath -Force
}
