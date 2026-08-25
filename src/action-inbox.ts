import type { MuninState, Priority } from './types.js';
import type { InboxState } from './career-inbox.js';
import type { TrustedSourceSnapshot } from './trusted-source-radar.js';
import type { ManusOperationalTask } from './manus-operational-bridge.js';

export type ActionInboxLane='now'|'review'|'executing'|'done'|'radar';
export type ActionInboxOrigin='workspace'|'email'|'career'|'radar'|'manus';
export interface ActionInboxItem {id:string;title:string;detail?:string;whyItMatters:string;recommendation:string;impact:string;lane:ActionInboxLane;origin:ActionInboxOrigin;priority:Priority;createdAt:string;href?:string;action?:{label:string;href:string};}
export interface ActionInboxSnapshot {generatedAt:string;counts:Record<ActionInboxLane,number>;items:ActionInboxItem[];}

const rank:Record<Priority,number>={P0:0,P1:1,P2:2};
const count=(items:ActionInboxItem[],lane:ActionInboxLane)=>items.filter(item=>item.lane===lane).length;

export function buildActionInbox(state:MuninState,email:InboxState,radar?:TrustedSourceSnapshot,now=new Date(),manusTasks:ManusOperationalTask[]=[]):ActionInboxSnapshot{
  const items:ActionInboxItem[]=[];
  for(const action of state.actions){
    const lane:ActionInboxLane=action.status==='done'?'done':action.status==='active'?'executing':'now';
    items.push({id:`action:${action.id}`,title:action.title,detail:action.dueAt?`Prazo ${action.dueAt}`:undefined,whyItMatters:action.dueAt?`Existe uma entrega com prazo em ${action.dueAt}.`:'A ação permanece aberta no workspace.',recommendation:lane==='done'?'Consultar o resultado registrado.':lane==='executing'?'Acompanhar a execução e seus bloqueadores.':'Executar ou replanejar a próxima etapa.',impact:'Mantém prioridades, prazos e histórico de execução coerentes.',lane,origin:'workspace',priority:action.priority,createdAt:action.createdAt,href:'/'});
  }
  for(const message of email.messages.filter(message=>!message.handled&&(message.needsAction||message.attention==='career'))){
    const urgent=message.category==='interview_invite'||message.category==='assessment'||message.category==='offer';
    items.push({id:`email:${message.id}`,title:message.subject,detail:message.actionReason??message.suggestedAction??message.fromName??message.fromEmail,whyItMatters:message.actionReason??(urgent?'Pode haver um prazo ou avanço relevante no processo seletivo.':'A mensagem foi classificada como acionável.'),recommendation:message.suggestedAction??'Revisar a mensagem antes de responder.',impact:'Evita perder prazo, retorno ou contexto importante.',lane:urgent?'now':'review',origin:message.attention==='career'?'career':'email',priority:urgent?'P0':'P1',createdAt:message.receivedAt,href:'/career-inbox.html',action:{label:'Revisar',href:'/career-inbox.html'}});
  }
  for(const signal of (radar?.signals??[]).slice(0,20))items.push({id:`radar:${signal.id}`,title:signal.title,detail:`${signal.sourceName} · ${signal.themes.join(' · ')||'novo sinal'}`,whyItMatters:signal.summary?.slice(0,240)??`Sinal recente com relevância ${signal.relevance}/100 para ${signal.themes.join(', ')||'o radar executivo'}.`,recommendation:'Abrir a fonte e decidir se vira ação, pesquisa ou pauta editorial.',impact:'Mantém decisões e conteúdo ancorados em fonte confiável e recente.',lane:'radar',origin:'radar',priority:signal.relevance>=72?'P1':'P2',createdAt:signal.publishedAt??signal.fetchedAt,href:signal.url,action:{label:'Abrir fonte',href:signal.url}});
  for(const task of manusTasks){const lane:ActionInboxLane=task.status==='completed'?'done':task.status==='waiting'?'review':task.status==='running'||task.status==='queued'?'executing':'review';items.push({id:`manus:${task.id}`,title:task.title,detail:task.status==='waiting'?(task.waitingDescription??'Manus aguarda aprovação'):task.status==='failed'?(task.error??'Falha no Manus'):task.result?.slice(0,240)??`Manus · ${task.status}`,whyItMatters:task.status==='waiting'?(task.waitingDescription??'A execução atingiu um limite que exige decisão.'):task.status==='failed'?(task.error??'A tarefa falhou antes de produzir o resultado esperado.'):`A tarefa delegada está ${task.status}.`,recommendation:task.status==='completed'?'Revisar o resultado e registrar a próxima ação.':task.status==='failed'?'Diagnosticar a falha antes de repetir.':task.status==='waiting'?'Aprovar, ajustar ou interromper conscientemente.':'Acompanhar até o próximo estado.',impact:'Libera ou interrompe a próxima etapa operacional sem ultrapassar limites de segurança ou custo.',lane,origin:'manus',priority:task.status==='waiting'||task.status==='failed'?'P0':'P1',createdAt:task.createdAt,href:'/manus.html',action:{label:'Abrir',href:'/manus.html'}})}
  items.sort((a,b)=>rank[a.priority]-rank[b.priority]||Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return {generatedAt:now.toISOString(),counts:{now:count(items,'now'),review:count(items,'review'),executing:count(items,'executing'),done:count(items,'done'),radar:count(items,'radar')},items};
}
