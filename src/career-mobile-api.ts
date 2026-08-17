import type { IncomingMessage, ServerResponse } from 'node:http';
import { mobileAuthorized } from './mobile-api.js';
import { CareerInboxStore } from './career-inbox.js';
import { buildCareerBrief, buildCareerProcesses } from './career-intelligence.js';
import { auditCareerContinuity } from './career-continuity-audit.js';
import { careerContinuityMetrics, recordCareerContinuityFeedback } from './career-continuity-validation.js';
import { ContextStore } from './store.js';
import { json, readJsonBody } from './http.js';

const terminal=new Set(['offer','rejected','closed']);
function fallbackAction(status:string){if(status==='interview')return'Preparar próxima etapa e registrar aprendizados.';if(status==='applied')return'Monitorar retorno e programar follow-up.';if(status==='investigating')return'Validar aderência e decidir candidatura.';if(status==='discovered')return'Qualificar oportunidade.';return'Revisar próximo movimento.'}

export async function mobileCareerSnapshot(){
 const [state,inbox,validation]=await Promise.all([new ContextStore().load(),new CareerInboxStore().load(),careerContinuityMetrics()]);
 const brief=buildCareerBrief(state.jobs,inbox.messages);const processes=buildCareerProcesses(state.jobs,inbox.messages).filter(p=>!terminal.has(p.job.status));
 const audit=auditCareerContinuity(state.jobs,inbox.messages);
 const attentionIds=new Set([...brief.attention,...brief.interviews,...brief.followUps,...brief.stale].map(p=>p.job.id));
 const active=processes.map(p=>({id:p.job.id,company:p.job.company,role:p.job.role,status:p.suggestedStatus??p.job.status,fitScore:p.job.fitScore,nextAction:p.suggestedAction??p.job.nextAction??fallbackAction(p.job.status),followUpAt:p.job.followUpAt,lastSignalAt:p.lastSignalAt,signalCount:p.signals.length,needsAttention:attentionIds.has(p.job.id),automation:p.automation,provenance:p.signals.slice(0,3)})).sort((a,b)=>Number(b.needsAttention)-Number(a.needsAttention)||Date.parse(b.lastSignalAt??'0')-Date.parse(a.lastSignalAt??'0'));
 const focus=active[0];return{generatedAt:brief.generatedAt,counts:brief.counts,focus,active,validation,audit};
}

export async function handleCareerMobileApi(request:IncomingMessage,response:ServerResponse):Promise<void>{
 if(request.method==='OPTIONS')return json(request,response,204,{});if(!mobileAuthorized(request))return json(request,response,401,{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
 const url=new URL(request.url??'/','http://localhost');try{
  if(request.method==='GET'&&url.pathname==='/api/mobile/career')return json(request,response,200,await mobileCareerSnapshot());
  if(request.method==='POST'&&url.pathname==='/api/mobile/career/feedback'){const body=await readJsonBody(request,20_000);const verdict=body.verdict==='correct'?'correct':body.verdict==='needs_correction'?'needs_correction':undefined;if(!verdict)return json(request,response,400,{error:'verdict must be correct or needs_correction'});const item=await recordCareerContinuityFeedback({jobId:typeof body.jobId==='string'?body.jobId:undefined,verdict,note:typeof body.note==='string'?body.note:undefined});return json(request,response,200,{item,validation:await careerContinuityMetrics()});}
  return json(request,response,404,{error:'Career mobile route not found'});
 }catch(error){return json(request,response,400,{error:error instanceof Error?error.message:String(error)})}
}