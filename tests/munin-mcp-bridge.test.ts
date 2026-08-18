import test from 'node:test';
import assert from 'node:assert/strict';
import { MuninMcpBridge } from '../src/munin-mcp-bridge.js';
import { RuntimeCapabilityRegistry } from '../src/runtime-capability-seam.js';

test('MCP bridge lists default external capability bindings', () => {
  const bridge = new MuninMcpBridge(new RuntimeCapabilityRegistry());
  assert.deepEqual(bridge.list(), [
    { command: 'munin.intelligence.research', capability: 'intelligence.external' },
    { command: 'munin.engineering.review', capability: 'engineering.independent-review' },
  ]);
});

test('MCP bridge fails closed for unbound commands', async () => {
  const bridge = new MuninMcpBridge(new RuntimeCapabilityRegistry());
  const response = await bridge.invoke({ command: 'munin.sitrep' });
  assert.equal(response.ok, false);
  assert.match(response.error ?? '', /not bound/);
});

test('MCP bridge invokes a bound runtime capability', async () => {
  const registry = new RuntimeCapabilityRegistry();
  registry.register({ name: 'test.echo', async execute(input: any) { return { echo: input.value }; } });
  const bridge = new MuninMcpBridge(registry, []);
  bridge.bind('munin.sitrep', 'test.echo');
  const response = await bridge.invoke({ command: 'munin.sitrep', arguments: { value: 'ok' } });
  assert.equal(response.ok, true);
  assert.deepEqual(response.result, { echo: 'ok' });
});
