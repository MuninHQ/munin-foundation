import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path:string){return readFile(new URL(`../../${path}`,import.meta.url),'utf8')}

test('web and mobile expose the ChatGPT operator bridge',async()=>{
 const [web,mobile]=await Promise.all([text('apps/web/index.html'),text('apps/web/mobile.html')]);
 assert.match(web,/chatgpt-operator-bridge\.ts/);
 assert.match(mobile,/chatgpt-operator-bridge\.ts/);
});

test('operator bridge never places Munin tokens or API keys in the handoff payload',async()=>{
 const bridge=await text('apps/web/src/chatgpt-operator-bridge.ts');
 assert.match(bridge,/SNAPSHOT LOCAL SANITIZADO/);
 assert.match(bridge,/sem tokens\/credenciais/);
 assert.match(bridge,/não deve iniciar Ollama/);
 assert.match(bridge,/MuninHQ\/munin-foundation/);
 assert.doesNotMatch(bridge,/JSON\.stringify\(localStorage/);
 assert.doesNotMatch(bridge,/apiKey\s*:/);
 assert.doesNotMatch(bridge,/token\s*:/);
});

test('local assistant UI labels itself deterministic and routes free reasoning to ChatGPT cockpit',async()=>{
 const dock=await text('apps/web/src/assistant-dock.ts');
 assert.match(dock,/MUNIN LOCAL/);
 assert.match(dock,/OPERAÇÕES DETERMINÍSTICAS · SEM OLLAMA/);
 assert.match(dock,/ChatGPT Cockpit/);
 assert.match(dock,/munin-gpt-launch/);
});
