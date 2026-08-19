import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const analysisPath=resolve(process.cwd(),'src/career-intake-analysis.ts');
async function source(){return readFile(analysisPath,'utf8')}

test('career intake does not block on remote URL when job text is supplied',async()=>{
 const code=await source();
 assert.match(code,/if\(input\.url&&!suppliedText\)/);
 assert.match(code,/else if\(input\.url&&suppliedText\)/);
 assert.match(code,/leitura remota da URL não bloqueou a análise/);
});

test('career match has a bounded provider budget and deterministic fallback',async()=>{
 const code=await source();
 assert.match(code,/MUNIN_CAREER_MATCH_TIMEOUT_MS\?\?15000/);
 assert.match(code,/withDeadline\(completeWithLlm/);
 assert.match(code,/CAREER_MATCH_TIMEOUT/);
 assert.match(code,/fallback local aplicado/);
});
