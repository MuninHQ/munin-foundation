import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decodeBase64Payload, listMobileDocuments, safeUploadName } from '../src/document-mobile-api.js';

test('sanitizes mobile upload filenames',()=>{
 assert.equal(safeUploadName('../../CV André?.pdf'),'CV Andr-.pdf');
 assert.equal(safeUploadName('report 2026.docx'),'report 2026.docx');
 assert.throws(()=>safeUploadName('..'));
});

test('decodes bounded base64 document payloads',()=>{
 const value=Buffer.from('munin').toString('base64');assert.equal(decodeBase64Payload(value).toString('utf8'),'munin');assert.equal(decodeBase64Payload(`data:text/plain;base64,${value}`).toString('utf8'),'munin');assert.throws(()=>decodeBase64Payload('%%%'),/base64/i);
});

test('lists ingested documents from traceable manifests',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'munin-doc-vault-'));
 try{
  await fs.mkdir(path.join(root,'doc-a'));await fs.mkdir(path.join(root,'doc-b'));
  await fs.writeFile(path.join(root,'doc-a','manifest.json'),JSON.stringify({sourceFile:'cv.pdf',engine:'docling',sha256:'abc',chunkCount:12,ingestedAt:'2026-08-16T10:00:00Z',warnings:[]}));
  await fs.writeFile(path.join(root,'doc-b','manifest.json'),JSON.stringify({sourceFile:'deck.pptx',engine:'fallback',chunkCount:3,ingestedAt:'2026-08-16T11:00:00Z',warnings:['layout limited']}));
  const docs=await listMobileDocuments(root);assert.equal(docs.length,2);assert.equal(docs[0].sourceFile,'deck.pptx');assert.equal(docs[1].engine,'docling');assert.equal(docs[1].sha256,'abc');
 }finally{await fs.rm(root,{recursive:true,force:true})}
});