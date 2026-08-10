import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type ImageSettings={enabled:boolean;provider:'openai';baseUrl:string;apiKey:string;model:string;visionModel:string;size:'1024x1536'|'1024x1024';quality:'low'|'medium'|'high';updatedAt:string};
export type PublicImageSettings=Omit<ImageSettings,'apiKey'>&{hasApiKey:boolean;apiKeyHint?:string};
const file=join(process.cwd(),'data','runtime','image-settings.json');
const empty=():ImageSettings=>({enabled:false,provider:'openai',baseUrl:'https://api.openai.com/v1',apiKey:'',model:'gpt-image-1',visionModel:'gpt-5-mini',size:'1024x1536',quality:'medium',updatedAt:new Date(0).toISOString()});
export async function loadImageSettings():Promise<ImageSettings>{try{const parsed=JSON.parse(await readFile(file,'utf8')) as Partial<ImageSettings>;return {...empty(),...parsed,provider:'openai'};}catch{return empty();}}
export function publicImageSettings(settings:ImageSettings):PublicImageSettings{const {apiKey,...safe}=settings;return {...safe,hasApiKey:Boolean(apiKey),apiKeyHint:apiKey?`${apiKey.slice(0,3)}…${apiKey.slice(-4)}`:undefined};}
export async function saveImageSettings(input:Partial<ImageSettings>):Promise<PublicImageSettings>{const current=await loadImageSettings();const next:ImageSettings={...current,...input,provider:'openai',apiKey:input.apiKey===undefined||input.apiKey===''?current.apiKey:input.apiKey.trim(),baseUrl:(input.baseUrl??current.baseUrl).trim(),model:(input.model??current.model).trim(),visionModel:(input.visionModel??current.visionModel).trim(),updatedAt:new Date().toISOString()};if(next.enabled&&(!next.baseUrl||!next.apiKey||!next.model||!next.visionModel))throw new Error('Base URL, API key, modelo de imagem e modelo visual são obrigatórios para ativar Image AI.');try{new URL(next.baseUrl);}catch{throw new Error('Base URL inválida.');}await mkdir(dirname(file),{recursive:true});await writeFile(file,JSON.stringify(next,null,2),'utf8');return publicImageSettings(next);}
export async function deleteImageSettings(){try{await unlink(file);}catch{}return publicImageSettings(empty());}
