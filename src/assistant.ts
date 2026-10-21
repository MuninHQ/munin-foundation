import { MuninService } from './service.js';
import { ContextStore } from './store.js';
import { generateDailyBrief, resolveContext, type ContextMatch } from './intelligence.js';
import type { JobStatus, Priority } from './types.js';
import { clearAssistantMemory, loadAssistantMemory, rememberTurn, type AssistantEntity } from './assistant-memory.js';
import { normalizeWithLlm } from './llm-provider.js';
import { answerFromContinuity } from './continuity-context.js';
import { askClaudeCode } from './claude-code-local.js';
import { redactSecretText, sensitiveTextClasses } from './secret-redaction.js';

let askClaude:(question:string,snapshot:unknown)=>Promise<string|undefined>=askClaudeCode;
/** Test seam: replace the Claude Code call so suites never spawn the real CLI. */
export function setClaudeAsker(asker:typeof askClaude){askClaude=asker;}
let normalize:typeof normalizeWithLlm=normalizeWithLlm;
/** Test seam for the optional configured LLM provider. */
export function setLlmNormalizer(normalizer:typeof normalizeWithLlm){normalize=normalizer;}
// Read-only local commands: safe to run early and hand to Claude as context. Anything else may mutate and runs as before.
const READ_COMMAND=/^(sitrep|status report|relat[oó]rio de status|prioridades|priorizar|foco de hoje|o que devo fazer hoje|meu dia|buscar|pesquisar|encontrar|me mostre|mostre|o que temos sobre|o que sabe sobre|detalhes|mais detalhes|lembrar|lembre de)\b/i;

/** plan: read and propose only, nothing is written. execute: run local commands as before. */
export type AssistantMode = 'plan'|'execute';
/** A change the assistant would make; the operator runs it explicitly in execute mode. */
export type AssistantProposal = { command:string; summary:string; reversible:boolean; undo:string };
export type AssistantResult = { kind:'message'|'sitrep'|'created'|'context'|'proposal'|'blocked'; message:string; data?:unknown; mutated?:boolean; entity?:AssistantEntity; interpretedBy?:'local'|'llm'|'claude'; proposal?:AssistantProposal; undo?:string };

function clean(input:string){return input.trim().replace(/\s+/g,' ');}
function priorityFrom(text:string):Priority { const match=text.match(/\bP([012])\b/i); return (match?`P${match[1]}`:'P1') as Priority; }
function entityFromMatch(match:ContextMatch):AssistantEntity{return {type:match.entityType as AssistantEntity['type'],id:match.entityId,label:match.label}}
function entitySummary(state:Awaited<ReturnType<ContextStore['load']>>,entity:AssistantEntity){
  if(entity.type==='job'){const x=state.jobs.find(v=>v.id===entity.id);return x?`${x.company} — ${x.role}\nEstágio: ${x.status}\nFit: ${x.fitScore}%\nPróxima ação: ${x.nextAction??'não definida'}\nÚltimo contato: ${x.lastContactAt??'não registrado'}\nFollow-up: ${x.followUpAt??'não agendado'}`:`Não encontrei ${entity.label}.`}
  if(entity.type==='project'){const x=state.projects.find(v=>v.id===entity.id);return x?`${x.name}\nStatus: ${x.status}\nPrioridade: ${x.priority}\nPróxima ação: ${x.nextAction??'não definida'}\nResultado atual: ${x.currentOutcome??'não registrado'}`:`Não encontrei ${entity.label}.`}
  if(entity.type==='research'){const x=state.research.find(v=>v.id===entity.id);return x?`${x.question}\nStatus: ${x.status}\nEvidências: ${x.evidence.length}\nSínteses: ${x.syntheses.length}`:`Não encontrei ${entity.label}.`}
  const x=state.actions.find(v=>v.id===entity.id);return x?`${x.title}\nStatus: ${x.status}\nPrioridade: ${x.priority}\nResultado: ${x.outcome??'não registrado'}`:`Não encontrei ${entity.label}.`;
}
const UNDO={
  action:'Pode ser concluída, editada ou removida no Action Inbox / Today.',
  project:'Pode ser editado ou arquivado em Portfolio.',
  job:'Pode ser editada ou fechada em Career.',
  research:'Pode ser editada ou fechada em Intelligence.',
};
async function finish(result:AssistantResult){if(result.mutated&&!result.undo&&result.entity&&result.entity.type in UNDO)result={...result,undo:UNDO[result.entity.type as keyof typeof UNDO]};await rememberTurn('assistant',result.message,result.entity);return result}

