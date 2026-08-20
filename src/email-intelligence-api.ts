import type { IncomingMessage, ServerResponse } from 'node:http';
import { json } from './http.js';
import { EmailIntelligenceStore } from './email-intelligence.js';

export async function handleEmailIntelligence(request:IncomingMessage,response:ServerResponse):Promise<void>{
  if(request.method==='OPTIONS')return json(request,response,204,{});
  const url=new URL(request.url??'/','http://127.0.0.1');
  if(request.method==='GET'&&url.pathname==='/api/email-intelligence'){
    const snapshot=await new EmailIntelligenceStore().read();
    return json(request,response,200,{available:Boolean(snapshot),snapshot: snapshot??null});
  }
  return json(request,response,404,{error:'Email Intelligence route not found'});
}
