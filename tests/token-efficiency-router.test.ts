import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendExecutionTier } from '../src/token-efficiency-router.js';

test('mechanical local-capable work recommends deterministic local execution', () => {
  const result = recommendExecutionTier({ workType: 'operations', capabilities: ['format'], localCapable: true, risk: 'low', ambiguity: 'low', verificationRequired: false }, []);
  assert.equal(result.classification, 'mechanical');
  assert.equal(result.recommendedTier, 'deterministic_local');
  assert.equal('provider' in result, false);
});

test('high-risk work cannot be recommended below strong model', () => {
  const result = recommendExecutionTier({ workType: 'engineering', capabilities: ['architecture'], localCapable: true, risk: 'high', ambiguity: 'high', verificationRequired: true }, []);
  assert.equal(result.classification, 'high_stakes');
  assert.equal(result.recommendedTier, 'strong_model');
  assert.ok(result.reasonCodes.includes('high-risk'));
});

test('available profile recommendation contains identifiers but no executable provider', () => {
  const result = recommendExecutionTier(
    { workType: 'research', capabilities: ['synthesis'], localCapable: false, risk: 'medium', ambiguity: 'high', verificationRequired: true },
    [{ id: 'astra', tier: 'strong_model', enabled: true }],
  );
  assert.equal(result.recommendedProfileId, 'astra');
  assert.deepEqual(Object.keys(result).includes('provider'), false);
});
