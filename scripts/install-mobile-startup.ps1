$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskName = 'Munin Mobile Guardian'
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$runner = Join-Path $repo 'scripts\run-mobile-guardian.ps1'

$action = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`"" -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Keeps the Munin mobile API and web gateway alive and restarts it after failures.' -Force | Out-Null

$startup = [Environment]::GetFolderPath('Startup')
$legacyShortcut = Join-Path $startup 'Munin Mobile.lnk'
if (Test-Path $legacyShortcut) { Remove-Item $legacyShortcut -Force }

Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 5
$task = Get-ScheduledTask -TaskName $taskName
$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Host "Munin Mobile Guardian installed and started. State=$($task.State); LastResult=$($info.LastTaskResult); Log=$repo\data\runtime\mobile-guardian.log"
