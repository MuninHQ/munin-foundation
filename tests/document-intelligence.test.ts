import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ingestDocument } from '../src/document-intelligence.js';

test('uses deterministic fallback when Docling is unavailable',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-doc-'));const source=path.join(dir,'note.md');const out=path.join(dir,'out');await writeFile(source,'# Munin\n\nContinuity matters.\n\n## Memory\n\nKeep provenance.','utf8');
 const execFileImpl:any=async()=>{throw new Error('not found')};const result=await ingestDocument(source,out,{execFileImpl});assert.equal(result.engine,'native-fallback');assert.match(result.markdown??'',/Continuity matters/);assert.ok(result.warnings.length);assert.ok(result.manifest.sourceHash.length===64);assert.equal(result.manifest.chunkCount,result.chunks.length);assert.ok(result.chunks.length>=1);assert.equal(result.chunks[0].sourceHash,result.manifest.sourceHash);assert.match(await readFile(path.join(out,'note.manifest.json'),'utf8'),/sourceHash/);assert.match(await readFile(path.join(out,'note.chunks.jsonl'),'utf8'),/Continuity matters/);await rm(dir,{recursive:true,force:true});
});

test('uses Docling outputs when local CLI is available',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-docling-'));const source=path.join(dir,'sample.pdf');const out=path.join(dir,'out');await writeFile(source,'fake','utf8');
 const execFileImpl:any=async(file:string,args:string[])=>{if(file==='where.exe'||file==='which')return {stdout:'/usr/local/bin/docling\n',stderr:''};await writeFile(path.join(out,'sample.md'),'# Structured\n\nTable content','utf8');await writeFile(path.join(out,'sample.json'),JSON.stringify({name:'sample'}),'utf8');assert.ok(args.includes('--abort-on-error'));return {stdout:'',stderr:''}};
 const result=await ingestDocument(source,out,{execFileImpl});assert.equal(result.engine,'docling');assert.equal((result.json as any).name,'sample');assert.match(result.markdown??'',/Structured/);assert.equal(result.manifest.engine,'docling');assert.equal(result.manifest.artifacts.json,'sample.json');assert.ok(result.chunks.some(x=>x.heading==='Structured'));assert.deepEqual(result.warnings,[]);await rm(dir,{recursive:true,force:true});
});

test('does not pretend to parse binary documents without Docling',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-doc-bin-'));const source=path.join(dir,'sample.pdf');const out=path.join(dir,'out');await writeFile(source,'fake','utf8');const execFileImpl:any=async()=>{throw new Error('not found')};const result=await ingestDocument(source,out,{execFileImpl});assert.equal(result.engine,'native-fallback');assert.equal(result.markdown,undefined);assert.equal(result.chunks.length,0);assert.equal(result.manifest.chunkCount,0);assert.match(result.warnings.join(' '),/requer Docling/i);await rm(dir,{recursive:true,force:true});
});
