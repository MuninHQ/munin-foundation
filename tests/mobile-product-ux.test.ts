import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('mobile home exposes clear actions with visible execution feedback', async () => {
  const app = await source('apps/web/src/mobile-main.tsx');
  for (const label of ['Status', 'Construir', 'Continuar', 'Pendências', 'Atualizar']) assert.match(app, new RegExp(`>${label}<`));
  for (const endpoint of ['/api/mobile/home', '/api/mobile/assistant', '/api/mobile/goal-loop', '/api/mobile/engineering/jobs']) assert.match(app, new RegExp(endpoint.replaceAll('/', '\\/')));
  assert.match(app, /setActionStatus\(`Executando:/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /scrollIntoView/);
  assert.doesNotMatch(app, />\s*[ᚱᚲᛉᛋ]\s+(?:BUILD|CONTINUE|NEEDS USER|SITREP)</);
});

test('iPhone layout keeps composer and utility controls out of each other', async () => {
  const css = await source('apps/web/src/mobile-product.css');
  assert.match(css, /\.composer\{position:static/);
  assert.match(css, /body \.munin-gpt-launch\{left:50%;transform:translateX\(-50%\)/);
  assert.match(css, /body \.munin-mail-launch\{left:12px/);
  assert.match(css, /body \.munin-host-launch\{right:12px/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('mobile utility launchers are named and accessible', async () => {
  const [mail, host, chatgpt] = await Promise.all([
    source('apps/web/src/email-mobile-controls.ts'),
    source('apps/web/src/host-mobile-controls.ts'),
    source('apps/web/src/chatgpt-operator-bridge.ts'),
  ]);
  assert.match(mail, /launch\.textContent='E-mail'/);
  assert.match(host, /launch\.textContent='PC'/);
  assert.match(chatgpt, /launch\.textContent='ChatGPT'/);
  for (const utility of [mail, host, chatgpt]) {
    assert.match(utility, /aria-label/);
    assert.match(utility, /aria-expanded/);
  }
});
