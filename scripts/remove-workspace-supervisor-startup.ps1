$ErrorActionPreference = 'Stop'
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Workspace Supervisor.lnk'
if (Test-Path $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force; Write-Host "Removed: $shortcutPath" }
else { Write-Host 'Munin Workspace supervisor startup shortcut is not installed.' }
