import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { addVisualReference, loadLinkedInContent } from './linkedin-content.js';
import { analyzeAllVisualReferences, analyzeVisualReference, visualIntelligenceRecords, visualIntelligenceStatus } from './visual-intelligence.js';
import { bytes, json, readJsonBody as body, requireText as text, stringList as list, optionalText } from './http.js';
import { dataDir } from './config.js';

export async function handleVisualAssets(request:IncomingMessage,response:ServerResponse):Promise<void>{if(request.method==='OPTIONS')return json(request,response,204,{});const url=new URL(request.url??'/','http://127.0.0.1');try{
  if(request.method==='GET'&&url.pathname==='/api/visual-assets/health')return json(request,response,200,{status:'ok',service:'munin-visual-assets',visualIntelligence:await visualIntelligenceStatus()});
  if(request.method==='GET'&&url.pathname==='/api/visual-assets'){const state=await loadLinkedInContent();const records=await visualIntelligenceRecords();return json(request,response,200,{assets:state.visualReferences.map(asset=>({...asset,intelligence:records[asset.id]})),posts:state.posts.map(p=>({id:p.id,title:p.title,status:p.status,publishedAt:p.publishedAt,visualReferenceId:p.visualReferenceId})),visualIntelligence:await visualIntelligenceStatus()});}
  if(request.method==='POST'&&url.pathname==='/api/visual-assets'){const input=await body(request);const ref=await addVisualReference({label:text(input.label,'label'),postId:optionalText(input.postId),dataBase64:text(input.dataBase64,'dataBase64'),objects:list(input.objects),composition:typeof input.composition==='string'?input.composition:undefined,motifs:list(input.motifs),notes:typeof input.notes==='string'?input.notes:undefined});return json(request,response,201,{asset:ref,url:`/api/visual-assets/${ref.id}/image`});}
  if(request.method==='POST'&&url.pathname==='/api/visual-assets/analyze-all'){const input=await body(request);const limit=typeof input.limit==='number'?input.limit:20;return json(request,response,200,await analyzeAllVisualReferences(limit));}
  const analyze=url.pathname.match(/^\/api\/visual-assets\/([^/]+)\/analyze$/);if(request.method==='POST'&&analyze)return json(request,response,200,await analyzeVisualReference(analyze[1]));
  const image=url.pathname.match(/^\/api\/visual-assets\/([^/]+)\/image$/);if(request.method==='GET'&&image){const state=await loadLinkedInContent();const ref=state.visualReferences.find(x=>x.id===image[1]);if(!ref?.sourcePath||!ref.mimeType)throw new Error('Imagem não encontrada');if(!['image/png','image/jpeg','image/webp'].includes(ref.mimeType))throw new Error('Formato não suportado');const resolved=resolve(ref.sourcePath);if(!resolved.startsWith(resolve(dataDir())+sep))throw new Error('Caminho inválido');const payload=await readFile(resolved);return bytes(request,response,payload,{'content-type':ref.mimeType,'cache-control':'private, max-age=3600'});}
  return json(request,response,404,{error:'Not found'});
}catch(error){return json(request,response,400,{error:error instanceof Error?error.message:String(error)});}}

export function createVisualAssetsServer(){return createServer((request,response)=>void handleVisualAssets(request,response));}
if(process.argv[1]?.endsWith('visual-assets-api.js')){const port=Number(process.env.MUNIN_VISUAL_ASSETS_PORT??4312);createVisualAssetsServer().listen(port,'127.0.0.1',()=>console.log(`Munin Visual Assets API running at http://127.0.0.1:${port}`));}
