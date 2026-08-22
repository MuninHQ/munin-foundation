import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web=(path:string)=>readFile(new URL(`../../apps/web/${path}`,import.meta.url),'utf8');

test('shared navigation exposes a mobile-first global command palette',async()=>{
 const [nav,css]=await Promise.all([web('public/munin-nav.js'),web('public/munin.css')]);
 assert.match(nav,/munin-command-launch/);assert.match(nav,/ctrlKey|metaKey/);assert.match(nav,/operator-chat\.html/);assert.match(nav,/flows\.html/);
 assert.match(css,/munin-command-overlay/);assert.match(css,/@media\(max-width:640px\)/);
});

test('flow viewer renders real orchestration traces without mutation controls',async()=>{
 const page=await web('flows.html');assert.match(page,/\/api\/orchestration\/traces/);assert.match(page,/attempts/);assert.match(page,/selectedProviderId/);assert.doesNotMatch(page,/method:\s*['"]POST/);
});

test('operational chat uses local assistant and explicit sanitized ChatGPT handoff',async()=>{
 const page=await web('operator-chat.html');assert.match(page,/\/api\/assistant/);assert.match(page,/chatgpt-operator-bridge\.ts/);assert.match(page,/SEM API PAGA/);assert.doesNotMatch(page,/MANUS_API_KEY|MUNIN_MOBILE_TOKEN/);
});
