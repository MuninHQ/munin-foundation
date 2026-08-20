import { ContextStore } from './store.js';
import { CareerInboxStore } from './career-inbox.js';
import { MuninService } from './service.js';
import { contextBriefForConsumer } from './context-memory.js';

export type ExecutiveBriefing={
  generatedAt:string;
  headline:string;
  priorities:{type:string;title:string;reason:string;score:number}[];
  career:{pipeline:number;interviews:number;offers:number;followUpsDue:number;pendingInbox:number;unhandledCritical:number;topOpportunities:{company:string;role:string;status:string;score:number;nextAction?:string}[]};
  execution:{activeProjects:number;blockedProjects:number;openActions:number;p0Actions:number;openResearch:number};
  signals:{kind:string;message:string}[];
  governance:{staleContext:string[];blockedSensitive:string[]};
};

const criticalCategories=new Set(['interview_invite','offer','assessment','information_request']);
export async function buildExecutiveBriefing():Promise<ExecutiveBriefing>{
  const store=new ContextStore(),service=new MuninService(store),inboxStore=new CareerInboxStore();
  const [state,queue,inbox,memory]=await Promise.all([store.load(),service.careerQueue(),inboxStore.load(),contextBriefForConsumer('sitrep')]);
  const pending=inbox.messages.filter(x=>!x.handled),critical=pending.filter(x=>criticalCategories.has(x.category)||x.needsAction===true);
  const activeProjects=state.projects.filter(x=>!['done','cancelled'].includes(x.status));
  const blockedProjects=activeProjects.filter(x=>x.blockers?.length);
  const openActions=state.actions.filter(x=>x.status!=='done');
  const openResearch=state.research.filter(x=>x.status!=='synthesized');
  const priorities:{type:string;title:string;reason:string;score:number}[]=[];
  for(const item of queue.slice(0,7)){if(item.priorityScore<=0)continue;priorities.push({type:'career',title:`${item.job.company} — ${item.job.role}`,reason:item.rationale.join(', '),score:item.priorityScore});}
  for(const action of openActions.filter(x=>x.priority==='P0').slice(0,5))priorities.push({type:'action',title:action.title,reason:'P0 action open',score:95});
  for(const msg of critical.slice(0,5))priorities.push({type:msg.attention==='general_action'?'email-action':'inbox',title:msg.subject,reason:msg.actionReason??`${msg.category} · ${Math.round(msg.confidence*100)}% confidence`,score:msg.attention==='general_action'?92:90});
  for(const project of blockedProjects.slice(0,4))priorities.push({type:'project',title:project.name,reason:`blocked: ${project.blockers.join(', ')}`,score:80});
  priorities.sort((a,b)=>b.score-a.score);
  const signals:{kind:string;message:string}[]=[];
  const generalActions=critical.filter(x=>x.attention==='general_action').length;
  if(critical.length)signals.push({kind:'inbox',message:`${critical.length} mensagens críticas ou ações pendentes aguardando revisão.`});
  if(generalActions)signals.push({kind:'email-action',message:`${generalActions} ações pendentes detectadas fora do fluxo de carreira.`});
  if(queue.filter(x=>x.followUpDue).length)signals.push({kind:'follow-up',message:`${queue.filter(x=>x.followUpDue).length} follow-ups de carreira vencidos.`});
  if(blockedProjects.length)signals.push({kind:'project-risk',message:`${blockedProjects.length} projetos ativos com bloqueadores.`});
  if(memory.governance.stale.length)signals.push({kind:'context-freshness',message:`Contexto temporal requer refresh: ${memory.governance.stale.join(', ')}.`});
  const headline=priorities.length?`Top focus: ${priorities[0].title}`:'No urgent execution signal detected.';
  return {generatedAt:new Date().toISOString(),headline,priorities:priorities.slice(0,10),career:{pipeline:state.jobs.length,interviews:state.jobs.filter(x=>x.status==='interview').length,offers:state.jobs.filter(x=>x.status==='offer').length,followUpsDue:queue.filter(x=>x.followUpDue).length,pendingInbox:pending.length,unhandledCritical:critical.length,topOpportunities:queue.filter(x=>x.priorityScore>0).slice(0,6).map(x=>({company:x.job.company,role:x.job.role,status:x.job.status,score:x.priorityScore,nextAction:x.job.nextAction}))},execution:{activeProjects:activeProjects.length,blockedProjects:blockedProjects.length,openActions:openActions.length,p0Actions:openActions.filter(x=>x.priority==='P0').length,openResearch:openResearch.length},signals,governance:{staleContext:memory.governance.stale,blockedSensitive:memory.governance.blockedSensitive}};
}

export async function buildExecutiveBriefingText(){const b=await buildExecutiveBriefing();return ['EXECUTIVE BRIEFING',b.headline,'',`Career: ${b.career.pipeline} pipeline · ${b.career.interviews} interviews · ${b.career.offers} offers · ${b.career.followUpsDue} follow-ups due · ${b.career.unhandledCritical} critical inbox`,`Execution: ${b.execution.activeProjects} active projects · ${b.execution.blockedProjects} blocked · ${b.execution.openActions} open actions · ${b.execution.p0Actions} P0 · ${b.execution.openResearch} open research`,'','Priority queue:',...b.priorities.map((x,i)=>`${i+1}. [${x.type}] ${x.title} — ${x.reason}`),'','Signals:',...(b.signals.length?b.signals.map(x=>`- ${x.message}`):['- No material signal.'])].join('\n');}
