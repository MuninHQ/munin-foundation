import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { composeLinkedInPost, composerSuggestions } from './linkedin-composer.js';
import { llmProviderStatus } from './llm-provider.js';
import { imageProviderStatus } from './image-provider.js';
import { trustedSourceRadar } from './trusted-source-radar.js';
import { json, readJsonBody } from './http.js';

const body=(request:IncomingMessage)=>readJsonBody(request,1_000_000);

export async function handleLinkedInComposer(request:IncomingMessage,response:ServerResponse):Promise<void>{if(request.method==='OPTIONS')return json(request,response,204,{});const url=new URL(request.url??'/','http://127.0.0.1');try{
  if(request.method==='GET'&&url.pathname==='/api/linkedin-composer/status')return json(request,response,200,{text:await llmProviderStatus(),image:await imageProviderStatus()});
  if(request.method==='GET'&&url.pathname==='/api/linkedin-composer/sources')return json(request,response,200,await trustedSourceRadar(url.searchParams.get('refresh')==='1'));
  if(request.method==='GET'&&url.pathname==='/api/linkedin-composer/suggestions')return json(request,response,200,await composerSuggestions(url.searchParams.get('refresh')==='1'));
  if(request.method==='POST'&&url.pathname==='/api/linkedin-composer/compose'){const input=await body(request);const result=await composeLinkedInPost({suggestionId:typeof input.suggestionId==='string'?input.suggestionId:undefined,generateImage:input.generateImage===true,refreshSources:input.refreshSources===true});return json(request,response,201,result);}
  return json(request,response,404,{error:'Not found'});
}catch(error){return json(request,response,400,{error:error instanceof Error?error.message:String(error)});}}
export function createLinkedInComposerServer(){return createServer((request,response)=>void handleLinkedInComposer(request,response));}
if(process.argv[1]?.endsWith('linkedin-composer-api.js')){const port=Number(process.env.MUNIN_LINKEDIN_COMPOSER_PORT??4313);createLinkedInComposerServer().listen(port,'127.0.0.1',()=>console.log(`Munin LinkedIn Composer API running at http://127.0.0.1:${port}`));}
