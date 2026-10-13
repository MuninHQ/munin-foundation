import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const web = (path: string) => readFile(new URL('../../apps/web/' + path, import.meta.url), 'utf8');

test('Nordic skin is scoped and wired to both dashboard and HUD', async () => {
  const [dashboard, hud, stylesheet, react] = await Promise.all([
    web('index.html'), web('hud.html'),
    web('public/nordic-theme.css'), web('src/ExecutiveDashboard.tsx'),
  ]);
  for (const html of [dashboard, hud]) {
    assert.match(html, /nordic-theme\.css\?v=1/);
    assert.match(html, /nordic-theme\.js\?v=1/);
  }
  assert.match(stylesheet, /html\[data-munin-theme="nordic"\]/);
  assert.match(stylesheet, /--nordic-obsidian:/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  for (const name of ['HUGINN', 'MUNINN', 'YGGDRASIL', 'HEIMDALL']) {
    assert.ok(react.includes(name));
    assert.ok(hud.includes(name));
  }
});

test('Nordic toggle restores Classic and persists selections without runtime dependencies', async () => {
  const source = await web('public/nordic-theme.js');
  let stored: string | null = 'classic';
  let click: () => void = () => { throw new Error('no toggle'); };
  const attrs = new Map<string, string>();
  const buttonAttrs = new Map<string, string>();
  const button = {
    textContent: '',
    setAttribute(name: string, value: string) { buttonAttrs.set(name, value); },
    addEventListener(name: string, fn: () => void) { if (name === 'click') click = fn; },
  };
  let mounted = false;
  const host = {
    querySelector() { return mounted ? button : null; },
    appendChild() { mounted = true; },
  };
  const document = {
    documentElement: { setAttribute(name: string, value: string) { attrs.set(name, value); } },
    readyState: 'complete',
    querySelector(selector: string) { return selector === '.hud-top-actions' ? host : null; },
    querySelectorAll() { return mounted ? [button] : []; },
    createElement() { return button; },
  };
  const window = { localStorage: {
    getItem() { return stored; },
    setItem(_key: string, value: string) { stored = value; },
  } };
  runInNewContext(source, { document, window }, { timeout: 1000 });
  assert.equal(attrs.get('data-munin-theme'), 'classic');
  assert.equal(buttonAttrs.get('aria-pressed'), 'false');
  click();
  assert.equal(stored, 'nordic');
  assert.equal(attrs.get('data-munin-theme'), 'nordic');
  assert.equal(buttonAttrs.get('aria-pressed'), 'true');
  click();
  assert.equal(stored, 'classic');
  assert.equal(button.textContent, 'NORDIC OFF');
});

test('Nordic theme stays small and introduces no new animation or rendering engine', async () => {
  const [script, css] = await Promise.all([
    web('public/nordic-theme.js'),
    web('public/nordic-theme.css'),
  ]);
  assert.ok(Buffer.byteLength(script) < 3500);
  assert.ok(Buffer.byteLength(css) < 8000);
  assert.doesNotMatch(script, /requestAnimationFrame|fetch\(|WebGL|getContext\(|import\(/);
  assert.doesNotMatch(css, /@keyframes/);
  const animationDeclarations = [...css.matchAll(/\banimation\s*:\s*([^;}\n]+)/g)].map(match => match[1].trim());
  assert.deepEqual(animationDeclarations, ['none']);
});