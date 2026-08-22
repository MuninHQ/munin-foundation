$ErrorActionPreference='Stop'
$task='Munin LinkedIn Editorial Radar'
if(Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue){Unregister-ScheduledTask -TaskName $task -Confirm:$false;Write-Host "Removed scheduled task: $task"}else{Write-Host "Scheduled task not installed: $task"}
