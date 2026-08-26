import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web = (path: string) => readFile(new URL(`../../apps/web/${path}`, import.meta.url), 'utf8');

test('command center presents one coherent local intelligence hierarchy', async () => {
  const [app, dashboard, css] = await Promise.all([
    web('src/App.tsx'),
    web('src/ExecutiveDashboard.tsx'),
    web('src/styles.css'),
  ]);
  for (const label of ['Hoje', 'Projetos', 'Carreira', 'Pesquisa', 'Sistema']) assert.match(app, new RegExp(`label: '${label}'`));
  assert.match(app, /Life Intelligence/);
  assert.match(app, /Munin operacional/);
  assert.match(app, /Sincronizando inteligência local/);
  assert.match(dashboard, /MUNIN CORE/);
  assert.match(dashboard, /Gerar briefing/);
  assert.match(css, /\.intelligence-core/);
  assert.match(css, /prefers-reduced-motion/);
});

test('desktop, HUD and mobile share the core visual language without losing usability', async () => {
  const [desktop, mobile, hud] = await Promise.all([
    web('src/styles.css'),
    web('src/mobile-product.css'),
    web('public/hud.css'),
  ]);
  for (const css of [desktop, mobile]) {
    assert.match(css, /--core-cyan:#67d8ff/);
    assert.match(css, /focus-visible/);
  }
  assert.match(mobile, /env\(safe-area-inset-top\)/);
  assert.match(mobile, /\.quick-grid button:active/);
  assert.match(hud, /cursor:auto/);
  assert.match(hud, /\.hud-command form:focus-within/);
});
