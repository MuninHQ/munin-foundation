import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('unified server routes second-brain API to context memory handler', async () => {
  const source = await readFile(resolve(process.cwd(), 'src', 'server.ts'), 'utf8');
  assert.match(source, /\['\/api\/second-brain',handleContextMemory\]/);
  assert.match(source, /\['\/api\/context-memory',handleContextMemory\]/);
});
