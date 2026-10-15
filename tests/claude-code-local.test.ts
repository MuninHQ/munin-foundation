import assert from 'node:assert/strict';
import test from 'node:test';
import { askClaudeCode, buildClaudePrompt, claudeArgs, claudeCodeStatus, type ClaudeRunner } from '../src/claude-code-local.js';

const ok = (result: string): ClaudeRunner => async () => ({ stdout: JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result }) });

test('headless args disable every tool, session persistence, MCP and user settings', () => {
  const args = claudeArgs();
  assert.deepEqual(args.slice(0, 1), ['-p']);
  assert.equal(args[args.indexOf('--tools') + 1], '');
  for (const flag of ['--no-session-persistence', '--strict-mcp-config', '--output-format']) assert.ok(args.includes(flag), flag);
  assert.equal(args[args.indexOf('--setting-sources') + 1], '');
  assert.equal(args[args.indexOf('--output-format') + 1], 'json');
  assert.ok(!args.includes('--model'), 'uses the owner Claude Code default model');
  assert.ok(!args.some(a => /dangerously|bypassPermissions|acceptEdits/.test(a)));
});

test('prompt carries the question and a sanitized snapshot, never secrets', () => {
  const prompt = buildClaudePrompt('Qual vaga devo priorizar?', { brief: { headline: 'Foco em carreira' }, apiKey: 'sk-ant-secret', token: 'abc', jobs: [{ company: 'Elo', role: 'PM', email: 'r@x.com' }] });
  assert.match(prompt, /Qual vaga devo priorizar\?/);
  assert.match(prompt, /Foco em carreira/);
  assert.match(prompt, /Elo/);
  assert.doesNotMatch(prompt, /sk-ant-secret|"token"|apiKey|r@x\.com/);
});

test('returns the Claude answer and sends the prompt on stdin, not argv', async () => {
  let seen: { args: string[]; input: string; cwd: string } | undefined;
  const runner: ClaudeRunner = async (args, opts) => { seen = { args, input: opts.input, cwd: opts.cwd }; return ok('Priorize a Elo.')(args, opts); };
  const answer = await askClaudeCode('Qual vaga?', { jobs: [] }, { runner, env: {} });
  assert.equal(answer, 'Priorize a Elo.');
  assert.ok(seen && seen.input.includes('Qual vaga?'));
  assert.ok(seen && !seen.args.some(a => a.includes('Qual vaga?')));
  assert.ok(seen && !/munin-foundation/i.test(seen.cwd), 'runs outside the repo so project CLAUDE.md and hooks never load');
});

test('every failure falls back to undefined instead of throwing', async () => {
  const cases: ClaudeRunner[] = [
    async () => { throw Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' }); },
    async () => ({ stdout: 'not json' }),
    async () => ({ stdout: JSON.stringify({ type: 'result', is_error: true, result: 'Credit balance too low' }) }),
    async () => ({ stdout: JSON.stringify({ type: 'result', is_error: false, result: '   ' }) }),
  ];
  for (const runner of cases) assert.equal(await askClaudeCode('oi', {}, { runner, env: {} }), undefined);
});

test('MUNIN_CLAUDE_CODE=off disables the path without running anything', async () => {
  let ran = false;
  const runner: ClaudeRunner = async (args, opts) => { ran = true; return ok('x')(args, opts); };
  assert.equal(await askClaudeCode('oi', {}, { runner, env: { MUNIN_CLAUDE_CODE: 'off' } }), undefined);
  assert.equal(ran, false);
});

test('answers are capped so a runaway reply cannot flood the UI', async () => {
  const answer = await askClaudeCode('oi', {}, { runner: ok('a'.repeat(50_000)), env: {} });
  assert.ok(answer && answer.length <= 16_000);
});

test('status reports availability and version, and unavailability without throwing', async () => {
  assert.deepEqual(await claudeCodeStatus({ runner: async () => ({ stdout: '2.1.295 (Claude Code)\n' }), env: {} }), { available: true, version: '2.1.295 (Claude Code)' });
  assert.deepEqual(await claudeCodeStatus({ runner: async () => { throw new Error('ENOENT'); }, env: {} }), { available: false });
  assert.deepEqual(await claudeCodeStatus({ runner: ok('x'), env: { MUNIN_CLAUDE_CODE: 'off' } }), { available: false, disabled: true });
});

test('test runs never reach the real CLI unless explicitly opted in', async () => {
  let ran = false;
  const runner: ClaudeRunner = async (args, opts) => { ran = true; return ok('x')(args, opts); };
  assert.equal(await askClaudeCode('oi', {}, { runner, env: { NODE_TEST_CONTEXT: 'child' } }), undefined);
  assert.equal(ran, false);
  assert.equal(await askClaudeCode('oi', {}, { runner, env: { NODE_TEST_CONTEXT: 'child', MUNIN_CLAUDE_CODE: 'on' } }), 'x');
});
