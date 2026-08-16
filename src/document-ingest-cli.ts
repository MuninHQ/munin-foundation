#!/usr/bin/env node
import path from 'node:path';
import { ingestDocument } from './document-intelligence.js';

const source=process.argv[2];
const output=process.argv[3]?path.resolve(process.argv[3]):path.resolve('data/runtime/documents');
if(!source){console.error('Uso: npm run document:ingest -- <arquivo> [diretorio-saida]');process.exitCode=2}
else{
  try{
    const result=await ingestDocument(source,output);
    console.log(JSON.stringify({source:result.source,engine:result.engine,outputDir:result.outputDir,markdown:Boolean(result.markdown),json:Boolean(result.json),warnings:result.warnings},null,2));
    if(result.warnings.length)process.exitCode=0;
  }catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1}
}
