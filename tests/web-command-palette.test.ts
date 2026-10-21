import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web=(path:string)=>readFile(new URL(`../../apps/web/${path}`,import.meta.url),'utf8');

test('command palette is keyboard-operable as an accessible listbox',async()=>{
  const nav=await web('public/munin-nav.js');
  assert.match(nav,/role="combobox"/);assert.match(nav,/role="listbox"/);assert.match(nav,/role="option"/);
  assert.match(nav,/aria-activedescendant/);assert.match(nav,/ArrowDown/);assert.match(nav,/ArrowUp/);assert.match(nav,/'Enter'/);
  assert.match(nav,/munin\.command\.recent/);
});

test('command palette actions stay local and reversible',async()=>{
  const nav=await web('public/munin-nav.js');
  const block=nav.slice(nav.indexOf('const actions = ['),nav.indexOf('];',nav.indexOf('const actions = [')));
  assert.ok(block.length>0,'actions block not found');
  assert.doesNotMatch(block,/fetch\(|\/api\/|method:|approve|submit|send|publish/i);
});
