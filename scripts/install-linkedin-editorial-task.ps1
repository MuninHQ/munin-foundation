$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$task='Munin LinkedIn Editorial Radar'
$arguments="/c cd /d `"$repo`" && npm run linkedin:editorial:once"
$action=New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $arguments
$trigger=New-ScheduledTaskTrigger -Daily -At '08:00'
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $task -Action $action -Trigger $trigger -Settings $settings -Description 'Scans trusted sources and creates governed LinkedIn drafts when a current signal passes brand, novelty and repetition gates.' -Force | Out-Null
Write-Host "Installed scheduled task: $task (daily 08:00, StartWhenAvailable)"
Write-Host 'Default guardrails: maximum 2 drafts/week and 2 pending drafts; explicit approval remains required.'
