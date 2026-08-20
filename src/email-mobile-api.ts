import type { IncomingMessage, ServerResponse } from 'node:http';
import { json } from './http.js';
import { mobileAuthorized } from './mobile-api.js';
import { EmailIntelligenceStore } from './email-intelligence.js';

export async function handleEmailMobileApi(request:IncomingMessage,response:ServerResponse):Promise<void>{
  if(request.method==='OPTIONS')return json(request,response,204,{});
  if(!mobileAuthorized(request))return json(request,response,401,{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
  const url=new URL(request.url??'/','http://127.0.0.1');
  if(request.method==='GET'&&url.pathname==='/api/mobile/email-intelligence'){
    const snapshot=await new EmailIntelligenceStore().read();
    return json(request,response,200,{available:Boolean(snapshot),snapshot:snapshot??null});
  }
  return json(request,response,404,{error:'Email Intelligence mobile route not found'});
}
