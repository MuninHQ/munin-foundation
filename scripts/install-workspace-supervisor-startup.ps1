$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Munin Workspace Supervisor.lnk'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $node
$shortcut.Arguments = "`"$(Join-Path $repo 'scripts\workspace-supervisor.mjs')`""
$shortcut.WorkingDirectory = $repo
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start the governed Munin Workspace supervisor with Windows'
$shortcut.Save()
Write-Host "Munin Workspace supervisor startup shortcut installed: $shortcutPath"
