import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CAREER_ISSUE_MARKER } from '../src/career-github-contract.js';
import { syncCareerGitHubIssues } from '../src/career-github-issue-sync.js';
import { MemoryLedger } from '../src/memory-ledger.js';
import { ContextStore } from '../src/store.js';

test('private GitHub queue is idempotent; approvals prepare but never submit applications', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-career-github-'));
  const store = new ContextStore(root);
  const ledger = new MemoryLedger(root);
  let decision = 'review';
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.match(String(input), /repos\/MuninHQ\/munin-core\/issues/);
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer synthetic-test-token');
    return {
      ok: true, status: 200,
      json: async () => [{
        number: 42, title: '[VAGA] Exemplo - Gerente de Produtos',
        html_url: 'https://github.com/MuninHQ/munin-core/issues/42',
        body: `${CAREER_ISSUE_MARKER}\n**URL:** https://example.com/jobs/42\n**Empresa:** Exemplo\n**Cargo:** Gerente de Produtos\n**Decisao:** ${decision}\n**Analise:** Aderente a pagamentos.`,
      }],
    } as Response;
  }) as typeof fetch;
  const opts = { store, ledger, fetcher, token: 'synthetic-test-token' };
  const first = await syncCareerGitHubIssues(opts);
  assert.equal(first.added, 1);
  assert.equal((await store.load()).jobs[0].status, 'discovered');
  decision = 'approved';
  const approved = await syncCareerGitHubIssues(opts);
  assert.equal(approved.added, 0);
  assert.equal(approved.updated, 1);
  assert.equal((await store.load()).jobs[0].status, 'investigating');
  assert.equal(await syncCareerGitHubIssues(opts).then(r => r.updated), 0);
  decision = 'discarded';
  assert.equal(await syncCareerGitHubIssues(opts).then(r => r.updated), 1);
  assert.equal((await store.load()).jobs[0].status, 'closed');
  assert.equal((await store.load()).jobs.length, 1);
});
test('sync fails closed without a private repository credential', async () => {
  await assert.rejects(() => syncCareerGitHubIssues({ token: '' }), /missing MUNIN_CAREER_GITHUB_TOKEN/);
});
