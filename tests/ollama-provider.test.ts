import test from 'node:test';
import assert from 'node:assert/strict';
import { OllamaProvider } from '../src/ollama-provider.js';

const request = {
  taskId: 'tsk-ollama',
  objective: 'Evaluate a local AI provider',
  title: 'Local inference',
  capability: 'review',
  expectedOutput: 'A concise recommendation',
  context: { source: 'test' },
};

test('Ollama provider sends non-streaming local generation requests', async () => {
  let capturedUrl = '';
  let capturedBody: Record<string, unknown> = {};
  const provider = new OllamaProvider({
    model: 'test-model',
    baseUrl: 'http://localhost:11434/',
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ model: 'test-model', response: 'local answer', eval_count: 12 }), { status: 200 });
    }) as typeof fetch,
  });
  const result = await provider.execute(request);
  assert.equal(capturedUrl, 'http://localhost:11434/api/generate');
  assert.equal(capturedBody.model, 'test-model');
  assert.equal(capturedBody.stream, false);
  assert.match(String(capturedBody.prompt), /Evaluate a local AI provider/);
  assert.equal(result.providerId, 'ollama-local');
  assert.equal(result.output, 'local answer');
  assert.equal(result.metadata.local, true);
});

test('Ollama health reports whether configured model is installed', async () => {
  const provider = new OllamaProvider({
    model: 'qwen3:8b',
    fetchImpl: (async () => new Response(JSON.stringify({ models: [{ name: 'qwen3:8b' }, { name: 'gemma3:4b' }] }), { status: 200 })) as typeof fetch,
  });
  const health = await provider.health();
  assert.equal(health.ready, true);
  assert.deepEqual(health.models, ['qwen3:8b', 'gemma3:4b']);
});
