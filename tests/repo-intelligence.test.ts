import test from 'node:test';
import assert from 'node:assert/strict';
import { RepoIntelligenceProvider } from '../src/repo-intelligence.js';

test('health always exposes native fallback when optional providers are absent', async () => {
  const provider = new RepoIntelligenceProvider('/repo', async () => ({ ok: false, stdout: '', stderr: 'not installed' }));
  const health = await provider.health();
  assert.equal(health.find((item) => item.source === 'rag-rat')?.available, false);
  assert.equal(health.find((item) => item.source === 'graphify')?.available, false);
  assert.equal(health.find((item) => item.source === 'native')?.available, true);
});

test('impact fails open when neither optional index nor Git inspection is available', async () => {
  const provider = new RepoIntelligenceProvider('/repo', async () => ({ ok: false, stdout: '', stderr: 'missing' }));
  const result = await provider.impact('change durable effects');
  assert.equal(result.coverage, 'unknown');
  assert.deepEqual(result.files, []);
  assert.equal(result.evidence[0]?.source, 'native');
});

test('native fallback ranks tracked path/content matches and related tests with git provenance', async () => {
  const calls:string[][]=[];
  const provider = new RepoIntelligenceProvider('/repo', async (file,args) => {
    calls.push([file,...args]);
    if(file!=='git') return {ok:false,stdout:'',stderr:'not installed'};
    if(args[0]==='ls-files') return {ok:true,stdout:'src/durable-effects.ts\nsrc/other.ts\ntests/durable-effects.test.ts\ntests/unrelated.test.ts\n',stderr:''};
    if(args[0]==='grep') return {ok:true,stdout:'src/durable-effects.ts\ntests/durable-effects.test.ts\n',stderr:''};
    if(args[0]==='log') return {ok:true,stdout:'abc123 add durable effect ledger',stderr:''};
    return {ok:false,stdout:'',stderr:''};
  });
  const result=await provider.impact('durable effects recovery');
  assert.equal(result.coverage,'partial');
  assert.equal(result.files[0],'src/durable-effects.ts');
  assert.ok(result.tests.includes('tests/durable-effects.test.ts'));
  assert.ok(result.evidence.some(item=>item.path==='src/durable-effects.ts'));
  assert.ok(result.evidence.some(item=>item.rationale?.includes('abc123 add durable effect ledger')));
  assert.ok(calls.some(call=>call[0]==='git'&&call[1]==='grep'));
});

test('impact uses rag-rat JSON when available without invoking native fallback', async () => {
  const provider = new RepoIntelligenceProvider('/repo', async (_file, args) => {
    if (args[0] === 'impact-surface') return { ok: true, stdout: JSON.stringify({ files: ['src/a.ts'], symbols: ['execute'], tests: ['tests/a.test.ts'], confidence: 0.94, rationale: 'source anchored' }), stderr: '' };
    return { ok: false, stdout: '', stderr: '' };
  });
  const result = await provider.impact('execute');
  assert.equal(result.coverage, 'indexed');
  assert.deepEqual(result.files, ['src/a.ts']);
  assert.deepEqual(result.tests, ['tests/a.test.ts']);
  assert.equal(result.evidence[0]?.source, 'rag-rat');
  assert.equal(result.evidence[0]?.confidence, 0.94);
});
