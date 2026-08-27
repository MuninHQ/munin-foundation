import test from 'node:test';
import assert from 'node:assert/strict';
import { runMuninSecurityBench } from '../src/agent-security-policy-evaluator.js';

test('Munin policy blocks the full deterministic agent security baseline',async()=>{const report=await runMuninSecurityBench();assert.equal(report.total,12);assert.equal(report.failed,0);assert.equal(report.score,100);assert.ok(report.results.every(item=>item.safe))});
