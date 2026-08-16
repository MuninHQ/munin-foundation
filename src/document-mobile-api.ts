import type { IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { mobileAuthorized } from './mobile-api.js';
import { ingestDocument } from './document-intelligence.js';
import { json, readJsonBody } from './http.js';

const MAX_UPLOAD_BYTES=20_000_000;
const inboxRoot=()=>path.resolve('data/runtime/document-inbox');
const outputRoot=()=>path.resolve('data/runtime/documents');

export function safeUploadName(value:string){
 const base=path.basename(value).replace(/[^a-zA-Z0-9._() -]+/g,'-').replace(/^\.+/,'').trim();
 if(!base||base==='.'||base==='..')throw new Error('Nome de arquivo inválido.');
 return base.slice(0,180);
}

export function decodeBase64Payload(value:unknown){
 if(typeof value!=='string'||!value.trim())throw new Error('dataBase64 is required');
 const compact=value.replace(/^data:[^;]+;base64,/i,'').replace(/\s+/g,'');
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(compact))throw new Error('Payload base64 inválido.');
 const payload=Buffer.from(compact,'base64');
 if(!payload.length)throw new Error('Arquivo vazio.');
 if(payload.length>MAX_UPLOAD_BYTES)throw new Error('Arquivo acima de 20 MB para upload pelo Mobile. Use ingestão local no PC.');
 return payload;
}

export async function handleDocumentMobileApi(request:IncomingMessage,response:ServerResponse):Promise<void>{
 if(request.method==='OPTIONS')return json(request,response,204,{});
 if(!mobileAuthorized(request))return json(request,response,401,{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
 const url=new URL(request.url??'/','http://localhost');
 try{
  if(request.method==='POST'&&url.pathname==='/api/mobile/documents/ingest'){
   const body=await readJsonBody(request,28_000_000);const name=safeUploadName(typeof body.name==='string'?body.name:'document.bin');const payload=decodeBase64Payload(body.dataBase64);await fs.mkdir(inboxRoot(),{recursive:true});const destination=path.join(inboxRoot(),`${Date.now()}-${name}`);await fs.writeFile(destination,payload);
   const result=await ingestDocument(destination,outputRoot());return json(request,response,200,{sourceFile:name,storedAs:destination,engine:result.engine,manifest:result.manifest,warnings:result.warnings,chunkCount:result.chunks.length,hasMarkdown:Boolean(result.markdown),hasStructuredJson:Boolean(result.json)});
  }
  return json(request,response,404,{error:'Document route not found'});
 }catch(error){return json(request,response,400,{error:error instanceof Error?error.message:String(error)})}
}
