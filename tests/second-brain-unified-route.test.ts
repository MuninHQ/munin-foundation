import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('unified server routes second-brain API to context memory handler', async () => {
  const source = await readFile(new URL('../src/server.ts', import.meta.url), 'utf8');
  assert.match(source, /\['\/api\/second-brain',handleContextMemory\]/);
  assert.match(source, /\['\/api\/context-memory',handleContextMemory\]/);
});
