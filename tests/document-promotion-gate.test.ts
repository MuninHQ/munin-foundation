import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDocumentPromotion } from '../src/document-promotion-gate.js';
import type { DocumentBenchmarkItem,DocumentBenchmarkReport } from '../src/document-benchmark.js';

const make=(engines:string[],extensions:string[],failed=0):DocumentBenchmarkReport=>{
 const items:DocumentBenchmarkItem[]=engines.map((engine,index)=>({file:`f${index}${extensions[index]}`,extension:extensions[index],bytes:100,engine,durationMs:10,chunks:1,warnings:[],ok:index>=failed}));
 if(failed)for(let i=0;i<failed;i++)items[i]={...items[i],engine:'error',ok:false};
 return{generatedAt:new Date().toISOString(),inputDir:'in',outputDir:'out',documents:items.length,docling:items.filter(x=>x.engine==='docling').length,fallback:items.filter(x=>x.engine==='native-fallback').length,failed:items.filter(x=>!x.ok).length,totalMs:50,items};
};

test('requires representative evidence before deciding',()=>{
 const decision=evaluateDocumentPromotion(make(['docling','docling','docling','docling'],['.pdf','.docx','.pptx','.xlsx']));
 assert.equal(decision.verdict,'insufficient_evidence');
});

test('promotes representative benchmark with >=80 percent Docling and no failures',()=>{
 const decision=evaluateDocumentPromotion(make(['docling','docling','docling','docling','native-fallback'],['.pdf','.docx','.pptx','.xlsx','.pdf']));
 assert.equal(decision.verdict,'promote');
});

test('rejects material fallback or ingestion failures',()=>{
 const fallback=evaluateDocumentPromotion(make(['docling','docling','docling','native-fallback','native-fallback'],['.pdf','.docx','.pptx','.xlsx','.pdf']));
 assert.equal(fallback.verdict,'reject');
 const failed=evaluateDocumentPromotion(make(['docling','docling','docling','docling','docling'],['.pdf','.docx','.pptx','.xlsx','.pdf'],1));
 assert.equal(failed.verdict,'reject');
});
