import type { CareerEmail, InboxState } from './career-inbox.js';
import type { EngineeringJob } from './engineering-jobs.js';
import type { ManusOperationalTask } from './manus-operational-bridge.js';
import type { OrchestrationTrace } from './orchestration-trace.js';
import type { MuninState } from './types.js';

export type ProactiveItem={id:string;kind:'email'|'career'|'action'|'approval';title:string;detail:string;dueAt?:string;priority:'P0'|'P1'|'P2';href:string};
export type PersonSignal={id:string;name:string;role:string;company:string;lastContactAt?:string;nextAction?:string;status:string};
export type ApprovalItem={id:string;kind:'decision'|'manus'|'email'|'browser';title:string;impact:string;status:'pending';evidence:string[];href:string};

const terminal=new Set(['rejected','closed','offer']);
const ageDays=(value:string|undefined,now:Date)=>value?Math.floor((now.getTime()-Date.parse(value))/86400000):0;
const due=(value:string|undefined,now:Date)=>Boolean(value&&Date.parse(value)<=now.getTime());

export function buildProactiveOperator(input:{state:MuninState;inbox:InboxState;manus:ManusOperationalTask[];traces:OrchestrationTrace[];engineering:EngineeringJob[];now?:Date}){
 const now=input.now??new Date();const waiting:ProactiveItem[]=[];const today:ProactiveItem[]=[];
 for(const message of input.inbox.messages.filter(x=>!x.handled&&x.needsAction)){waiting.push({id:`email-${message.id}`,kind:'email',title:message.subject,detail:message.actionReason??message.suggestedAction??message.fromName??message.fromEmail??'Resposta pendente',priority:message.attention==='career'?'P0':'P1',dueAt:message.receivedAt,href:'/career-inbox.html'})}
 for(const job of input.state.jobs.filter(x=>!terminal.has(x.status))){const stale=ageDays(job.lastContactAt??job.updatedAt,now)>=5;if(due(job.followUpAt,now)||stale)waiting.push({id:`job-${job.id}`,kind:'career',title:`Follow-up · ${job.company}`,detail:job.nextAction??`${job.role} sem atualização recente`,priority:job.status==='interview'?'P0':'P1',dueAt:job.followUpAt,href:'/career-command.html'})}
 for(const action of input.state.actions.filter(x=>x.status!=='done'&&(due(x.dueAt,now)||x.priority==='P0'))){today.push({id:`action-${action.id}`,kind:'action',title:action.title,detail:action.dueAt?'Prazo hoje ou vencido':'Prioridade P0',priority:action.priority,dueAt:action.dueAt,href:'/'})}
 today.push(...waiting.filter(x=>x.priority==='P0'));
 const people:PersonSignal[]=[];for(const job of input.state.jobs){for(const [name,role] of [[job.recruiter,'Recruiter'],[job.hiringManager,'Hiring manager']] as const)if(name)people.push({id:`${job.id}-${role}`,name,role,company:job.company,lastContactAt:job.lastContactAt,nextAction:job.nextAction,status:job.status})}
 const approvals:ApprovalItem[]=[];for(const decision of input.state.decisions.filter(x=>x.status==='required'))approvals.push({id:`decision-${decision.id}`,kind:'decision',title:decision.title,impact:decision.rationale??'Decisão explícita necessária',status:'pending',evidence:[`Criada em ${decision.createdAt}`],href:'/'});
 for(const task of input.manus.filter(x=>x.status==='waiting'))approvals.push({id:`manus-${task.id}`,kind:'manus',title:task.title,impact:task.waitingDescription??'Manus aguarda orientação',status:'pending',evidence:[`Reserva: ${task.declaredCreditBudget} créditos`],href:'/manus.html'});
 for(const message of input.inbox.messages.filter(x=>!x.handled&&x.needsAction).slice(0,10))approvals.push({id:`mail-${message.id}`,kind:'email',title:message.subject,impact:'Revisar antes de responder; envio automático permanece bloqueado.',status:'pending',evidence:[message.actionReason??message.category],href:'/career-inbox.html'});
 const browserPlans=approvals.filter(x=>x.kind==='decision').map(x=>({id:`browser-${x.id}`,objective:x.title,steps:['Abrir página autorizada','Inspecionar estado atual','Preparar alterações sem enviar','Solicitar aprovação final'],status:'approval-required' as const}));
 const traceAttempts=input.traces.reduce((n,x)=>n+x.attempts.length,0),traceSuccess=input.traces.filter(x=>x.selectedProviderId).length;const jobsDone=input.engineering.filter(x=>x.status==='completed').length,jobsFailed=input.engineering.filter(x=>x.status==='failed').length;
 const analytics={runs:input.traces.length,successfulRuns:traceSuccess,attempts:traceAttempts,engineeringJobs:input.engineering.length,engineeringCompleted:jobsDone,engineeringFailed:jobsFailed,successRate:input.traces.length?Math.round(traceSuccess/input.traces.length*100):100};
 const headline=today.length?`${today.length} prioridade(s) para hoje`:'Nenhuma urgência operacional detectada';const morning={title:'Morning Brief',headline,items:[...today.slice(0,5),...waiting.filter(x=>x.priority!=='P0').slice(0,3)]};const evening={title:'Evening Review',headline:`${jobsDone} execução(ões) concluída(s) · ${waiting.length} follow-up(s) pendente(s)`,items:waiting.slice(0,6)};
 return{generatedAt:now.toISOString(),waitingFor:waiting.slice(0,30),today:today.slice(0,20),people,approvals,browserPlans,analytics,briefs:{morning,evening},calendar:{connected:false,mode:'read-only',reason:'Calendar connector awaits explicit OAuth authorization.'}};
}
