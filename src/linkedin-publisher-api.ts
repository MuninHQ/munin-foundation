import type { IncomingMessage, ServerResponse } from 'node:http';
import { approveForPublication, markManuallyPublished, publicationPackage, publisherBrandPreflight, publisherPolicy, publisherQueue, revokePublicationApproval } from './linkedin-publisher.js';
import { json, readJsonBody, requireText } from './http.js';

export async function handleLinkedInPublisher(request:IncomingMessage,response:ServerResponse):Promise<void>{
 if(request.method==='OPTIONS')return json(request,response,204,{});
 const url=new URL(request.url??'/','http://127.0.0.1');
 try{
  if(request.method==='GET'&&url.pathname==='/api/linkedin-publisher')return json(request,response,200,{policy:publisherPolicy(),items:await publisherQueue()});
  const preflight=url.pathname.match(/^\/api\/linkedin-publisher\/([^/]+)\/preflight$/);if(request.method==='GET'&&preflight)return json(request,response,200,await publisherBrandPreflight(preflight[1]));
  const approve=url.pathname.match(/^\/api\/linkedin-publisher\/([^/]+)\/approve$/);if(request.method==='POST'&&approve){const input=await readJsonBody(request,100_000);return json(request,response,200,await approveForPublication(approve[1],typeof input.note==='string'?input.note:undefined));}
  const revoke=url.pathname.match(/^\/api\/linkedin-publisher\/([^/]+)\/revoke$/);if(request.method==='POST'&&revoke){const input=await readJsonBody(request,100_000);return json(request,response,200,await revokePublicationApproval(revoke[1],typeof input.note==='string'?input.note:undefined));}
  const pack=url.pathname.match(/^\/api\/linkedin-publisher\/([^/]+)\/package$/);if(request.method==='GET'&&pack)return json(request,response,200,await publicationPackage(pack[1]));
  const published=url.pathname.match(/^\/api\/linkedin-publisher\/([^/]+)\/published$/);if(request.method==='POST'&&published){const input=await readJsonBody(request,100_000);return json(request,response,200,await markManuallyPublished(published[1],{url:requireText(input.url,'url'),confirmation:requireText(input.confirmation,'confirmation'),note:typeof input.note==='string'?input.note:undefined}));}
  return json(request,response,404,{error:'Not found'});
 }catch(error){return json(request,response,400,{error:error instanceof Error?error.message:String(error)});}
}
