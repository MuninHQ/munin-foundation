import { MuninService } from './service.js';
import { ContextStore } from './store.js';
import { generateDailyBrief, resolveContext, type ContextMatch } from './intelligence.js';
import type { JobStatus, Priority } from './types.js';
import { clearAssistantMemory, loadAssistantMemory, rememberTurn, type AssistantEntity } from './assistant-memory.js';
import { normalizeWithLlm } from './llm-provider.js';

export type AssistantResult = { kind:'message'|'sitrep'|'created'|'context'; message:string; data?:unknown; mutated?:boolean; entity?:AssistantEntity; interpretedBy?:'local'|'llm' };

function clean(input:string){return input.trim().replace(/\s+/g,' ');}
function priorityFrom(text:string):Priority { const match=text.match(/\bP([012])\b/i); return (match?`P${match[1]}`:'P1') as Priority; }
function entityFromMatch(match:ContextMatch):AssistantEntity{return {type:match.entityType as AssistantEntity['type'],id:match.entityId,label:match.label}}
function entitySummary(state:Awaited<ReturnType<ContextStore['load']>>,entity:AssistantEntity){
  if(entity.type==='job'){const x=state.jobs.find(v=>v.id===entity.id);return x?`${x.company} — ${x.role}\nEstágio: ${x.status}\nFit: ${x.fitScore}%\nPróxima ação: ${x.nextAction??'não definida'}\nÚltimo contato: ${x.lastContactAt??'não registrado'}\nFollow-up: ${x.followUpAt??'não agendado'}`:`Não encontrei ${entity.label}.`}
  if(entity.type==='project'){const x=state.projects.find(v=>v.id===entity.id);return x?`${x.name}\nStatus: ${x.status}\nPrioridade: ${x.priority}\nPróxima ação: ${x.nextAction??'não definida'}\nResultado atual: ${x.currentOutcome??'não registrado'}`:`Não encontrei ${entity.label}.`}
  if(entity.type==='research'){const x=state.research.find(v=>v.id===entity.id);return x?`${x.question}\nStatus: ${x.status}\nEvidências: ${x.evidence.length}\nSínteses: ${x.syntheses.length}`:`Não encontrei ${entity.label}.`}
  const x=state.actions.find(v=>v.id===entity.id);return x?`${x.title}\nStatus: ${x.status}\nPrioridade: ${x.priority}\nResultado: ${x.outcome??'não registrado'}`:`Não encontrei ${entity.label}.`;
}
async function finish(result:AssistantResult){await rememberTurn('assistant',result.message,result.entity);return result}

