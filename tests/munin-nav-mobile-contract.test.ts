import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const navPath = resolve(process.cwd(), 'apps/web/munin-nav.js');

async function navSource() {
  return readFile(navPath, 'utf8');
}

test('global navigation is collapsed by default on mobile surfaces', async () => {
  const source = await navSource();
  assert.match(source, /nav\.hidden=!open/);
  assert.match(source, /setOpen\(false\)/);
  assert.match(source, /aria-expanded','false'/);
  assert.match(source, /toggle\.onclick=/);
});

test('global navigation respects mobile viewport and safe area', async () => {
  const source = await navSource();
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /max-width:min\(92vw,760px\)/);
  assert.match(source, /max-height:min\(58vh,420px\)/);
  assert.match(source, /overflow:auto/);
});

test('global navigation remains keyboard dismissible', async () => {
  const source = await navSource();
  assert.match(source, /addEventListener\('keydown'/);
  assert.match(source, /e\.key==='Escape'/);
});
