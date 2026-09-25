import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Viral Engine is routed and exposes the complete governed loop', async () => {
  const [page, vite, server, nav] = await Promise.all([
    readFile('apps/web/viral-engine.html', 'utf8'), readFile('apps/web/vite.config.ts', 'utf8'),
    readFile('src/server.ts', 'utf8'), readFile('apps/web/public/munin-nav.js', 'utf8'),
  ]);
  assert.match(vite, /viral-engine/); assert.match(server, /handleViralEngineApi/); assert.match(nav, /Viral Engine/);
  for (const agent of ['Raven', 'Loki', 'Skald', 'Forge', 'Odin']) assert.match(page, new RegExp(agent));
  assert.match(page, />Produzir</); assert.match(page, /publica.*externamente sozinho/i);
  assert.match(page, /\/api\/viral-engine\/discover/); assert.match(page, /\/metrics/);
});

