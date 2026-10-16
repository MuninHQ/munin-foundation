import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.MUNIN_DATA_DIR = await mkdtemp(join(tmpdir(), 'munin-assistant-'));
const { executeAssistantCommand, setClaudeAsker } = await import('../src/assistant.js');
const { MuninService } = await import('../src/service.js');
await new MuninService().addAction('Email: Action Required: Add credits to Continue Using Lovable Services', 'P1');

test('free-form questions reach Claude even when a fuzzy local match exists, with the match as context', async () => {
  let seen: unknown;
  setClaudeAsker(async (_question, snapshot) => { seen = snapshot; return 'Foque nas entrevistas.'; });
  const result = await executeAssistantCommand('Olhando meu pipeline de carreira, qual deve ser meu foco esta semana? Continue.');
  assert.equal(result.interpretedBy, 'claude');
  assert.equal(result.message, 'Foque nas entrevistas.');
  assert.match(JSON.stringify(seen), /Lovable/, 'related local matches travel in the snapshot');
});

test('short entity references stay local and never call Claude', async () => {
  let called = false;
  setClaudeAsker(async () => { called = true; return 'x'; });
  const result = await executeAssistantCommand('Lovable');
  assert.equal(result.interpretedBy, 'local');
  assert.match(result.message, /Lovable/);
  assert.equal(called, false);
});

test('when Claude is unavailable a free-form question falls back to the local match', async () => {
  setClaudeAsker(async () => undefined);
  const result = await executeAssistantCommand('Olhando meu pipeline de carreira, qual deve ser meu foco esta semana? Continue.');
  assert.equal(result.interpretedBy, 'local');
  assert.match(result.message, /Acho que você está falando de/);
});
