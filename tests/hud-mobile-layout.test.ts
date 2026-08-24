import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web=(path:string)=>readFile(new URL(`../../apps/web/${path}`,import.meta.url),'utf8');

test('HUD uses a dedicated single-column mobile layout',async()=>{
  const [page,css]=await Promise.all([web('hud.html'),web('public/hud.css')]);
  assert.match(page,/viewport-fit=cover/);
  assert.match(css,/@media\(max-width:900px\),\(pointer:coarse\) and \(max-width:1100px\)/);
  assert.match(css,/flex-direction:column/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/\.hud-panel\{position:relative!important/);
});

test('HUD mobile removes overlapping desktop effects and contains the composer',async()=>{
  const css=await web('public/hud.css');
  assert.match(css,/\.hud-node,.hud-reticle,.hud-readout\{display:none!important\}/);
  assert.match(css,/\.hud-command\{order:6;position:fixed;left:0;right:0/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/\.hud-command input\{min-width:0;width:100%;font-size:16px/);
  assert.match(await web('hud.html'),/hud\.css\?v=/);
});

