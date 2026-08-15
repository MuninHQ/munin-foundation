import type { IncomingMessage, ServerResponse } from 'node:http';
import { EngineeringAgentRuntime } from './engineering-runtime.js';
import { mobileAuthorized } from './mobile-api.js';
import { json, readJsonBody } from './http.js';
import { ContextStore } from './store.js';

const store=new ContextStore();
function explicitObjective(command:string){return command.replace(/^(?:build|construir|implementar|continue|continua|fix|corrigir|validate|validar)\s*[:\-]?\s*/i,'').trim()}
async function resolveObjective(command:string){const explicit=explicitObjective(command);if(explicit&&explicit.toLowerCase()!==command.toLowerCase())return explicit;const state=await store.load();const actions=state.actions.filter(x=>x.status==='active'||x.status==='planned').sort((a,b)=>a.priority.localeCompare(b.priority));if(actions[0])return actions[0].title;const goals=state.goals.filter(x=>x.status==='active'||x.status==='planned').sort((a,b)=>a.priority.localeCompare(b.priority));if(goals[0])return goals[0].nextAction||goals[0].title;return 'Inspect the Munin repository, identify the highest-value incomplete engineering improvement, implement it, and validate it.'}

export async function handleEngineeringApi(request:IncomingMessage,response:ServerResponse):Promise<void>{
 if(request.method==='OPTIONS')return json(request,response,204,{});
 if(!mobileAuthorized(request))return json(request,response,401,{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
 const url=new URL(request.url??'/','http://localhost');
 if(request.method==='POST'&&url.pathname==='/api/mobile/engineering'){
  try{const body=await readJsonBody(request,100_000);const command=typeof body.command==='string'?body.command:'build';const objective=typeof body.objective==='string'&&body.objective.trim()?body.objective.trim():await resolveObjective(command);const result=await new EngineeringAgentRuntime().execute(objective);return json(request,response,result.status==='failed'?422:200,result)}catch(error){return json(request,response,400,{error:error instanceof Error?error.message:String(error)})}
 }
 return json(request,response,404,{error:'Engineering route not found'});
}
