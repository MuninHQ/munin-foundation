import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package exposes zero-cost capability radar CLI',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8')) as {scripts:Record<string,string>};
 assert.match(pkg.scripts['capability:radar'],/capability-radar-cli\.js/);
 assert.doesNotMatch(pkg.scripts['capability:radar'],/openai|ollama|claude|gemini/i);
});
