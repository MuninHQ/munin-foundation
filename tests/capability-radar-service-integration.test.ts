import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runCapabilityRadar } from '../src/capability-radar-service.js';
import { JsonCapabilityDecisionLog } from '../src/json-capability-decision-log.js';
import { ProjectMemoryStore } from '../src/project-memory.js';

function repositoryResponse(): Response {
  return new Response(JSON.stringify({ items: [{
    full_name: 'example/useful-capability', html_url: 'https://github.com/example/useful-capability', description: 'Useful capability', archived: false,
    stargazers_count: 10000, forks_count: 1000, open_issues_count: 10,
    created_at: '2026-08-01T00:00:00Z', pushed_at: '2026-08-27T00:00:00Z', updated_at: '2026-08-27T00:00:00Z', license: { spdx_id: 'MIT' },
  }] }), { status: 200, headers: { 'content-type': 'application/json' } });
}

async function withStores(fn: (log: JsonCapabilityDecisionLog, memory: ProjectMemoryStore) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'munin-radar-'));
  try { await fn(new JsonCapabilityDecisionLog(join(root, 'decisions.json')), new ProjectMemoryStore(join(root, 'memory.json'))); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test('radar does not benchmark or promote when opportunity gate requests clarification', async () => withStores(async (log, memory) => {
  let benchmarkCalls = 0;
  const result = await runCapabilityRadar({
    query: 'agent capability', log, memory,
    fetcher: async () => repositoryResponse(),
    duplicationCollector: async () => ({ score: 0, matches: [] }),
    opportunityAssessor: input => ({ id: input.id, decision: 'CLARIFY', score: 0.6, reasons: ['needs more evidence'] }),
    benchmark: candidate => { benchmarkCalls++; return { id: candidate.id, status: 'promote', score: 1, checks: { zeroCost:true, licensed:true, maintained:true, secure:true, nonDuplicate:true, evidence:true, rollback:true }, reasons: [] }; },
  });
  assert.equal(result.opportunityClarify, 1);
  assert.equal(result.promoted, 0);
  assert.equal(benchmarkCalls, 0);
  assert.equal((await memory.currentState()).length, 0);
}));

test('radar promotes only after adoption, opportunity GO, and benchmark promotion', async () => withStores(async (log, memory) => {
  const result = await runCapabilityRadar({
    query: 'agent capability', log, memory,
    fetcher: async () => repositoryResponse(),
    duplicationCollector: async () => ({ score: 0, matches: [] }),
    opportunityAssessor: input => ({ id: input.id, decision: 'GO', score: 0.9, reasons: [] }),
    benchmark: candidate => ({ id: candidate.id, status: 'promote', score: 1, checks: { zeroCost:true, licensed:true, maintained:true, secure:true, nonDuplicate:true, evidence:true, rollback:true }, reasons: [] }),
  });
  assert.equal(result.adopt, 1);
  assert.equal(result.opportunityGo, 1);
  assert.equal(result.promoted, 1);
  const records = await memory.currentState();
  assert.equal(records.length, 1);
  assert.match(records[0]?.content ?? '', /Opportunity gate: GO/);
}));
