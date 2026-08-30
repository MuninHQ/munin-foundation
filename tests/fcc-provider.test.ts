import test from 'node:test';
import assert from 'node:assert/strict';
import { FccProvider } from '../src/fcc-provider.js';
import { defaultProviderProfiles } from '../src/provider-policy.js';
import type { ProviderRequest } from '../src/providers.js';

const request: ProviderRequest = {
  taskId: 'tsk-fcc-test',
  objective: 'Validate FCC integration',
  title: 'Generate answer',
  capability: 'code',
  expectedOutput: 'A concise implementation answer',
  context: { repository: 'MuninHQ/munin-foundation' },
};

test('FCC provider calls responses endpoint and returns output_text', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const provider = new FccProvider({
    baseUrl: 'http://127.0.0.1:8082/v1/',
    model: 'open_router/openrouter/free',
    authToken: 'test-token',
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({
        model: 'open_router/openrouter/free',
        output_text: 'gateway result',
        usage: { input_tokens: 10, output_tokens: 2 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch,
  });

  const result = await provider.execute(request);
  assert.equal(result.output, 'gateway result');
  assert.equal(result.providerId, 'fcc-gateway');
  assert.equal(result.model, 'open_router/openrouter/free');
  assert.equal(calls[0].url, 'http://127.0.0.1:8082/v1/responses');
  assert.equal((calls[0].init?.headers as Record<string, string>).authorization, 'Bearer test-token');
});

test('FCC provider extracts nested response content', async () => {
  const provider = new FccProvider({
    fetchImpl: (async () => new Response(JSON.stringify({
      output: [{ content: [{ type: 'output_text', text: 'nested result' }] }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch,
  });
  const result = await provider.execute(request);
  assert.equal(result.output, 'nested result');
});

test('FCC provider extracts output from Responses API event stream', async () => {
  const stream = [
    'event: response.output_text.delta',
    'data: {"type":"response.output_text.delta","delta":"streamed "}',
    '',
    'event: response.output_text.delta',
    'data: {"type":"response.output_text.delta","delta":"result"}',
    '',
    'event: response.completed',
    'data: {"type":"response.completed","response":{"model":"open_router/openrouter/free"}}',
    '',
  ].join('\n');
  const provider = new FccProvider({
    fetchImpl: (async () => new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })) as typeof fetch,
  });

  const result = await provider.execute(request);
  assert.equal(result.output, 'streamed result');
  assert.equal(result.model, 'open_router/openrouter/free');
});

test('FCC health reports configured model availability', async () => {
  const provider = new FccProvider({
    model: 'open_router/openrouter/free',
    fetchImpl: (async () => new Response(JSON.stringify({
      data: [{ id: 'open_router/openrouter/free' }, { id: 'groq/llama-3.3-70b-versatile' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch,
  });
  const health = await provider.health();
  assert.equal(health.ready, true);
  assert.equal(health.models?.includes('open_router/openrouter/free'), true);
});

test('FCC health accepts the catalog namespace used for its default model', async () => {
  const provider = new FccProvider({
    model: 'nvidia_nim/nvidia/nemotron-3-super-120b-a12b',
    fetchImpl: (async () => new Response(JSON.stringify({
      data: [{ id: 'anthropic/nvidia_nim/nvidia/nemotron-3-super-120b-a12b' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch,
  });

  const health = await provider.health();
  assert.equal(health.ready, true);
});

test('FCC stays disabled until cost is declared explicitly', () => {
  const previousEnabled = process.env.MUNIN_FCC_ENABLED;
  const previousCost = process.env.FCC_ESTIMATED_COST_PER_CALL;
  process.env.MUNIN_FCC_ENABLED = '1';
  delete process.env.FCC_ESTIMATED_COST_PER_CALL;

  try {
    const fcc = defaultProviderProfiles().find(profile => profile.id === 'fcc-gateway');
    assert.equal(fcc?.enabled, false);
  } finally {
    if (previousEnabled === undefined) delete process.env.MUNIN_FCC_ENABLED;
    else process.env.MUNIN_FCC_ENABLED = previousEnabled;
    if (previousCost === undefined) delete process.env.FCC_ESTIMATED_COST_PER_CALL;
    else process.env.FCC_ESTIMATED_COST_PER_CALL = previousCost;
  }
});

test('FCC stays disabled when declared cost is invalid', () => {
  const previousEnabled = process.env.MUNIN_FCC_ENABLED;
  const previousCost = process.env.FCC_ESTIMATED_COST_PER_CALL;
  process.env.MUNIN_FCC_ENABLED = '1';
  process.env.FCC_ESTIMATED_COST_PER_CALL = 'not-a-number';

  try {
    const fcc = defaultProviderProfiles().find(profile => profile.id === 'fcc-gateway');
    assert.equal(fcc?.enabled, false);
  } finally {
    if (previousEnabled === undefined) delete process.env.MUNIN_FCC_ENABLED;
    else process.env.MUNIN_FCC_ENABLED = previousEnabled;
    if (previousCost === undefined) delete process.env.FCC_ESTIMATED_COST_PER_CALL;
    else process.env.FCC_ESTIMATED_COST_PER_CALL = previousCost;
  }
});
