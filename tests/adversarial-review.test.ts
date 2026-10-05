import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readFile, appendFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { AdversarialReview, SubscriptionCliReviewer, gitReviewSnapshot, parseModelReview, subscriptionEnvironment, type ReviewSnapshot, type CrossReviewer } from '../src/adversarial-review.js';
import { GitProductionBuildAllVerifier, type VerificationCommandRunner } from '../src/production-build-all-verifier.js';

const snapshot: ReviewSnapshot = { base: 'a'.repeat(40), head: 'b'.repeat(40), diffHash: 'c'.repeat(64), diff: '+safe change', files: ['src/example.ts'] };
const ship = { verdict: 'SHIP', summary: 'Reviewed', findings: [] };
const fix = { verdict: 'FIX FIRST', summary: 'Fix bug', findings: [{ severity: 'warning', area: 'code', finding: 'Bug' }] };
const reviewer = (family: 'claude' | 'codex', response: unknown = ship): CrossReviewer => ({ family, async review() { return JSON.stringify(response); } });
async function fixture(fn: (service: AdversarialReview, dir: string) => Promise<void>, reviewers = [reviewer('claude'), reviewer('codex')]) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-cross-review-'));
  try { await fn(new AdversarialReview(dir, reviewers), dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

test('strict verdict parser refuses malformed, unknown and contradictory approvals', () => {
  assert.throws(() => parseModelReview('looks good'));
  assert.throws(() => parseModelReview('{"verdict":"approve","summary":"ok","findings":[]}'));
  assert.throws(() => parseModelReview(JSON.stringify({ ...fix, verdict: 'SHIP' })));
  assert.deepEqual(parseModelReview(JSON.stringify(ship)), ship);
});

test('paid and alternate provider credentials are removed from child environment', () => {
  const env = subscriptionEnvironment({ PATH: 'path', OPENAI_API_KEY: 'private', ANTHROPIC_API_KEY: 'private', ANTHROPIC_AUTH_TOKEN: 'private', OPENAI_BASE_URL: 'url', CLAUDE_CODE_USE_BEDROCK: '1' });
  assert.equal(env.PATH, 'path');
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.ANTHROPIC_AUTH_TOKEN, undefined);
  assert.equal(env.CLAUDE_CODE_USE_BEDROCK, undefined);
});

test('subscription CLI rejects API auth before inference, and Codex uses enforced read-only flags', async () => {
  for (const family of ['claude', 'codex'] as const) {
    let calls = 0;
    const adapter = new SubscriptionCliReviewer(family, async () => { calls++; return family === 'claude' ? '{"loggedIn":true,"authMethod":"apiKey","apiProvider":"firstParty"}' : 'Logged in using an API key'; });
    await assert.rejects(adapter.review(snapshot), /subscription/i);
    assert.equal(calls, 1);
  }
  let calls = 0;
  const adapter = new SubscriptionCliReviewer('codex', async (_file, args, _cwd, input, env) => {
    calls++;
    if (calls === 1) return 'Logged in using ChatGPT';
    assert.ok(args.includes('--ignore-user-config'));
    assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
    assert.equal(args[args.indexOf('--ask-for-approval') + 1], 'never');
    assert.equal(env?.OPENAI_API_KEY, undefined);
    assert.ok(input?.includes(snapshot.diff));
    return JSON.stringify(ship);
  });
  assert.equal(parseModelReview(await adapter.review(snapshot)).verdict, 'SHIP');
  assert.equal(calls, 2);
  await assert.rejects(adapter.review({ ...snapshot, diff: 'otp=123456' }), /sensitive/i);
  assert.equal(calls, 2);
});

test('gate defaults off, consensus binds exact base head and diff; newer failure invalidates approval', async () => {
  await fixture(async service => {
    assert.equal((await service.checkGate(snapshot)).enabled, false);
    await service.setGate(true);
    assert.equal((await service.checkGate(snapshot)).allowed, false);
    const result = await service.run(snapshot);
    assert.equal(result.verdict, 'SHIP');
    assert.equal(result.consensus, true);
    assert.equal((await service.checkGate(snapshot)).allowed, true);
    for (const change of [{ head: 'd'.repeat(40) }, { diffHash: 'd'.repeat(64) }, { base: 'd'.repeat(40) }]) {
      assert.equal((await service.checkGate({ ...snapshot, ...change })).allowed, false);
    }
    const blocked = new AdversarialReview(service.repo, [reviewer('claude', fix), reviewer('codex')]);
    await blocked.run(snapshot);
    assert.equal((await service.checkGate(snapshot)).allowed, false);
  });
});

test('independent requests see same input, never the other current review', async () => {
  const seen: string[] = [];
  const reviewers: CrossReviewer[] = ['claude', 'codex'].map(family => ({ family: family as 'claude' | 'codex', async review(input) { seen.push(input.diff); return JSON.stringify(ship); } }));
  await fixture(async service => { await service.run(snapshot); assert.deepEqual(seen, [snapshot.diff, snapshot.diff]); }, reviewers);
});

test('bounded corrections rereview new snapshots and stop after three rounds', async () => {
  await fixture(async service => {
    let repairs = 0;
    const result = await service.run(snapshot, async current => { repairs++; return { ...current, head: String(repairs).repeat(40) }; });
    assert.equal(result.rounds, 3);
    assert.equal(repairs, 2);
    assert.equal(result.consensus, false);
    assert.equal(result.verdict, 'FIX FIRST');
  }, [reviewer('claude', fix), reviewer('codex')]);
});

test('repair can reach consensus on a corrected snapshot in round two', async () => {
  let calls = 0;
  await fixture(async service => {
    const result = await service.run(snapshot, async current => ({ ...current, head: 'd'.repeat(40) }));
    assert.equal(result.rounds, 2);
    assert.equal(result.consensus, true);
  }, [{ family: 'claude', async review() { return JSON.stringify(++calls === 1 ? fix : ship); } }, reviewer('codex')]);
});

test('model failure, same family, empty input and malformed output never SHIP', async () => {
  await fixture(async service => {
    const result = await service.run(snapshot);
    assert.equal(result.consensus, false);
    assert.equal(result.verdict, 'FIX FIRST');
  }, [{ family: 'claude', async review() { throw new Error('private provider error'); } }, reviewer('codex')]);
  await fixture(async service => { await assert.rejects(service.run(snapshot), /distinct/i); }, [reviewer('codex'), reviewer('codex')]);
  await fixture(async service => { await assert.rejects(service.run({ ...snapshot, diff: '' }), /empty/i); });
});

test('ledger uses existing integrity chain; redacts summaries and never stores raw diff', async () => {
  await fixture(async (service, dir) => {
    await service.run({ ...snapshot, diff: '+private-source-marker' });
    const file = path.join(dir, 'data/runtime/adversarial-review.jsonl');
    const raw = await readFile(file, 'utf8');
    assert.equal(raw.includes('private-source-marker'), false);
    assert.equal(raw.includes('sk-abcdefghijklmnop'), false);
    await service.setGate(true);
    await appendFile(file, '{}\n');
    assert.equal((await service.checkGate(snapshot)).allowed, false);
  }, [reviewer('claude', { ...ship, summary: 'sk-abcdefghijklmnop' }), reviewer('codex')]);
});

test('REDESIGN takes precedence and is never repaired automatically', async () => {
  await fixture(async service => {
    const result = await service.run(snapshot, async () => { throw new Error('must not repair'); });
    assert.equal(result.verdict, 'REDESIGN');
    assert.equal(result.rounds, 1);
  }, [reviewer('claude', { ...ship, verdict: 'REDESIGN' }), reviewer('codex')]);
});

async function gitFixture(fn: (dir: string, base: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-review-git-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  try {
    git('init'); git('config', 'user.name', 'Review Fixture'); git('config', 'user.email', 'fixture@example.invalid');
    git('config', 'core.autocrlf', 'false');
    await writeFile(path.join(dir, 'example.ts'), 'export const value = 1;\n');
    git('add', 'example.ts'); git('-c', 'core.hooksPath=', 'commit', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    await writeFile(path.join(dir, 'example.ts'), 'export const value = 2;\n');
    git('add', 'example.ts'); git('-c', 'core.hooksPath=', 'commit', '-m', 'change');
    await fn(dir, base);
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test('Git scope refuses leftover sensitive JWT, OTP and Portuguese password before inference', async () => {
  await gitFixture(async (dir, base) => {
    for (const synthetic of ['eyJaaaaaa.aaaaaa.aaaaaa', 'otp=123456', 'senha=fixture-only-value', '-----BEGIN PRIVATE KEY-----']) {
      await writeFile(path.join(dir, 'example.ts'), `// synthetic fixture only\n${synthetic}\n`);
      execFileSync('git', ['add', 'example.ts'], { cwd: dir });
      execFileSync('git', ['-c', 'core.hooksPath=', 'commit', '-m', 'synthetic secret'], { cwd: dir, stdio: 'pipe' });
      await assert.rejects(gitReviewSnapshot(dir, base), /sensitive|private key/i);
    }
  });
});

test('real Git snapshots bind commits, reject empty/unsafe refs and redact supported credentials', async () => {
  await gitFixture(async (dir, base) => {
    const current = await gitReviewSnapshot(dir, base);
    assert.equal(current.base, base);
    assert.equal(current.head.length, 40);
    assert.deepEqual(current.files, ['example.ts']);
    await assert.rejects(gitReviewSnapshot(dir, 'HEAD'), /empty/i);
    await assert.rejects(gitReviewSnapshot(dir, '--help'), /unsafe/i);
    await writeFile(path.join(dir, 'example.ts'), 'const fixture = "sk-abcdefghijklmnop";\n');
    execFileSync('git', ['add', 'example.ts'], { cwd: dir });
    execFileSync('git', ['-c', 'core.hooksPath=', 'commit', '-m', 'synthetic redaction fixture'], { cwd: dir, stdio: 'pipe' });
    const redacted = await gitReviewSnapshot(dir, base);
    assert.equal(redacted.diff.includes('sk-abcdefghijklmnop'), false);
    assert.match(redacted.diff, /REDACTED/);
  });
});

test('production verifier uses opt-in exact receipt; blocked gate never runs npm tests', async () => {
  await gitFixture(async (dir, base) => {
    const snapshot = await gitReviewSnapshot(dir, base);
    let shouldShip = false; let modelCalls = 0;
    const service = new AdversarialReview(dir, [{ family: 'claude', async review() { modelCalls++; return JSON.stringify(shouldShip ? ship : fix); } }, reviewer('codex')]);
    let validations = 0;
    const commands: VerificationCommandRunner = { async run(file, args) {
      if (file.startsWith('npm')) { validations++; return { ok: true, stdout: 'passed', stderr: '' }; }
      if (args.includes('--show-toplevel')) return { ok: true, stdout: dir, stderr: '' };
      if (args.includes('--verify')) return { ok: true, stdout: snapshot.head, stderr: '' };
      return { ok: true, stdout: '', stderr: '' };
    } };
    const verifier = new GitProductionBuildAllVerifier(dir, commands, () => service);
    const context = { objective: 'fixture', plan: { objective: 'fixture', tasks: [], completionCriteria: ['tests'] }, integrationHead: snapshot.head, baseRef: base };
    assert.equal((await verifier.verify(context)).status, 'PASS');
    assert.equal(validations, 1);
    assert.equal(modelCalls, 0);
    await service.setGate(true);
    assert.equal((await verifier.verify(context)).status, 'BLOCKED');
    assert.equal(validations, 1);
    assert.equal(modelCalls, 1);
    shouldShip = true;
    await service.run(snapshot);
    const success = await verifier.verify(context);
    assert.equal(success.status, 'PASS');
    assert.ok(success.evidence?.some(value => value.startsWith('cross-model-consensus:')));
    assert.equal(validations, 2);
    assert.equal(modelCalls, 2);
    assert.equal((await verifier.verify(context)).status, 'PASS');
    assert.equal(modelCalls, 2, 'exact receipt is reused without further inference');
    assert.equal((await verifier.verify({ ...context, baseRef: undefined })).status, 'BLOCKED');
    await writeFile(path.join(dir, 'data/runtime/adversarial-review-gate.json'), '{}');
    assert.equal((await verifier.verify(context)).status, 'BLOCKED');
    await service.setGate(true);
    await appendFile(service.ledger.path, '{}\n');
    assert.equal((await verifier.verify(context)).status, 'BLOCKED');
    assert.equal(validations, 3);
  });
});
