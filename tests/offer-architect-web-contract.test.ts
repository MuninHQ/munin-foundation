import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Offer Architect is routed, built, and visible in Munin navigation', async () => {
  const [page, vite, server, nav, packageJson] = await Promise.all([
    readFile('apps/web/offer-architect.html', 'utf8'),
    readFile('apps/web/vite.config.ts', 'utf8'),
    readFile('src/server.ts', 'utf8'),
    readFile('apps/web/public/munin-nav.js', 'utf8'),
    readFile('package.json', 'utf8'),
  ]);
  assert.match(vite, /offer-architect/);
  assert.match(server, /handleOfferArchitectApi/);
  assert.match(nav, /Offer Architect/);
  assert.match(packageJson, /offer:architect/);
  assert.match(page, /Evidence Gate/);
  assert.match(page, /Quality Gate/);
  assert.match(page, /\/api\/offer-architect\/analyze/);
  assert.match(page, /zero-cost/i);
});
