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
  const adapter={runtimeHealth:async()=> 'ok',gitFastForward:async()=> 'ok',deployMain:async()=> 'deployed',restartMunin:async()=> 'no',runAcceptance:async()=> 'ok',tailscaleHealth:async()=> 'ok',buildAll:async(objective:string)=> `built:${objective}`};
  const executor=new HostBridgeExecutor(adapter);
  const worker=new HostBridgeWorker({queuePath:path},executor);
  await worker.queue.enqueue({id:'j2',type:'runtime-health',createdAt:new Date().toISOString()});
  assert.equal(await worker.runUntilEmpty(),1);
  const [item]=await worker.queue.list();
  assert.equal(item.status,'completed');
  assert.equal(item.result?.status,'completed');
  assert.deepEqual(item.result?.evidence,['ok']);
});


test('expired read-only host job lease is recovered and retried', async () => {
  const dir=await mkdtemp(join(tmpdir(),'munin-hostq-lease-')); const path=join(dir,'queue.json');
  const q=new JsonHostJobQueue(path);
  await q.enqueue({id:'lease-safe',type:'runtime-health',createdAt:new Date(0).toISOString()});
  const first=await q.claimNext({leaseMs:5000,now:0});
  assert.equal(first?.status,'running');
  assert.equal(first?.attempts,1);
  const second=await q.claimNext({leaseMs:5000,now:6000});
  assert.equal(second?.job.id,'lease-safe');
  assert.equal(second?.attempts,2);
  assert.ok(second?.recoveredAt);
});

test('expired consequential host job lease blocks blind replay', async () => {
  const dir=await mkdtemp(join(tmpdir(),'munin-hostq-reconcile-')); const path=join(dir,'queue.json');
  const q=new JsonHostJobQueue(path);
  await q.enqueue({id:'lease-risky',type:'deploy-main',repo:'MuninHQ/munin-foundation',branch:'main',createdAt:new Date(0).toISOString()});
  await q.claimNext({leaseMs:5000,now:0});
  const next=await q.claimNext({leaseMs:5000,now:6000});
  assert.equal(next,undefined);
  const [item]=await q.list();
  assert.equal(item.status,'blocked');
  assert.match(item.result?.summary ?? '',/reconciled/i);
  assert.equal(item.attempts,1);
});
