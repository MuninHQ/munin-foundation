import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('Munin CLI exposes executive BUILD ALL backed by production runtime', async () => {
  const [cliSource, executiveSource] = await Promise.all([
    readFile(path.resolve(process.cwd(), 'src/cli.ts'), 'utf8'),
    readFile(path.resolve(process.cwd(), 'src/executive-build-all-runtime.ts'), 'utf8'),
  ]);
  assert.match(cliSource, /command === 'build-all'/);
  assert.match(cliSource, /ExecutiveBuildAllRuntime/);
  assert.match(cliSource, /Usage: munin build-all <objective>/);
  assert.match(executiveSource, /ProductionBuildAllRuntime/);
  assert.match(executiveSource, /UNDERSTAND/);
  assert.match(executiveSource, /CHALLENGE/);
  assert.match(executiveSource, /VERIFY/);
  assert.match(executiveSource, /REMEMBER/);
});
