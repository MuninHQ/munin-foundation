import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path:string){return readFile(new URL(`../../${path}`,import.meta.url),'utf8')}

test('web and mobile expose the Claude operator bridge',async()=>{
 const [web,mobile]=await Promise.all([text('apps/web/index.html'),text('apps/web/mobile.html')]);
 assert.match(web,/claude-operator-bridge\.ts/);
 assert.match(mobile,/claude-operator-bridge\.ts/);
});

test('operator bridge never places Munin tokens or API keys in the handoff payload',async()=>{
 const bridge=await text('apps/web/src/claude-operator-bridge.ts');
 assert.match(bridge,/ZERO RISK · MANUAL/);
 assert.match(bridge,/navigator\.clipboard\.writeText/);
 assert.match(bridge,/window\.open/);
 assert.doesNotMatch(bridge,/querySelector\([^)]*iframe|contentDocument|contentWindow|MutationObserver|postMessage|sendPrompt|readResponse/);
 assert.match(bridge,/SNAPSHOT LOCAL SANITIZADO/);
 assert.match(bridge,/sem tokens\/credenciais/);
 assert.match(bridge,/não deve iniciar Ollama/);
 assert.match(bridge,/MuninHQ\/munin-foundation/);
 assert.match(bridge,/MUNIN — CLAUDE OPERATOR HANDOFF/);
 assert.match(bridge,/https:\/\/claude\.ai\/new/);
 assert.doesNotMatch(bridge,/chatgpt\.com/i);
 assert.doesNotMatch(bridge,/JSON\.stringify\(localStorage/);
 assert.doesNotMatch(bridge,/apiKey\s*:/);
 assert.doesNotMatch(bridge,/token\s*:/);
});

test('local assistant UI labels itself deterministic and routes long conversations to the Claude cockpit',async()=>{
 const dock=await text('apps/web/src/assistant-dock.ts');
 assert.match(dock,/MUNIN LOCAL/);
 assert.match(dock,/OPERAÇÕES DETERMINÍSTICAS · SEM OLLAMA/);
 assert.match(dock,/Claude Cockpit/);
 assert.match(dock,/✦ Claude/);
 assert.doesNotMatch(dock,/chatgpt\.com/i);
 assert.match(dock,/munin-claude-launch/);
});
