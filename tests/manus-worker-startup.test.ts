import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Manus bridge startup runs only the bounded local worker',async()=>{const source=await readFile(new URL('../../scripts/install-manus-bridge-startup.ps1',import.meta.url),'utf8');assert.match(source,/npm run manus:worker/);assert.doesNotMatch(source,/MANUS_API_KEY|Invoke-Expression|git push|--force/)});
