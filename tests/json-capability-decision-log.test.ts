import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonCapabilityDecisionLog } from '../src/json-capability-decision-log.js';

test('capability decisions survive restarts and suppress repeated assessment', async () => {
  const dir=await mkdtemp(join(tmpdir(),'munin-radar-')); const path=join(dir,'decisions.json');
  const first=new JsonCapabilityDecisionLog(path);
  await first.record({id:'tool-x',decision:'reject',score:0.2,reasons:['duplicate']},'2026-08-20T00:00:00.000Z');
  const second=new JsonCapabilityDecisionLog(path);
  assert.equal(await second.shouldReassess('tool-x'),false);
  assert.equal((await second.get('tool-x'))?.decision,'reject');
});

test('new evidence replaces prior decision for the same candidate', async () => {
  const dir=await mkdtemp(join(tmpdir(),'munin-radar-')); const path=join(dir,'decisions.json');
  const log=new JsonCapabilityDecisionLog(path);
  await log.record({id:'tool-y',decision:'review',score:0.5,reasons:['license missing']});
  await log.record({id:'tool-y',decision:'adopt',score:0.9,reasons:['evidence complete']});
  assert.equal((await log.list()).length,1);
  assert.equal((await log.get('tool-y'))?.decision,'adopt');
});
