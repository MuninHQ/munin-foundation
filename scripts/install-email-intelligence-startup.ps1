$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Email Intelligence.lnk'
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'cmd.exe'
$shortcut.Arguments = "/c cd /d `"$repo`" && npm run email:worker"
$shortcut.WorkingDirectory = $repo
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start bounded read-only Munin email intelligence worker with Windows'
$shortcut.Save()
Write-Host "Munin Email Intelligence startup shortcut installed: $shortcutPath"
