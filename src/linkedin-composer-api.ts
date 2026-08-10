import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { composeLinkedInPost, composerSuggestions } from './linkedin-composer.js';
import { llmProviderStatus } from './llm-provider.js';
import { imageProviderStatus } from './image-provider.js';
import { trustedSourceRadar } from './trusted-source-radar.js';

function json(response:ServerResponse,status:number,body:unknown){response.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'});response.end(JSON.stringify(body));}
async function body(request:IncomingMessage):Promise<Record<string,unknown>>{const chunks:Buffer[]=[];let size=0;for await(const chunk of request){const value=Buffer.from(chunk);size+=value.length;if(size>1_000_000)throw new Error('Payload too large');chunks.push(value);}if(!chunks.length)return{};const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('JSON object body required');return parsed as Record<string,unknown>;}

export async function handleLinkedInComposer(request:IncomingMessage,response:ServerResponse):Promise<void>{if(request.method==='OPTIONS')return json(response,204,{});const url=new URL(request.url??'/','http://127.0.0.1');try{
  if(request.method==='GET'&&url.pathname==='/api/linkedin-composer/status')return json(response,200,{text:await llmProviderStatus(),image:await imageProviderStatus()});
  if(request.method==='GET'&&url.pathname==='/api/linkedin-composer/sources')return json(response,200,await trustedSourceRadar(url.searchParams.get('refresh')==='1'));
  if(request.method==='GET'&&url.pathname==='/api/linkedin-composer/suggestions')return json(response,200,await composerSuggestions(url.searchParams.get('refresh')==='1'));
  if(request.method==='POST'&&url.pathname==='/api/linkedin-composer/compose'){const input=await body(request);const result=await composeLinkedInPost({suggestionId:typeof input.suggestionId==='string'?input.suggestionId:undefined,generateImage:input.generateImage===true,refreshSources:input.refreshSources===true});return json(response,201,result);}
  return json(response,404,{error:'Not found'});
}catch(error){return json(response,400,{error:error instanceof Error?error.message:String(error)});}}
export function createLinkedInComposerServer(){return createServer((request,response)=>void handleLinkedInComposer(request,response));}
if(process.argv[1]?.endsWith('linkedin-composer-api.js')){const port=Number(process.env.MUNIN_LINKEDIN_COMPOSER_PORT??4313);createLinkedInComposerServer().listen(port,'127.0.0.1',()=>console.log(`Munin LinkedIn Composer API running at http://127.0.0.1:${port}`));}
