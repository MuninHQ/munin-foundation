import test from 'node:test';
import assert from 'node:assert/strict';
import { OrchestrationRuntimeCore } from '../src/orchestration-runtime-core.js';

test('runtime executes a direct local orchestration', async () => {
  const previous = process.env.MUNIN_OLLAMA_ENABLED;
  process.env.MUNIN_OLLAMA_ENABLED = '0';
  try {
    const result = await new OrchestrationRuntimeCore().run({
      objective: 'Summarize next action',
      capability: 'execute',
      mode: 'direct',
      context: { source: 'test' },
    });
    assert.equal(result.plan.route, 'direct');
    assert.equal(result.providerId, 'deterministic-local');
    assert.ok('response' in result);
  } finally {
    if (previous === undefined) delete process.env.MUNIN_OLLAMA_ENABLED;
    else process.env.MUNIN_OLLAMA_ENABLED = previous;
  }
});

test('runtime executes council routing locally', async () => {
  const previous = process.env.MUNIN_OLLAMA_ENABLED;
  process.env.MUNIN_OLLAMA_ENABLED = '0';
  try {
    const result = await new OrchestrationRuntimeCore().run({
      objective: 'Review a high-risk decision',
      capability: 'review',
      risk: 'high',
    });
    assert.equal(result.plan.route, 'council');
    assert.equal(result.providerId, 'deterministic-local');
    assert.ok('council' in result);
  } finally {
    if (previous === undefined) delete process.env.MUNIN_OLLAMA_ENABLED;
    else process.env.MUNIN_OLLAMA_ENABLED = previous;
  }
});
