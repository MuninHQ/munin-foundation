import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewLinkedInDraft } from '../src/linkedin-council-review.js';
import type { ExecutionProvider, ProviderRequest, ProviderResponse } from '../src/providers.js';

class ReviewProvider implements ExecutionProvider {
  readonly id = 'review-test';
  requests: ProviderRequest[] = [];
  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    this.requests.push(request);
    return { providerId: this.id, output: `${request.title}: ok`, metadata: {} };
  }
}

test('LinkedIn review runs editorial, evidence, positioning and thesis guardian seats plus synthesis', async () => {
  const provider = new ReviewProvider();
  const result = await reviewLinkedInDraft({ title: 'Stablecoins e infraestrutura', body: 'Um post executivo de teste.', themes: ['Stablecoins'] }, provider);
  assert.equal(result.ready, true);
  assert.equal(result.review?.seats.length, 4);
  assert.deepEqual(result.review?.seats.map(item => item.seat.id), ['editor', 'fact-checker', 'positioning', 'thesis-guardian']);
  assert.equal(provider.requests.length, 5);
  assert.equal(provider.requests[4].capability, 'synthesis');
  assert.ok(result.brandEvaluation);
});

test('LinkedIn review rejects empty drafts before calling provider', async () => {
  const provider = new ReviewProvider();
  const result = await reviewLinkedInDraft({ title: '', body: '' }, provider);
  assert.equal(result.ready, false);
  assert.match(result.error ?? '', /required/);
  assert.equal(provider.requests.length, 0);
});
