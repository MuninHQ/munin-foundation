import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('LinkedIn Studio production graph publishes every linked module', async () => {
  const vite = await readFile(new URL('../../apps/web/vite.config.ts', import.meta.url), 'utf8');
  const studio = await readFile(new URL('../../apps/web/linkedin.html', import.meta.url), 'utf8');
  const required = [
    ['linkedin', 'linkedin.html'],
    ['linkedin-compose', 'linkedin-compose.html'],
    ['linkedin-brand', 'linkedin-brand.html'],
    ['linkedin-history', 'linkedin-history.html'],
    ['linkedin-assets', 'linkedin-assets.html'],
    ['linkedin-publisher', 'linkedin-publisher.html'],
  ] as const;
  for (const [key, file] of required) {
    assert.ok(vite.includes(`'${key}': path.resolve(root, '${file}')`) || vite.includes(`${key}: path.resolve(root, '${file}')`));
    if (file !== 'linkedin.html') assert.ok(studio.includes(`href="/${file}"`));
  }
});

test('production acceptance covers LinkedIn pages and read-only APIs', async () => {
  const acceptance = await readFile(new URL('../../scripts/acceptance-chatgpt-first.ps1', import.meta.url), 'utf8');
  for (const route of [
    '/linkedin.html', '/linkedin-compose.html', '/linkedin-brand.html', '/linkedin-history.html',
    '/linkedin-assets.html', '/linkedin-publisher.html', '/api/linkedin-content',
    '/api/linkedin-composer/status', '/api/linkedin-composer/brand',
    '/api/linkedin-composer/suggestions', '/api/linkedin-publisher', '/api/visual-assets/health',
  ]) assert.ok(acceptance.includes(route), `missing acceptance route: ${route}`);
});

test('LinkedIn image identity remains explicitly free of AJ branding', async () => {
  const content = await readFile(new URL('../../src/linkedin-content.ts', import.meta.url), 'utf8');
  assert.match(content, /No AJ logo, no AJ monogram, no initials/);
  assert.match(content, /logoTreatment:NO_BRAND/);
});
