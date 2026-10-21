import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web=(path:string)=>readFile(new URL(`../../apps/web/${path}`,import.meta.url),'utf8');

test('Action Inbox renders the Sentinel verdict and cannot-undo note next to Aprovar',async()=>{
  const page=await web('action-inbox.html');
  assert.match(page,/VEREDITO DO SENTINEL/);assert.match(page,/NÃO PODE SER DESFEITO/);
  assert.match(page,/x\.verdict\.cannotUndo/);assert.match(page,/e\(x\.verdict\.payloadPreview\)/);
});
