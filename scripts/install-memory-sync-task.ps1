$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$bat=Join-Path $repo 'scripts\munin-memory-sync.bat'
$task='Munin ChatGPT Memory Sync'
$action=New-ScheduledTaskAction -Execute $bat
# Run near the start of the day; missed runs execute when Windows is next available.
$trigger=New-ScheduledTaskTrigger -Daily -At '06:00'
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $task -Action $action -Trigger $trigger -Settings $settings -Description 'Incrementally imports relevant ChatGPT export memories into local Munin continuity memory.' -Force | Out-Null
Write-Host "Installed scheduled task: $task (daily 06:00, StartWhenAvailable)"
Write-Host "Export inbox: $repo\data\import\chatgpt"
