$ErrorActionPreference = 'Stop'
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Host Worker.lnk'
if (Test-Path $shortcutPath) {
  Remove-Item $shortcutPath -Force
  Write-Host "Munin Host Worker startup shortcut removed: $shortcutPath"
} else {
  Write-Host 'Munin Host Worker startup shortcut was not installed.'
}
