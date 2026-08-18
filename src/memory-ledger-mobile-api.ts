import type { IncomingMessage, ServerResponse } from 'node:http';
import { json } from './http.js';
import { MemoryLedger, type MemoryLedgerKind, type MemoryLedgerScope } from './memory-ledger.js';
import { mobileAuthorized } from './mobile-api.js';

const kinds=new Set<MemoryLedgerKind>(['conversation','decision','action','observation','career_intake','system']);
const scopes=new Set<MemoryLedgerScope>(['local','project','global']);

export async function handleMemoryLedgerMobileApi(request:IncomingMessage,response:ServerResponse):Promise<void>{
 if(request.method==='OPTIONS')return json(request,response,204,{});
 if(!mobileAuthorized(request))return json(request,response,401,{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
 const url=new URL(request.url??'/','http://localhost');
 if(request.method!=='GET'||url.pathname!=='/api/mobile/memory-ledger')return json(request,response,404,{error:'Memory ledger mobile route not found'});
 const kindValue=url.searchParams.get('kind');const scopeValue=url.searchParams.get('scope');
 if(kindValue&&!kinds.has(kindValue as MemoryLedgerKind))return json(request,response,400,{error:'invalid kind'});
 if(scopeValue&&!scopes.has(scopeValue as MemoryLedgerScope))return json(request,response,400,{error:'invalid scope'});
 const limitValue=Number(url.searchParams.get('limit')??100);const limit=Number.isFinite(limitValue)?Math.max(1,Math.min(Math.floor(limitValue),1000)):100;
 const entries=await new MemoryLedger().list({kind:kindValue as MemoryLedgerKind||undefined,scope:scopeValue as MemoryLedgerScope||undefined,source:url.searchParams.get('source')??undefined,projectId:url.searchParams.get('projectId')??undefined,entityId:url.searchParams.get('entityId')??undefined,limit});
 return json(request,response,200,{count:entries.length,entries});
}
