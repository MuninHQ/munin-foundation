import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenRouterProvider } from '../src/openrouter-provider.js';

const request = {
  taskId: 'task-1',
  objective: 'Improve Munin safely',
  title: 'Review provider integration',
  capability: 'code',
  expectedOutput: 'A concise implementation review',
  context: { scope: 'provider seam' },
};

test('OpenRouter provider sends configured model and returns normalized response', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({
      model: 'stealth/ox-alpha',
      choices: [{ message: { content: 'review complete' } }],
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const provider = new OpenRouterProvider({
    apiKey: 'test-key',
    model: 'stealth/ox-alpha',
    baseUrl: 'https://openrouter.ai/api/v1/',
    fetchImpl,
  });
  const result = await provider.execute(request);

  assert.equal(capturedUrl, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal((capturedInit?.headers as Record<string, string>).authorization, 'Bearer test-key');
  const body = JSON.parse(String(capturedInit?.body));
  assert.equal(body.model, 'stealth/ox-alpha');
  assert.equal(result.providerId, 'openrouter-external');
  assert.equal(result.output, 'review complete');
  assert.equal(result.metadata.totalTokens, 14);
  assert.equal(result.metadata.external, true);
});

test('OpenRouter provider refuses execution without an API key', async () => {
  const previous = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const provider = new OpenRouterProvider({ apiKey: '' });
    await assert.rejects(() => provider.execute(request), /API key is not configured/);
  } finally {
    if (previous === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previous;
  }
});

test('OpenRouter provider rejects empty model output', async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '   ' } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  const provider = new OpenRouterProvider({ apiKey: 'test-key', fetchImpl });
  await assert.rejects(() => provider.execute(request), /empty response/);
});
