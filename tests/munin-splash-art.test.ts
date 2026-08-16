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
