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
