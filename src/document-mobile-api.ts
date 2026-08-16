import type { IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { mobileAuthorized } from './mobile-api.js';
import { ingestDocument } from './document-intelligence.js';
import { json, readJsonBody } from './http.js';

const MAX_UPLOAD_BYTES=20_000_000;
const inboxRoot=()=>path.resolve('data/runtime/document-inbox');
const outputRoot=()=>path.resolve('data/runtime/documents');

export type MobileDocument={id:string;sourceFile:string;engine?:string;sha256?:string;chunkCount?:number;ingestedAt?:string;warnings:string[]};

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

export async function listMobileDocuments(root=outputRoot()):Promise<MobileDocument[]>{
 try{
  const entries=await fs.readdir(root,{withFileTypes:true});const docs:MobileDocument[]=[];
  for(const entry of entries){
   if(!entry.isDirectory())continue;
   const manifestPath=path.join(root,entry.name,'manifest.json');
   try{const raw=JSON.parse(await fs.readFile(manifestPath,'utf8'));docs.push({id:entry.name,sourceFile:String(raw.sourceFile??raw.source?.name??entry.name),engine:raw.engine?String(raw.engine):undefined,sha256:raw.sha256?String(raw.sha256):undefined,chunkCount:Number.isFinite(raw.chunkCount)?Number(raw.chunkCount):Array.isArray(raw.chunks)?raw.chunks.length:undefined,ingestedAt:raw.ingestedAt??raw.createdAt,warnings:Array.isArray(raw.warnings)?raw.warnings.map(String):[]})}catch{}
  }
  return docs.sort((a,b)=>String(b.ingestedAt??'').localeCompare(String(a.ingestedAt??'')));
 }catch{return []}
}

export async function handleDocumentMobileApi(request:IncomingMessage,response:ServerResponse):Promise<void>{
 if(request.method==='OPTIONS')return json(request,response,204,{});
 if(!mobileAuthorized(request))return json(request,response,401,{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
 const url=new URL(request.url??'/','http://localhost');
 try{
  if(request.method==='GET'&&url.pathname==='/api/mobile/documents')return json(request,response,200,{documents:await listMobileDocuments()});
  if(request.method==='POST'&&url.pathname==='/api/mobile/documents/ingest'){
   const body=await readJsonBody(request,28_000_000);const name=safeUploadName(typeof body.name==='string'?body.name:'document.bin');const payload=decodeBase64Payload(body.dataBase64);await fs.mkdir(inboxRoot(),{recursive:true});const destination=path.join(inboxRoot(),`${Date.now()}-${name}`);await fs.writeFile(destination,payload);
   const result=await ingestDocument(destination,outputRoot());return json(request,response,200,{sourceFile:name,storedAs:destination,engine:result.engine,manifest:result.manifest,warnings:result.warnings,chunkCount:result.chunks.length,hasMarkdown:Boolean(result.markdown),hasStructuredJson:Boolean(result.json)});
  }
  return json(request,response,404,{error:'Document route not found'});
 }catch(error){return json(request,response,400,{error:error instanceof Error?error.message:String(error)})}
}