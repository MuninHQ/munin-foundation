$ErrorActionPreference = 'Stop'
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Manus Bridge.lnk'
if (Test-Path $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }
Write-Host "Munin Manus Bridge startup shortcut removed: $shortcutPath"
