import test from 'node:test';
import assert from 'node:assert/strict';
import { benchmarkCapabilitySeam } from '../src/runtime-capability-benchmark.js';

test('capability seam benchmark emits stable structural metrics',async()=>{
 const result=await benchmarkCapabilitySeam(25);
 assert.equal(result.iterations,25);
 assert.ok(result.directNs>=0);
 assert.ok(result.seamNs>=0);
 assert.ok(result.overheadNs>=0);
 assert.ok(result.overheadRatio>=0);
 assert.equal(result.traceEventsPerCall,3);
});

test('capability seam benchmark validates iteration bounds',async()=>{
 await assert.rejects(benchmarkCapabilitySeam(1),/iterations must be an integer/);
});
