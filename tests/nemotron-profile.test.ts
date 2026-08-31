import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NEMOTRON_3_ULTRA,
  applyKnownModelChatProfile,
  finalModelContent,
  isNemotron3Ultra,
  knownModelCapabilities,
  normalizeReasoningMode,
} from '../src/nemotron-profile.js';

test('recognizes hosted and self-hosted Nemotron 3 Ultra model names', () => {
  assert.equal(isNemotron3Ultra(NEMOTRON_3_ULTRA.hostedModel), true);
  assert.equal(isNemotron3Ultra('nvidia/nemotron-3-ultra'), true);
  assert.equal(isNemotron3Ultra('nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-NVFP4'), true);
  assert.equal(isNemotron3Ultra('qwen3:8b'), false);
});

test('applies explicit Nemotron reasoning controls without changing other models', () => {
  const medium = applyKnownModelChatProfile({ model: NEMOTRON_3_ULTRA.hostedModel, temperature: 0, messages: [] }, 'medium');
  assert.equal(medium.temperature, 1);
  assert.equal(medium.top_p, 0.95);
  assert.deepEqual(medium.chat_template_kwargs, { enable_thinking: true, medium_effort: true, force_nonempty_content: true });

  const off = applyKnownModelChatProfile({ model: NEMOTRON_3_ULTRA.hostedModel, temperature: 0.2, messages: [] }, 'off');
  assert.equal(off.temperature, 0.2);
  assert.deepEqual(off.chat_template_kwargs, { enable_thinking: false, force_nonempty_content: true });

  const generic = { model: 'generic/model', temperature: 0.3, messages: [] };
  assert.equal(applyKnownModelChatProfile(generic, 'full'), generic);
});

test('keeps the final answer and never exposes an unfinished Nemotron reasoning trace', () => {
  assert.equal(finalModelContent('<think>private reasoning</think>\nFinal answer', NEMOTRON_3_ULTRA.hostedModel), 'Final answer');
  assert.equal(finalModelContent('<think>unfinished reasoning', NEMOTRON_3_ULTRA.hostedModel), '');
  assert.equal(finalModelContent('<think>ordinary text</think>', 'generic/model'), '<think>ordinary text</think>');
});

test('reports the official text-only modality and uses safe reasoning defaults', () => {
  assert.deepEqual(knownModelCapabilities(NEMOTRON_3_ULTRA.hostedModel), { supportsVision: false, inputModalities: ['text'] });
  assert.equal(normalizeReasoningMode('medium'), 'medium');
  assert.equal(normalizeReasoningMode('full'), 'full');
  assert.equal(normalizeReasoningMode('unexpected'), 'off');
});
