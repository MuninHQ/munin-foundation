import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web=(path:string)=>readFile(new URL(`../../apps/web/${path}`,import.meta.url),'utf8');

test('operator chat defaults to plan mode and sends the chosen mode',async()=>{
  const page=await web('operator-chat.html');
  assert.match(page,/role="radiogroup"/);
  assert.match(page,/value="plan" checked/);
  assert.match(page,/mode:chosen/);
});

test('proposals execute only on an explicit click and a new message discards them',async()=>{
  const page=await web('operator-chat.html');
  assert.match(page,/class="run">Executar/);assert.match(page,/Descartar/);
  assert.match(page,/post\(command,'execute'\)/);
  assert.match(page,/Descartada — nova mensagem enviada/);
});

test('empty chat offers suggestions and mutations show how to undo them',async()=>{
  const page=await web('operator-chat.html');
  assert.match(page,/class="suggestions"/);assert.match(page,/d\.undo/);assert.match(page,/kind==='blocked'/);
});
