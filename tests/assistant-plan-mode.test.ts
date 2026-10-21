import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.MUNIN_DATA_DIR = await mkdtemp(join(tmpdir(), 'munin-assistant-plan-'));
const { executeAssistantCommand, setClaudeAsker, setLlmNormalizer } = await import('../src/assistant.js');
const { loadAssistantMemory } = await import('../src/assistant-memory.js');
const { ContextStore } = await import('../src/store.js');

const actionTitles = async () => (await new ContextStore().load()).actions.map(x => x.title);

test('plan mode proposes a local change without writing it', async () => {
  const result = await executeAssistantCommand('criar ação: revisar contrato P0', true, true, 'plan');
  assert.equal(result.kind, 'proposal');
  assert.equal(result.mutated, undefined);
  assert.equal(result.proposal?.command, 'criar ação: revisar contrato P0');
  assert.equal(result.proposal?.reversible, true);
  assert.match(result.message, /nada foi alterado/);
  assert.ok(!(await actionTitles()).includes('revisar contrato'));
});

test('executing the proposed command applies it and says how to undo it', async () => {
  const result = await executeAssistantCommand('criar ação: revisar contrato P0', true, true, 'execute');
  assert.equal(result.kind, 'created');
  assert.equal(result.mutated, true);
  assert.match(result.undo ?? '', /Action Inbox/);
  assert.ok((await actionTitles()).includes('revisar contrato'));
});

test('plan mode names the current job stage so the change can be reverted', async () => {
  await executeAssistantCommand('registrar vaga Staff Engineer na Elo', true, true, 'execute');
  const result = await executeAssistantCommand('marcar como entrevista', true, true, 'plan');
  assert.equal(result.kind, 'proposal');
  assert.match(result.proposal?.undo ?? '', /marcar como /);
  const job = (await new ContextStore().load()).jobs.find(x => x.company === 'Elo');
  assert.notEqual(job?.status, 'interview');
});

test('a write command keeps its verb even when the title mentions priorities', async () => {
  const result = await executeAssistantCommand('criar ação: revisar prioridades da semana', true, true, 'plan');
  assert.equal(result.kind, 'proposal');
  assert.match(result.proposal?.summary ?? '', /revisar prioridades da semana/);
});

test('an LLM-normalized mutation in plan mode becomes a proposal of the normalized command', async () => {
  setLlmNormalizer(async () => ({ command: 'criar ação: ligar para a Elo amanhã' }));
  setClaudeAsker(async () => 'x');
  const result = await executeAssistantCommand('Por favor cria uma tarefa para eu ligar para a Elo amanhã cedo', true, true, 'plan');
  assert.equal(result.kind, 'proposal');
  assert.equal(result.interpretedBy, 'llm');
  assert.equal(result.proposal?.command, 'criar ação: ligar para a Elo amanhã');
  assert.ok(!(await actionTitles()).includes('ligar para a Elo amanhã'));
});

test('credentials are refused, never stored and never sent to Claude or a provider', async () => {
  let reached = false;
  setClaudeAsker(async () => { reached = true; return 'x'; });
  setLlmNormalizer(async () => { reached = true; return undefined; });
  const secret = 'sk-proj-abcdefghijklmnop1234';
  const result = await executeAssistantCommand(`guarde minha api_key = ${secret} para o provider`, true, true, 'execute');
  assert.equal(result.kind, 'blocked');
  assert.match(result.message, /credencial/);
  assert.equal(reached, false);
  const memory = await loadAssistantMemory();
  assert.ok(!JSON.stringify(memory).includes(secret));
});
