import { createServer,type IncomingMessage,type ServerResponse } from 'node:http';
import { contextBriefForConsumer,importContextSeed,loadContextMemory,previewContextSeed,queryContextMemory,publicContextSnapshot,type ContextConsumer,type MemoryScope } from './context-memory.js';
import { json, readJsonBody as body } from './http.js';

export async function handleContextMemory(req:IncomingMessage,res:ServerResponse){if(req.method==='OPTIONS')return json(req,res,204,{});const url=new URL(req.url??'/','http://127.0.0.1');try{
 if(req.method==='GET'&&url.pathname==='/api/context-memory'){const state=await loadContextMemory();return json(req,res,200,{state,summary:{sections:Object.keys(state.sections).length,imports:state.imports.length,scopes:Object.values(state.sections).reduce((a,s)=>(a[s.scope]=(a[s.scope]??0)+1,a),{} as Record<string,number>)}});}
 if(req.method==='POST'&&url.pathname==='/api/context-memory/preview'){const input=await body(req);return json(req,res,200,await previewContextSeed(input.seed));}
 if(req.method==='POST'&&url.pathname==='/api/context-memory/import'){const input=await body(req);return json(req,res,201,await importContextSeed(input.seed,{source:typeof input.source==='string'?input.source:'manual-seed-import',replaceConflicts:input.replaceConflicts===true}));}
 if(req.method==='GET'&&url.pathname==='/api/context-memory/query'){const q=url.searchParams.get('q')??'';const scopeParam=url.searchParams.get('scopes');const scopes=(scopeParam?scopeParam.split(','):['public-professional','private-operational']).filter(x=>['public-professional','private-operational','sensitive-private'].includes(x)) as MemoryScope[];return json(req,res,200,{query:q,results:await queryContextMemory(q,scopes)});}
 if(req.method==='GET'&&url.pathname==='/api/context-memory/public')return json(req,res,200,{sections:await publicContextSnapshot()});
 const consumer=url.pathname.match(/^\/api\/context-memory\/consumer\/(linkedin|career|sitrep|assistant)$/);if(req.method==='GET'&&consumer)return json(req,res,200,await contextBriefForConsumer(consumer[1] as ContextConsumer));
 return json(req,res,404,{error:'Not found'});
}catch(error){return json(req,res,400,{error:error instanceof Error?error.message:String(error)});}}
export function createContextMemoryServer(){return createServer((req,res)=>void handleContextMemory(req,res));}
if(process.argv[1]?.endsWith('context-memory-api.js')){const port=Number(process.env.MUNIN_CONTEXT_MEMORY_PORT??4314);createContextMemoryServer().listen(port,'127.0.0.1',()=>console.log(`Munin Context Memory API running at http://127.0.0.1:${port}`));}
