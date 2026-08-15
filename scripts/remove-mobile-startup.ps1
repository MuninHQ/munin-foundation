$ErrorActionPreference = 'Stop'
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Mobile.lnk'
if (Test-Path $shortcutPath) {
  Remove-Item $shortcutPath -Force
  Write-Host "Munin Mobile startup shortcut removed: $shortcutPath"
} else {
  Write-Host 'Munin Mobile startup shortcut is not installed.'
}
