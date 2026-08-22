import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web=(path:string)=>readFile(new URL(`../../apps/web/${path}`,import.meta.url),'utf8');

test('shared shell exposes a five-destination mobile navigation and quick action',async()=>{
  const [nav,css]=await Promise.all([web('public/munin-nav.js'),web('public/munin.css')]);
  for(const label of ['Hoje','Inbox','Carreira','LinkedIn','Mais'])assert.match(nav,new RegExp(label));
  assert.match(nav,/munin-mobile-nav/);assert.match(nav,/Ação rápida/);
  assert.match(css,/safe-area-inset-bottom/);assert.match(css,/munin-skeleton/);assert.match(css,/munin-status-attention/);
});

test('React home no longer requires desktop width and has the same mobile destinations',async()=>{
  const [app,css]=await Promise.all([web('src/App.tsx'),web('src/styles.css')]);
  assert.match(app,/mobile-home-nav/);assert.match(css,/body\{min-width:320px\}/);
  assert.match(css,/@media\(max-width:760px\)/);
});

test('Action Inbox explains decisions and offers resilient feedback without API mutation',async()=>{
  const page=await web('action-inbox.html');
  for(const label of ['POR QUE IMPORTA','RECOMENDAÇÃO','IMPACTO','Tentar novamente','Adiar','Descartar'])assert.match(page,new RegExp(label));
  assert.match(page,/munin-skeleton/);assert.match(page,/Recebido/);assert.match(page,/Concluído/);
  assert.doesNotMatch(page,/method:\s*['"]POST/);
});
