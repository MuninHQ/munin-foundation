import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('Windows mobile guardian starts immediately and restarts after failures',async()=>{
  const install=await readFile(new URL('../../scripts/install-mobile-startup.ps1',import.meta.url),'utf8');
  const remove=await readFile(new URL('../../scripts/remove-mobile-startup.ps1',import.meta.url),'utf8');
  const runner=await readFile(new URL('../../scripts/run-mobile-guardian.ps1',import.meta.url),'utf8');
  assert.match(install,/Munin Mobile Guardian/);
  assert.match(install,/New-ScheduledTaskTrigger -AtLogOn/);
  assert.match(install,/-RestartCount 999/);
  assert.match(install,/-RestartInterval/);
  assert.match(install,/-ExecutionTimeLimit \(\[TimeSpan\]::Zero\)/);
  assert.match(install,/Register-ScheduledTask/);
  assert.match(install,/Start-ScheduledTask/);
  assert.match(install,/Get-ScheduledTaskInfo/);
  assert.match(install,/run-mobile-guardian\.ps1/);
  assert.match(install,/-WindowStyle Hidden/);
  assert.doesNotMatch(install,/cmd\.exe|npm run mobile/);
  assert.match(runner,/Get-Command node\.exe/);
  assert.match(runner,/mobile-guardian\.log/);
  assert.match(runner,/while \(\$true\)/);
  assert.match(runner,/restarting in 5 seconds/);
  assert.match(remove,/Stop-ScheduledTask/);
  assert.match(remove,/Unregister-ScheduledTask/);
});