export async function executeAssistantCommand(raw:string,allowLlm=true,rememberUser=true):Promise<AssistantResult>{
  const command=clean(raw); if(!command) throw new Error('Digite um comando');
  if(rememberUser)await rememberTurn('user',command);
  const service=new MuninService(); const store=new ContextStore(); const memory=await loadAssistantMemory(); const state=await store.load();

  if(/^(limpar|apagar|resetar)\s+(?:a\s+)?(?:conversa|mem[oó]ria)$/i.test(command)){await clearAssistantMemory();return {kind:'message',message:'Memória da conversa limpa.',interpretedBy:'local'};}
  if(/\b(sitrep|status report|relatório de status)\b/i.test(command)) return finish({kind:'sitrep',message:await service.sitrep(),interpretedBy:'local'});
  if(/\b(prioridades|priorizar|foco de hoje|o que devo fazer hoje|meu dia)\b/i.test(command)) {const brief=generateDailyBrief(state);return finish({kind:'message',message:[brief.headline,...brief.priorities.map((x,i)=>`${i+1}. ${x}`),...brief.alerts.map(x=>`Atenção: ${x}`)].join('\n'),data:brief,interpretedBy:'local'});}

  const explicitQuery=command.match(/^(?:buscar|pesquisar|encontrar|me mostre|mostre|o que temos sobre|o que sabe sobre|detalhes de)\s+(.+)$/i);
  if(explicitQuery){const matches=resolveContext(state,explicitQuery[1]);if(matches.length){const entity=entityFromMatch(matches[0]);return finish({kind:'context',message:`Contexto principal: ${entity.label}\n${entitySummary(state,entity)}`,data:matches.slice(0,12),entity,interpretedBy:'local'});}return finish({kind:'message',message:`Não encontrei contexto para “${explicitQuery[1]}”.`,interpretedBy:'local'});}
  if(/^(?:mais detalhes|detalhes|continue|continua|e agora\??)$/i.test(command)&&memory.lastEntity){return finish({kind:'context',message:entitySummary(state,memory.lastEntity),entity:memory.lastEntity,interpretedBy:'local'});}

  const action=command.match(/^(?:criar|adicione|adicionar|nova?)\s+(?:uma\s+)?a[cç][aã]o\s*[:\-]?\s*(.+)$/i);
  if(action){let title=action[1].replace(/\bP[012]\b/i,'').trim();if(/\b(isso|essa|ela|ele|dela|dele)\b/i.test(title)&&memory.lastEntity)title=title.replace(/\b(isso|essa|ela|ele|dela|dele)\b/ig,memory.lastEntity.label);const created=await service.addAction(title,priorityFrom(command));const entity:AssistantEntity={type:'action',id:created.id,label:created.title};return finish({kind:'created',message:`Ação criada: ${created.title} (${created.priority})`,data:created,mutated:true,entity,interpretedBy:'local'});}
  const followup=command.match(/^(?:criar|agendar|adicionar)?\s*follow[- ]?up(?:\s+(?:para|da|do|dela|dele))?\s*(.*)$/i);
  if(followup&&memory.lastEntity?.type==='job'){const created=await service.addAction(`Follow-up ${memory.lastEntity.label}`,priorityFrom(command));const entity:AssistantEntity={type:'job',id:memory.lastEntity.id,label:memory.lastEntity.label};return finish({kind:'created',message:`Follow-up criado para ${memory.lastEntity.label}.`,data:created,mutated:true,entity,interpretedBy:'local'});}
  const stage=command.match(/^(?:marcar|mudar|atualizar)(?:\s+(?:ela|ele|isso))?\s+(?:como|para)\s+(aplicada|applied|entrevista|interview|oferta|offer|rejeitada|rejected|fechada|closed)$/i);
  if(stage&&memory.lastEntity?.type==='job'){const map:Record<string,JobStatus>={aplicada:'applied',applied:'applied',entrevista:'interview',interview:'interview',oferta:'offer',offer:'offer',rejeitada:'rejected',rejected:'rejected',fechada:'closed',closed:'closed'};const updated=await service.updateJob(memory.lastEntity.id,map[stage[1].toLowerCase()]);return finish({kind:'created',message:`${memory.lastEntity.label} atualizada para ${updated.status}.`,data:updated,mutated:true,entity:memory.lastEntity,interpretedBy:'local'});}
  const project=command.match(/^(?:criar|novo|nova|adicione|adicionar)\s+(?:um\s+)?projeto\s*[:\-]?\s*(.+)$/i);
  if(project){const name=project[1].replace(/\bP[012]\b/i,'').trim();const created=await service.addProject(name,priorityFrom(command));const entity:AssistantEntity={type:'project',id:created.id,label:created.name};return finish({kind:'created',message:`Projeto criado: ${created.name}`,data:created,mutated:true,entity,interpretedBy:'local'});}
  const job=command.match(/^(?:criar|registrar|adicione|adicionar)\s+(?:uma\s+)?(?:vaga|oportunidade)\s*[:\-]?\s*(.+?)\s+(?:na|em|@)\s+(.+)$/i);
  if(job){const role=job[1].trim();const company=job[2].trim();const created=await service.addJob(company,role);const entity:AssistantEntity={type:'job',id:created.id,label:`${company} — ${role}`};return finish({kind:'created',message:`Oportunidade criada: ${company} — ${role}`,data:created,mutated:true,entity,interpretedBy:'local'});}
  const research=command.match(/^(?:criar|abrir|nova|iniciar)\s+(?:uma\s+)?pesquisa\s*[:\-]?\s*(.+)$/i);
  if(research){const created=await service.addResearch(research[1].trim());const entity:AssistantEntity={type:'research',id:created.id,label:created.question};return finish({kind:'created',message:`Pesquisa criada: ${created.question}`,data:created,mutated:true,entity,interpretedBy:'local'});}

  const matches=resolveContext(state,command);
  if(matches.length){const entity=entityFromMatch(matches[0]);return finish({kind:'context',message:`Acho que você está falando de ${entity.label}.\n${entitySummary(state,entity)}`,data:matches.slice(0,12),entity,interpretedBy:'local'});}
  if(memory.lastEntity&&/\b(ela|ele|isso|essa|esse|dela|dele)\b/i.test(command))return finish({kind:'context',message:`Entendi a referência como ${memory.lastEntity.label}. Diga a ação desejada — por exemplo “criar follow-up”, “mais detalhes” ou “marcar como entrevista”.`,entity:memory.lastEntity,interpretedBy:'local'});

  if(allowLlm){
    try{const normalized=await normalizeWithLlm(command);if(normalized?.command&&normalized.command.toLowerCase()!==command.toLowerCase()){const result=await executeAssistantCommand(normalized.command,false,false);return {...result,interpretedBy:'llm'};}if(normalized?.reply)return finish({kind:'message',message:normalized.reply,interpretedBy:'llm'});}catch(error){return finish({kind:'message',message:`Não consegui interpretar esse pedido pelo provider configurado (${error instanceof Error?error.message:String(error)}). O modo local continua disponível.`,interpretedBy:'local'});}
  }
  return finish({kind:'message',message:'Ainda não consegui interpretar esse pedido. O modo local entende comandos de carreira, projetos, pesquisas, SITREP e contexto. Se um provider LLM estiver configurado, pedidos livres também serão normalizados com segurança.',interpretedBy:'local'});
}
