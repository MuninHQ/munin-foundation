import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { runtimePath } from './config.js';
import { writeJsonAtomic } from './storage.js';
import { loadImageSettings } from './image-settings.js';

export type GeneratedImage={id:string;postId?:string;filename:string;path:string;mimeType:'image/png';createdAt:string;model:string;size:string;quality:string};
const assetsDir=()=>runtimePath('linkedin-images');
const assetsFile=()=>join(assetsDir(),'assets.json');
async function loadAssets():Promise<GeneratedImage[]>{try{return JSON.parse(await readFile(assetsFile(),'utf8')) as GeneratedImage[];}catch{return [];}}
async function saveAssets(items:GeneratedImage[]){await writeJsonAtomic(assetsFile(),items);}
function safeBase(url:string){return url.replace(/\/$/,'');}
export async function imageProviderStatus(){const s=await loadImageSettings();return {enabled:s.enabled&&Boolean(s.apiKey&&s.baseUrl&&s.model),provider:'openai',model:s.model,size:s.size,quality:s.quality};}
export async function testImageProvider(){const s=await loadImageSettings();if(!s.enabled||!s.apiKey)throw new Error('Geração de imagem não está configurada.');const r=await fetch(`${safeBase(s.baseUrl)}/models/${encodeURIComponent(s.model)}`,{headers:{authorization:`Bearer ${s.apiKey}`}});if(!r.ok)throw new Error(`Provider respondeu ${r.status}`);return {ok:true,model:s.model};}
export async function generateLinkedInImage(prompt:string,postId?:string):Promise<GeneratedImage>{const s=await loadImageSettings();if(!s.enabled||!s.apiKey)throw new Error('Configure o provider de imagem em Settings antes de gerar.');const r=await fetch(`${safeBase(s.baseUrl)}/images/generations`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${s.apiKey}`},body:JSON.stringify({model:s.model,prompt,size:s.size,quality:s.quality,output_format:'png'})});if(!r.ok){const detail=await r.text();throw new Error(`Falha ao gerar imagem (${r.status}): ${detail.slice(0,240)}`);}const payload=await r.json() as any;const b64=payload?.data?.[0]?.b64_json;if(typeof b64!=='string'||!b64)throw new Error('Provider respondeu sem imagem.');const id=`img_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;const filename=`${id}.png`;const path=join(assetsDir(),filename);await mkdir(assetsDir(),{recursive:true});await writeFile(path,Buffer.from(b64,'base64'));const asset:GeneratedImage={id,postId,filename,path,mimeType:'image/png',createdAt:new Date().toISOString(),model:s.model,size:s.size,quality:s.quality};const assets=await loadAssets();assets.unshift(asset);await saveAssets(assets.slice(0,200));return asset;}
export async function getGeneratedImage(id:string):Promise<{asset:GeneratedImage;bytes:Buffer}>{const assets=await loadAssets();const asset=assets.find(x=>x.id===id);if(!asset)throw new Error('Imagem não encontrada.');if(basename(asset.path)!==asset.filename)throw new Error('Caminho de imagem inválido.');return {asset,bytes:await readFile(asset.path)};}
