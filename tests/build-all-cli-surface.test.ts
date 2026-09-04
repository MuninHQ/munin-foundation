import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('Munin CLI exposes build-all command and production runtime', async () => {
  const source = await readFile(path.resolve(process.cwd(), 'src/cli.ts'), 'utf8');
  assert.match(source, /command === 'build-all'/);
  assert.match(source, /ProductionBuildAllRuntime/);
  assert.match(source, /Usage: munin build-all <objective>/);
});
