import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(){return readFile(new URL('../../apps/web/settings.html',import.meta.url),'utf8')}

test('settings presents ChatGPT-first as the default and providers as optional',async()=>{
 const html=await source();
 assert.match(html,/PADRÃO · CHATGPT-FIRST/);
 assert.match(html,/Nenhuma API de IA é necessária/);
 assert.match(html,/AVANÇADO · OPCIONAL/);
 assert.match(html,/Isto não é necessário para o modo ChatGPT-first/);
});

test('settings warns that API billing is separate and Ollama is opt-in',async()=>{
 const html=await source();
 assert.match(html,/ChatGPT Plus\/Pro não é tratado como crédito de API/);
 assert.match(html,/Ollama local · opt-in/);
 assert.match(html,/não será iniciado automaticamente pelo Munin/);
});

test('settings exposes a guarded Nemotron 3 Ultra preset',async()=>{
 const html=await source();
 assert.match(html,/NVIDIA Nemotron 3 Ultra/);
 assert.match(html,/https:\/\/integrate\.api\.nvidia\.com\/v1/);
 assert.match(html,/nvidia\/nemotron-3-ultra-550b-a55b/);
 assert.match(html,/Raciocínio do Nemotron/);
 assert.match(html,/text-only/);
 assert.match(html,/não tentará baixá-lo ou iniciá-lo neste PC/);
});
