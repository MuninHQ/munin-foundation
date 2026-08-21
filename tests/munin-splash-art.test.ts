import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('mobile splash loads all approved artwork chunks before the splash runtime', async () => {
  const html=await readFile(path.resolve('apps/web/mobile.html'),'utf8');
  for(let i=0;i<7;i++)assert.match(html,new RegExp(`munin-splash-art-${i}\\.js`));
  assert.ok(html.indexOf('munin-splash-art.js')<html.indexOf('munin-splash.js'));
  const js=await readFile(path.resolve('apps/web/public/munin-splash.js'),'utf8');
  assert.match(js,/__muninSplashArt/);
  assert.doesNotMatch(js,/munin-splash-mountain|munin-splash-sail|munin-splash-hull/);
});

test('mobile splash memory progress reflects live synchronization state', async () => {
  const js=await readFile(path.resolve('apps/web/public/munin-splash.js'),'utf8');
  const css=await readFile(path.resolve('apps/web/public/munin-splash.css'),'utf8');
  assert.match(js,/munin-memory-sync/);
  assert.match(js,/\/api\/mobile\/home/);
  assert.match(js,/setProgress\(100,'Memória pronta\. Munin desperto\.'/);
  assert.match(js,/Reconectando à memória/);
  assert.match(css,/--munin-memory-progress/);
  assert.match(css,/\.munin-memory-fill/);
  assert.match(css,/@keyframes munin-memory-pulse/);
});

test('mobile splash can never block access and visibly exposes the enter action', async () => {
  const html=await readFile(path.resolve('apps/web/mobile.html'),'utf8');
  const guard=await readFile(path.resolve('apps/web/public/mobile-release-guard.js'),'utf8');
  assert.match(html,/mobile-release-guard\.js\?v=6/);
  assert.match(guard,/ENTRAR NO MUNIN/);
  assert.match(guard,/setTimeout\(close,4000\)/);
  assert.match(guard,/enter\?\.addEventListener\('click',close/);
});

test('mobile release invalidates cached clients and bypasses browser HTTP caches', async () => {
  const html=await readFile(path.resolve('apps/web/mobile.html'),'utf8');
  const worker=await readFile(path.resolve('apps/web/public/munin-sw.js'),'utf8');
  const main=await readFile(path.resolve('apps/web/src/mobile-main.tsx'),'utf8');
  const vite=await readFile(path.resolve('apps/web/vite.config.ts'),'utf8');
  assert.match(html,/munin-splash\.js\?v=6/);
  assert.match(worker,/munin-mobile-v6/);
  assert.match(worker,/client\.navigate\(client\.url\)/);
  assert.match(main,/updateViaCache:'none'/);
  assert.match(main,/registration\.update\(\)/);
  assert.match(vite,/'Cache-Control': 'no-store'/);
});
