import test from 'node:test';
import assert from 'node:assert/strict';
import { CouncilOrchestrator } from '../src/council.js';
import type { ExecutionProvider, ProviderRequest, ProviderResponse } from '../src/providers.js';

class EchoProvider implements ExecutionProvider {
  readonly id = 'echo';
  requests: ProviderRequest[] = [];
  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    this.requests.push(request);
    return { providerId: this.id, output: `${request.capability}:${request.title}`, metadata: {} };
  }
}

test('Council runs three independent lenses and a final synthesis', async () => {
  const provider = new EchoProvider();
  const result = await new CouncilOrchestrator(provider).deliberate({ objective: 'Choose the next Munin capability', context: { priority: 'local-first' } });
  assert.equal(result.seats.length, 3);
  assert.deepEqual(result.seats.map(item => item.seat.id), ['strategist', 'skeptic', 'operator']);
  assert.equal(provider.requests.length, 4);
  assert.equal(provider.requests[3].capability, 'synthesis');
  const opinions = provider.requests[3].context.councilOpinions as Array<{ seat: string }>;
  assert.deepEqual(opinions.map(item => item.seat), ['strategist', 'skeptic', 'operator']);
  assert.match(result.synthesis.output, /^synthesis:/);
});

test('Council accepts custom seats for domain-specific deliberation', async () => {
  const provider = new EchoProvider();
  const result = await new CouncilOrchestrator(provider).deliberate({
    objective: 'Review LinkedIn intelligence',
    seats: [{ id: 'editor', title: 'Editor', capability: 'write', lens: 'Protect editorial quality.' }],
  });
  assert.equal(result.seats.length, 1);
  assert.equal(result.seats[0].seat.id, 'editor');
  assert.equal(provider.requests.length, 2);
});
