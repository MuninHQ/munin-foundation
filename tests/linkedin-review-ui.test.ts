import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = () => readFile('apps/web/linkedin-compose.html', 'utf8');

test('LinkedIn Composer exposes local Ollama routing and Council review action', async () => {
  const html = await page();
  assert.match(html, /REVISAR COM COUNCIL/);
  assert.match(html, /\/api\/linkedin-composer\/review/);
  assert.match(html, /status\.localText\?\.ready/);
  assert.match(html, /TEXTO · OLLAMA/);
  assert.match(html, /reviewed\.review\.synthesis\.output/);
});