export async function executeAssistantCommand(raw:string,allowLlm=true,rememberUser=true,mode:AssistantMode='execute'):Promise<AssistantResult>{
  const command=clean(raw); if(!command) throw new Error('Digite um comando');
  // Credentials never travel through the chat: not stored, not sent to Claude or any provider.
  const sensitive=sensitiveTextClasses(command);
  if(sensitive.length){if(rememberUser)await rememberTurn('user',redactSecretText(command).replace(/\S{24,}/g,'[REDACTED]'));return finish({kind:'blocked',message:`Isso parece conter uma credencial (${sensitive.join(', ')}). Por segurança o chat não guarda nem repassa credenciais — nada foi enviado ao Claude. Configure chaves e senhas em Settings (/settings.html) ou siga docs/OAUTH_SETUP.md.`,interpretedBy:'local'});}
  if(rememberUser)await rememberTurn('user',command);
  const propose=(summary:string,undo:string,entity?:AssistantEntity)=>finish({kind:'proposal',message:`Modo Planejar — nada foi alterado.\nProposta: ${summary}\nReversível: sim. ${undo}\nPara aplicar, use Executar.`,proposal:{command,summary,reversible:true,undo},entity,interpretedBy:'local'});
  const service=new MuninService(); const store=new ContextStore(); const memory=await loadAssistantMemory(); const state=await store.load();

  if(/^(limpar|apagar|resetar)\s+(?:a\s+)?(?:conversa|mem[oó]ria)$/i.test(command)){await clearAssistantMemory();return {kind:'message',message:'Memória da conversa limpa.',interpretedBy:'local'};}
  // Write commands keep their verb: words like "prioridades" inside a title must not trigger read shortcuts.
  const writeCommand=/^(?:criar|adicione|adicionar|nova?|novo|registrar|agendar|marcar|mudar|atualizar|abrir|iniciar)\b/i.test(command);
  if(!writeCommand&&/\b(sitrep|status report|relatório de status)\b/i.test(command)) return finish({kind:'sitrep',message:await service.sitrep(),interpretedBy:'local'});
  if(!writeCommand&&/\b(prioridades|priorizar|foco de hoje|o que devo fazer hoje|meu dia)\b/i.test(command)) {const brief=generateDailyBrief(state);return finish({kind:'message',message:[brief.headline,...brief.priorities.map((x,i)=>`${i+1}. ${x}`),...brief.alerts.map(x=>`Atenção: ${x}`)].join('\n'),data:brief,interpretedBy:'local'});}

  const explicitQuery=command.match(/^(?:buscar|pesquisar|encontrar|me mostre|mostre|o que temos sobre|o que sabe sobre|detalhes de|lembrar|lembre de)\s+(.+)$/i);
  if(explicitQuery){const matches=resolveContext(state,explicitQuery[1]);if(matches.length){const entity=entityFromMatch(matches[0]);return finish({kind:'context',message:`Contexto principal: ${entity.label}\n${entitySummary(state,entity)}`,data:matches.slice(0,12),entity,interpretedBy:'local'});}const continuity=await answerFromContinuity(explicitQuery[1]);if(continuity)return finish({kind:'context',message:continuity,interpretedBy:'local'});return finish({kind:'message',message:`Não encontrei contexto para “${explicitQuery[1]}”.`,interpretedBy:'local'});}
  if(/^(?:mais detalhes|detalhes|continue|continua|e agora\??)$/i.test(command)&&memory.lastEntity){return finish({kind:'context',message:entitySummary(state,memory.lastEntity),entity:memory.lastEntity,interpretedBy:'local'});}

  const action=command.match(/^(?:criar|adicione|adicionar|nova?)\s+(?:uma\s+)?a[cç][aã]o\s*[:\-]?\s*(.+)$/i);
  if(action){let title=action[1].replace(/\bP[012]\b/i,'').trim();if(/\b(isso|essa|ela|ele|dela|dele)\b/i.test(title)&&memory.lastEntity)title=title.replace(/\b(isso|essa|ela|ele|dela|dele)\b/ig,memory.lastEntity.label);if(mode==='plan')return propose(`criar ação “${title}” (${priorityFrom(command)})`,UNDO.action);const created=await service.addAction(title,priorityFrom(command));const entity:AssistantEntity={type:'action',id:created.id,label:created.title};return finish({kind:'created',message:`Ação criada: ${created.title} (${created.priority})`,data:created,mutated:true,entity,interpretedBy:'local'});}
  const followup=command.match(/^(?:criar|agendar|adicionar)?\s*follow[- ]?up(?:\s+(?:para|da|do|dela|dele))?\s*(.*)$/i);
  if(followup&&memory.lastEntity?.type==='job'){if(mode==='plan')return propose(`criar ação “Follow-up ${memory.lastEntity.label}” (${priorityFrom(command)})`,UNDO.action,memory.lastEntity);const created=await service.addAction(`Follow-up ${memory.lastEntity.label}`,priorityFrom(command));const entity:AssistantEntity={type:'job',id:memory.lastEntity.id,label:memory.lastEntity.label};return finish({kind:'created',message:`Follow-up criado para ${memory.lastEntity.label}.`,data:created,mutated:true,entity,interpretedBy:'local'});}
  const stage=command.match(/^(?:marcar|mudar|atualizar)(?:\s+(?:ela|ele|isso))?\s+(?:como|para)\s+(aplicada|applied|entrevista|interview|oferta|offer|rejeitada|rejected|fechada|closed)$/i);
  if(stage&&memory.lastEntity?.type==='job'){if(mode==='plan'){const current=state.jobs.find(x=>x.id===memory.lastEntity?.id)?.status??'desconhecido';return propose(`mudar o estágio de ${memory.lastEntity.label} de “${current}” para “${stage[1]}”`,`O estágio atual é “${current}”; para voltar, peça “marcar como ${current}”.`,memory.lastEntity);}const map:Record<string,JobStatus>={aplicada:'applied',applied:'applied',entrevista:'interview',interview:'interview',oferta:'offer',offer:'offer',rejeitada:'rejected',rejected:'rejected',fechada:'closed',closed:'closed'};const updated=await service.updateJob(memory.lastEntity.id,map[stage[1].toLowerCase()]);return finish({kind:'created',message:`${memory.lastEntity.label} atualizada para ${updated.status}.`,data:updated,mutated:true,entity:memory.lastEntity,interpretedBy:'local'});}
  const project=command.match(/^(?:criar|novo|nova|adicione|adicionar)\s+(?:um\s+)?projeto\s*[:\-]?\s*(.+)$/i);
  if(project){const name=project[1].replace(/\bP[012]\b/i,'').trim();if(mode==='plan')return propose(`criar projeto “${name}” (${priorityFrom(command)})`,UNDO.project);const created=await service.addProject(name,priorityFrom(command));const entity:AssistantEntity={type:'project',id:created.id,label:created.name};return finish({kind:'created',message:`Projeto criado: ${created.name}`,data:created,mutated:true,entity,interpretedBy:'local'});}
  const job=command.match(/^(?:criar|registrar|adicione|adicionar)\s+(?:uma\s+)?(?:vaga|oportunidade)\s*[:\-]?\s*(.+?)\s+(?:na|em|@)\s+(.+)$/i);
  if(job){const role=job[1].trim();const company=job[2].trim();if(mode==='plan')return propose(`registrar oportunidade ${company} — ${role}`,UNDO.job);const created=await service.addJob(company,role);const entity:AssistantEntity={type:'job',id:created.id,label:`${company} — ${role}`};return finish({kind:'created',message:`Oportunidade criada: ${company} — ${role}`,data:created,mutated:true,entity,interpretedBy:'local'});}
  const research=command.match(/^(?:criar|abrir|nova|iniciar)\s+(?:uma\s+)?pesquisa\s*[:\-]?\s*(.+)$/i);
  if(research){if(mode==='plan')return propose(`criar pesquisa “${research[1].trim()}”`,UNDO.research);const created=await service.addResearch(research[1].trim());const entity:AssistantEntity={type:'research',id:created.id,label:created.question};return finish({kind:'created',message:`Pesquisa criada: ${created.question}`,data:created,mutated:true,entity,interpretedBy:'local'});}

  const matches=resolveContext(state,command);
  // Questions and longer requests are Claude's: fuzzy local matches travel as context instead of hijacking the answer.
  const freeForm=allowLlm&&(/\?\s*$/.test(command)||command.split(' ').length>=6);
  const localMatch=()=>{const entity=entityFromMatch(matches[0]);return finish({kind:'context',message:`Acho que você está falando de ${entity.label}.\n${entitySummary(state,entity)}`,data:matches.slice(0,12),entity,interpretedBy:'local'});};
  if(matches.length&&!freeForm)return localMatch();
  const continuity=await answerFromContinuity(command);if(continuity&&!freeForm)return finish({kind:'context',message:continuity,interpretedBy:'local'});
  if(!freeForm&&memory.lastEntity&&/\b(ela|ele|isso|essa|esse|dela|dele)\b/i.test(command))return finish({kind:'context',message:`Entendi a referência como ${memory.lastEntity.label}. Diga a ação desejada — por exemplo “criar follow-up”, “mais detalhes” ou “marcar como entrevista”.`,entity:memory.lastEntity,interpretedBy:'local'});

  let llmRead:AssistantResult|undefined;
  if(allowLlm){
    try{const normalized=await normalize(command);if(normalized?.command&&normalized.command.toLowerCase()!==command.toLowerCase()){const result=await executeAssistantCommand(normalized.command,false,false,mode);if(!freeForm||!READ_COMMAND.test(normalized.command.trim()))return {...result,interpretedBy:'llm'};llmRead={...result,interpretedBy:'llm'};}else if(normalized?.reply&&!freeForm)return finish({kind:'message',message:normalized.reply,interpretedBy:'llm'});}catch(error){if(!freeForm)return finish({kind:'message',message:`Não consegui interpretar esse pedido pelo provider configurado (${error instanceof Error?error.message:String(error)}). O modo local continua disponível.`,interpretedBy:'local'});}
  }
  if(allowLlm){
    // Claude-first: free-form questions go to the owner's local Claude Code with a bounded snapshot; it answers, never mutates.
    const brief=generateDailyBrief(state);
    const snapshot={brief:{headline:brief.headline,priorities:brief.priorities,alerts:brief.alerts},counts:{projects:state.projects.length,actions:state.actions.length,jobs:state.jobs.length,research:state.research.length},
      projects:state.projects.slice(0,8).map(x=>({name:x.name,status:x.status,priority:x.priority,nextAction:x.nextAction})),
      actions:state.actions.filter(x=>x.status!=='done').slice(0,8).map(x=>({title:x.title,status:x.status,priority:x.priority})),
      jobs:state.jobs.slice(0,8).map(x=>({company:x.company,role:x.role,status:x.status,fitScore:x.fitScore,nextAction:x.nextAction})),
      research:state.research.slice(0,5).map(x=>({question:x.question,status:x.status})),lastTopic:memory.lastEntity?.label,
      related:matches.slice(0,5).map(m=>m.label),continuityMemory:continuity?.slice(0,1500),llmHint:llmRead?.message.slice(0,2000)};
    const answer=await askClaude(command,snapshot);
    if(answer)return finish({kind:'message',message:answer,interpretedBy:'claude'});
    if(llmRead)return llmRead;
    if(matches.length)return localMatch();
    if(continuity)return finish({kind:'context',message:continuity,interpretedBy:'local'});
  }
  return finish({kind:'message',message:'Ainda não consegui interpretar esse pedido. O modo local entende carreira, projetos, pesquisas, SITREP e memória de continuidade. Se um provider LLM estiver configurado, pedidos livres também serão normalizados com segurança.',interpretedBy:'local'});
}
