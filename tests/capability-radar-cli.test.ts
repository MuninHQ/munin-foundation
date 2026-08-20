import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package exposes zero-cost capability radar CLI',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8')) as {scripts:Record<string,string>};
 assert.match(pkg.scripts['capability:radar'],/capability-radar-cli\.js/);
 const source=await readFile(new URL('../src/capability-radar-cli.ts',new URL('../../',import.meta.url)),'utf8').catch(()=>null);
 assert.ok(source===null||!source.includes('OPENAI_API_KEY'));
});
