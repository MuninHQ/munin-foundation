import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DoclingAdapter, type DoclingRunner } from '../src/docling-adapter.js';

test('health reports local CLI readiness',async()=>{const runner:DoclingRunner=async(command,args)=>{assert.equal(command,'docling');assert.deepEqual(args,['--version']);return {code:0,stdout:'Docling 2.x\n',stderr:''}};const health=await new DoclingAdapter(runner).health();assert.equal(health.ready,true);assert.match(health.version??'',/Docling/)});

test('conversion is local-only, disables remote services/plugins and preserves provenance',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'munin-docling-'));const source=path.join(dir,'sample.pdf');const output=path.join(dir,'out');await fs.writeFile(source,'fake');const runner:DoclingRunner=async(_command,args)=>{assert.equal(args[0],'convert');assert.equal(args.includes('--no-enable-remote-services'),true);assert.equal(args.includes('--no-allow-external-plugins'),true);assert.equal(args.includes('--quiet'),true);assert.equal(args.filter(x=>x==='--to').length,2);await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'sample.md'),'# Sample\n');await fs.writeFile(path.join(output,'sample.json'),JSON.stringify({name:'Sample'}));return {code:0,stdout:'',stderr:''}};const result=await new DoclingAdapter(runner).convert(source,output,['md','json']);assert.equal(result.normalized.provenance.local,true);assert.equal(result.normalized.provenance.adapter,'docling-cli');assert.equal(result.normalized.markdown,'# Sample\n');assert.deepEqual(result.normalized.document,{name:'Sample'})});

test('conversion fails deterministically on non-zero Docling exit',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'munin-docling-'));const source=path.join(dir,'sample.docx');await fs.writeFile(source,'fake');const runner:DoclingRunner=async()=>({code:2,stdout:'',stderr:'unsupported'});await assert.rejects(()=>new DoclingAdapter(runner).convert(source,path.join(dir,'out')),/Docling failed \(2\): unsupported/)})
