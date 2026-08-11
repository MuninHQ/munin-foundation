$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin HUD.lnk'
if (Test-Path $shortcutPath) {
  Remove-Item $shortcutPath -Force
  Write-Host "Munin HUD startup shortcut removed."
} else {
  Write-Host "Munin HUD startup shortcut is not installed."
}
