import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = process.cwd();

async function text(path:string) {
  return readFile(resolve(root, path), 'utf8');
}

test('unified server exposes career intake and a distinct readiness marker', async () => {
  const server = await text('src/server.ts');
  assert.match(server, /\['\/api\/career-intake',handleCareerIntakeApi\]/);
  assert.match(server, /\/api\/unified-health/);
  assert.match(server, /mode:'unified'/);
  assert.match(server, /capabilities:\['career-intake'\]/);
});

test('workspace launcher refuses legacy api-only processes', async () => {
  const launcher = await text('scripts/launch.mjs');
  assert.match(launcher, /\/api\/unified-health/);
  assert.match(launcher, /data\?\.mode === 'unified'/);
  assert.match(launcher, /includes\?\.\('career-intake'\)/);
  assert.match(launcher, /stale, legacy or foreign API process/);
});
