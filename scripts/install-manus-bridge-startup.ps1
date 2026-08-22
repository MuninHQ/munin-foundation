$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Manus Bridge.lnk'
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'cmd.exe'
$shortcut.Arguments = "/c cd /d `"$repo`" && npm run manus:worker"
$shortcut.WorkingDirectory = $repo
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start bounded Munin to Manus task result bridge with Windows'
$shortcut.Save()
Write-Host "Munin Manus Bridge startup shortcut installed: $shortcutPath"
