$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Host Worker.lnk'
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'cmd.exe'
$shortcut.Arguments = "/c cd /d `"$repo`" && npm run host:worker -- --github-inbox"
$shortcut.WorkingDirectory = $repo
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start governed Munin Host Worker with zero-cost typed GitHub inbox polling'
$shortcut.Save()
Write-Host "Munin Host Worker startup shortcut installed: $shortcutPath"
