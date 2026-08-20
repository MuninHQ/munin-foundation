import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonHostJobQueue } from '../src/json-host-job-queue.js';
import { HostBridgeWorker } from '../src/host-bridge-worker.js';
import { HostBridgeExecutor } from '../src/host-bridge-executor.js';

test('host job queue persists and deduplicates typed jobs', async () => {
  const dir=await mkdtemp(join(tmpdir(),'munin-hostq-')); const path=join(dir,'queue.json');
  const q=new JsonHostJobQueue(path); const job={id:'j1',type:'runtime-health' as const,dryRun:true,createdAt:new Date().toISOString()};
  await q.enqueue(job); await q.enqueue(job);
  const reopened=new JsonHostJobQueue(path);
  assert.equal((await reopened.list()).length,1);
  assert.equal((await reopened.list())[0].status,'queued');
});

test('worker drains a queued job through governed executor and persists result', async () => {
  const dir=await mkdtemp(join(tmpdir(),'munin-hostq-')); const path=join(dir,'queue.json');
  const adapter={runtimeHealth:async()=> 'ok',gitFastForward:async()=> 'ok',restartMunin:async()=> 'no',runAcceptance:async()=> 'ok',tailscaleHealth:async()=> 'ok'};
  const executor=new HostBridgeExecutor(adapter);
  const worker=new HostBridgeWorker({queuePath:path},executor);
  await worker.queue.enqueue({id:'j2',type:'runtime-health',createdAt:new Date().toISOString()});
  assert.equal(await worker.runUntilEmpty(),1);
  const [item]=await worker.queue.list();
  assert.equal(item.status,'completed');
  assert.equal(item.result?.status,'completed');
  assert.deepEqual(item.result?.evidence,['ok']);
});
