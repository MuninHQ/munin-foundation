import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { benchmarkDocuments } from '../src/document-benchmark.js';

test('benchmarks supported documents and persists a machine-readable report',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-doc-bench-'));const input=path.join(dir,'input');const out=path.join(dir,'out');
 const {mkdir}=await import('node:fs/promises');await mkdir(input,{recursive:true});
 await writeFile(path.join(input,'sample.md'),'# Sample\n\nRepository continuity matters.','utf8');
 await writeFile(path.join(input,'ignore.bin'),'x','utf8');
 const report=await benchmarkDocuments(input,out);
 assert.equal(report.documents,1);assert.equal(report.items[0]?.file,'sample.md');assert.equal(report.items[0]?.engine,'native-fallback');assert.ok((report.items[0]?.chunks??0)>0);
 const saved=JSON.parse(await readFile(path.join(out,'benchmark-report.json'),'utf8'));assert.equal(saved.documents,1);assert.equal(saved.items[0].file,'sample.md');
 await rm(dir,{recursive:true,force:true});
});
