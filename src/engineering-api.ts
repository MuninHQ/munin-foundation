import type { IncomingMessage, ServerResponse } from 'node:http';
import type { EngineeringResult } from './engineering-runtime.js';
import { EngineeringJobManager } from './engineering-jobs.js';
import { runEngineeringMission } from './engineering-mission-runner.js';
import { prepareEngineeringProvider } from './engineering-provider-preflight.js';
import { mobileAuthorized } from './mobile-api.js';
import { json, readJsonBody } from './http.js';
import { ContextStore } from './store.js';

const store=new ContextStore();
const jobs=new EngineeringJobManager();
function explicitObjective(command:string){return command.replace(/^(?:build|construir|implementar|continue|continua|fix|corrigir|validate|validar)\s*[:\-]?\s*/i,'').trim()}
async function resolveObjective(command:string){const explicit=explicitObjective(command);if(explicit&&explicit.toLowerCase()!==command.toLowerCase())return explicit;const state=await store.load();const actions=state.actions.filter(x=>x.status==='active'||x.status==='planned').sort((a,b)=>a.priority.localeCompare(b.priority));if(actions[0])return actions[0].title;const goals=state.goals.filter(x=>x.status==='active'||x.status==='planned').sort((a,b)=>a.priority.localeCompare(b.priority));if(goals[0])return goals[0].nextAction||goals[0].title;return 'Inspect the Munin repository, identify the highest-value incomplete engineering improvement, implement it, and validate it.'}
async function objectiveFromBody(body:Record<string,unknown>){const command=typeof body.command==='string'?body.command:'build';return typeof body.objective==='string'&&body.objective.trim()?body.objective.trim():resolveObjective(command)}
function unavailable(objective:string,message:string,evidence:string):EngineeringResult{return {status:'failed',objective,changedFiles:[],events:[{phase:'failed',message,at:new Date().toISOString(),evidence}],message:`Missão não iniciada: ${evidence}`}}

export async function handleEngineeringApi(request:IncomingMessage,response:ServerResponse):Promise<void>{
 if(request.method==='OPTIONS')return json(request,response,204,{});
 if(!mobileAuthorized(request))return json(request,response,401,{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
 const url=new URL(request.url??'/','http://localhost');
 try{
  if(request.method==='POST'&&url.pathname==='/api/mobile/engineering/jobs'){
   const body=await readJsonBody(request,100_000);const objective=await objectiveFromBody(body);return json(request,response,202,jobs.start(objective));
  }
  const jobMatch=url.pathname.match(/^\/api\/mobile\/engineering\/jobs\/([^/]+)$/);
  if(request.method==='GET'&&jobMatch){const job=jobs.get(jobMatch[1]);return job?json(request,response,200,job):json(request,response,404,{error:'Engineering job not found'});}
  if(request.method==='GET'&&url.pathname==='/api/mobile/engineering/jobs')return json(request,response,200,{jobs:jobs.list().slice(0,20)});
  if(request.method==='POST'&&url.pathname==='/api/mobile/engineering'){
   const body=await readJsonBody(request,100_000);const objective=await objectiveFromBody(body);const readiness=await prepareEngineeringProvider();if(!readiness.ok)return json(request,response,422,unavailable(objective,readiness.message,readiness.evidence));const result=await runEngineeringMission(objective);result.events.unshift({phase:'inspect',message:readiness.message,at:new Date().toISOString(),evidence:readiness.evidence});return json(request,response,result.status==='failed'?422:result.status==='needs_user'?409:200,result);
  }
  return json(request,response,404,{error:'Engineering route not found'});
 }catch(error){return json(request,response,400,{error:error instanceof Error?error.message:String(error)})}
}
