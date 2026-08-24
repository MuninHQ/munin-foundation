import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Content Studio is build-routed and exposes governed integration states',async()=>{const [html,vite,api]=await Promise.all([readFile('apps/web/content-studio.html','utf8'),readFile('apps/web/vite.config.ts','utf8'),readFile('src/api.ts','utf8')]);assert.match(vite,/content-studio/);assert.match(html,/MoneyPrinterTurbo/);assert.match(html,/aprovação humana obrigatória/);assert.match(api,/\/api\/content-studio\/status/);assert.match(api,/\/api\/content-studio\/video/);});
