import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { careerMobileCapabilities } from '../src/career-mobile-capabilities.js';
import { CareerVisionExtractor } from '../src/career-vision-extractor.js';
import { completeWithLlm, llmProviderStatus, testLlmProvider } from '../src/llm-provider.js';
import { loadLlmSettings, saveLlmSettings } from '../src/llm-settings.js';
import { NEMOTRON_3_ULTRA } from '../src/nemotron-profile.js';

test('Nemotron preset settings drive profiled requests while preserving vision and test guards', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-nemotron-'));
  const previousDir = process.env.MUNIN_DATA_DIR;
  const previousFetch = globalThis.fetch;
  process.env.MUNIN_DATA_DIR = dir;
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    bodies.push(body);
    const content = bodies.length === 1 ? '<think>internal trace</think>\nFinal operational answer' : 'OK';
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  }) as typeof fetch;
  try {
    assert.equal((await loadLlmSettings()).reasoningMode, 'off');
    const saved = await saveLlmSettings({
      enabled: true,
      provider: 'openai-compatible',
      baseUrl: NEMOTRON_3_ULTRA.hostedBaseUrl,
      apiKey: 'test-key',
      model: NEMOTRON_3_ULTRA.hostedModel,
      reasoningMode: 'medium',
    });
    assert.equal(saved.reasoningMode, 'medium');
    assert.equal(saved.hasApiKey, true);
    assert.equal('apiKey' in saved, false);

    const status = await llmProviderStatus();
    assert.equal(status.profile, NEMOTRON_3_ULTRA.id);
    assert.equal(status.reasoningMode, 'medium');
    assert.equal(status.deployment, 'external');
    assert.equal(status.supportsVision, false);

    const answer = await completeWithLlm('Return a concise answer.', 'Analyze this.', 500);
    assert.equal(answer, 'Final operational answer');
    assert.deepEqual(bodies[0]?.chat_template_kwargs, { enable_thinking: true, medium_effort: true, force_nonempty_content: true });
    assert.equal(bodies[0]?.temperature, 1);

    await testLlmProvider();
    assert.deepEqual(bodies[1]?.chat_template_kwargs, { enable_thinking: false, force_nonempty_content: true });
    assert.equal(bodies[1]?.max_tokens, 100);

    const mobile = await careerMobileCapabilities();
    assert.equal(mobile.intake.image.visionReady, false);
    const callsBeforeVision = bodies.length;
    await assert.rejects(
      () => new CareerVisionExtractor().extract({ source: 'screenshot', image: { mimeType: 'image/png', dataBase64: 'aA==' } }),
      /VISION_MODEL_TEXT_ONLY/,
    );
    assert.equal(bodies.length, callsBeforeVision);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousDir === undefined) delete process.env.MUNIN_DATA_DIR; else process.env.MUNIN_DATA_DIR = previousDir;
    await rm(dir, { recursive: true, force: true });
  }
});
