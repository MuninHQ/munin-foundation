$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Mobile.lnk'
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'cmd.exe'
$shortcut.Arguments = "/c cd /d `"$repo`" && npm run mobile"
$shortcut.WorkingDirectory = $repo
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start Munin Mobile Gateway with Windows'
$shortcut.Save()
Write-Host "Munin Mobile startup shortcut installed: $shortcutPath"
