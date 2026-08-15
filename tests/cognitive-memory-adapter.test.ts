import test from 'node:test';
import assert from 'node:assert/strict';
import { NativeOnlyCognitiveMemory, cognitiveMemoryPolicy } from '../src/cognitive-memory-adapter.js';

test('native memory remains authoritative and fallback',()=>{
  const policy=cognitiveMemoryPolicy();
  assert.equal(policy.authoritative,'munin-native');
  assert.equal(policy.fallback,'munin-native');
  assert.equal(policy.externalWriteThrough,false);
  assert.equal(policy.promotionRequiresBenchmark,true);
  assert.equal(policy.preferredExperiment,'yantrikdb');
});

test('missing optional adapter degrades safely',async()=>{
  const adapter=new NativeOnlyCognitiveMemory();
  const health=await adapter.health();
  assert.equal(health.available,false);
  assert.equal(health.authoritative,false);
  assert.deepEqual(await adapter.recall('Munin'),[]);
});
