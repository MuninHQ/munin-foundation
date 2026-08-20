import type { IncomingMessage, ServerResponse } from 'node:http';
import { json } from './http.js';
import { EmailIntelligenceStore } from './email-intelligence.js';
import { EmailWorkerHealthStore, emailWorkerHealthStatus } from './email-worker-health.js';

export async function handleEmailIntelligence(request:IncomingMessage,response:ServerResponse):Promise<void>{
  if(request.method==='OPTIONS')return json(request,response,204,{});
  const url=new URL(request.url??'/','http://127.0.0.1');
  if(request.method==='GET'&&url.pathname==='/api/email-intelligence'){
    const [snapshot,health]=await Promise.all([new EmailIntelligenceStore().read(),new EmailWorkerHealthStore().read()]);
    return json(request,response,200,{available:Boolean(snapshot),snapshot:snapshot??null,worker:{status:emailWorkerHealthStatus(health),health:health??null}});
  }
  return json(request,response,404,{error:'Email Intelligence route not found'});
}
