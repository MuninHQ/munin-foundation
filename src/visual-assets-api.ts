import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { addVisualReference, loadLinkedInContent } from './linkedin-content.js';

function json(response:ServerResponse,status:number,body:unknown){response.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'});response.end(JSON.stringify(body));}
async function body(request:IncomingMessage):Promise<Record<string,unknown>>{const chunks:Buffer[]=[];let size=0;for await(const chunk of request){const value=Buffer.from(chunk);size+=value.length;if(size>6_000_000)throw new Error('Payload too large');chunks.push(value);}if(!chunks.length)return{};const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('JSON object body required');return parsed as Record<string,unknown>;}
function text(value:unknown,field:string){if(typeof value!=='string'||!value.trim())throw new Error(`${field} is required`);return value.trim();}
function list(value:unknown){return Array.isArray(value)?value.filter((x):x is string=>typeof x==='string').map(x=>x.trim()).filter(Boolean):[];}

export async function handleVisualAssets(request:IncomingMessage,response:ServerResponse):Promise<void>{if(request.method==='OPTIONS')return json(response,204,{});const url=new URL(request.url??'/','http://127.0.0.1');try{
  if(request.method==='GET'&&url.pathname==='/api/visual-assets/health')return json(response,200,{status:'ok',service:'munin-visual-assets'});
  if(request.method==='GET'&&url.pathname==='/api/visual-assets'){const state=await loadLinkedInContent();return json(response,200,{assets:state.visualReferences,posts:state.posts.map(p=>({id:p.id,title:p.title,status:p.status,publishedAt:p.publishedAt,visualReferenceId:p.visualReferenceId}))});}
  if(request.method==='POST'&&url.pathname==='/api/visual-assets'){const input=await body(request);const ref=await addVisualReference({label:text(input.label,'label'),postId:typeof input.postId==='string'&&input.postId?input.postId:undefined,dataBase64:text(input.dataBase64,'dataBase64'),objects:list(input.objects),composition:typeof input.composition==='string'?input.composition:undefined,motifs:list(input.motifs),notes:typeof input.notes==='string'?input.notes:undefined});return json(response,201,{asset:ref,url:`http://127.0.0.1:4312/api/visual-assets/${ref.id}/image`});}
  const image=url.pathname.match(/^\/api\/visual-assets\/([^/]+)\/image$/);if(request.method==='GET'&&image){const state=await loadLinkedInContent();const ref=state.visualReferences.find(x=>x.id===image[1]);if(!ref?.sourcePath||!ref.mimeType)throw new Error('Imagem não encontrada');if(!['image/png','image/jpeg','image/webp'].includes(ref.mimeType))throw new Error('Formato não suportado');if(!basename(ref.sourcePath))throw new Error('Caminho inválido');const bytes=await readFile(ref.sourcePath);response.writeHead(200,{'content-type':ref.mimeType,'cache-control':'private, max-age=3600','access-control-allow-origin':'*'});response.end(bytes);return;}
  return json(response,404,{error:'Not found'});
}catch(error){return json(response,400,{error:error instanceof Error?error.message:String(error)});}}

export function createVisualAssetsServer(){return createServer((request,response)=>void handleVisualAssets(request,response));}
if(process.argv[1]?.endsWith('visual-assets-api.js')){const port=Number(process.env.MUNIN_VISUAL_ASSETS_PORT??4312);createVisualAssetsServer().listen(port,'127.0.0.1',()=>console.log(`Munin Visual Assets API running at http://127.0.0.1:${port}`));}
