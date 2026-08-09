import { MuninService } from './service.js';
import { ContextStore } from './store.js';
import { generateDailyBrief, resolveContext } from './intelligence.js';
import type { Priority } from './types.js';

export type AssistantResult = { kind:'message'|'sitrep'|'created'|'context'; message:string; data?:unknown; mutated?:boolean };

function clean(input:string){return input.trim().replace(/\s+/g,' ');}
function priorityFrom(text:string):Priority { const match=text.match(/\bP([012])\b/i); return (match?`P${match[1]}`:'P1') as Priority; }

export async function executeAssistantCommand(raw:string):Promise<AssistantResult>{
  const command=clean(raw); if(!command) throw new Error('Digite um comando');
  const lower=command.toLowerCase(); const service=new MuninService(); const store=new ContextStore();

  if(/\b(sitrep|status report|relatório de status)\b/i.test(command)) return {kind:'sitrep',message:await service.sitrep()};
  if(/\b(prioridades|priorizar|foco de hoje|o que devo fazer hoje|meu dia)\b/i.test(command)) {
    const state=await store.load(); const brief=generateDailyBrief(state); return {kind:'message',message:typeof brief==='string'?brief:JSON.stringify(brief,null,2),data:brief};
  }
  const action=command.match(/^(?:criar|adicione|adicionar|nova?)\s+(?:uma\s+)?a[cç][aã]o\s*[:\-]?\s*(.+)$/i);
  if(action){const title=action[1].replace(/\bP[012]\b/i,'').trim();const created=await service.addAction(title,priorityFrom(command));return {kind:'created',message:`Ação criada: ${created.title} (${created.priority})`,data:created,mutated:true};}
  const project=command.match(/^(?:criar|novo|nova|adicione|adicionar)\s+(?:um\s+)?projeto\s*[:\-]?\s*(.+)$/i);
  if(project){const name=project[1].replace(/\bP[012]\b/i,'').trim();const created=await service.addProject(name,priorityFrom(command));return {kind:'created',message:`Projeto criado: ${created.name}`,data:created,mutated:true};}
  const job=command.match(/^(?:criar|registrar|adicione|adicionar)\s+(?:uma\s+)?(?:vaga|oportunidade)\s*[:\-]?\s*(.+?)\s+(?:na|em|@)\s+(.+)$/i);
  if(job){const role=job[1].trim();const company=job[2].trim();const created=await service.addJob(company,role);return {kind:'created',message:`Oportunidade criada: ${company} — ${role}`,data:created,mutated:true};}
  const research=command.match(/^(?:criar|abrir|nova|iniciar)\s+(?:uma\s+)?pesquisa\s*[:\-]?\s*(.+)$/i);
  if(research){const created=await service.addResearch(research[1].trim());return {kind:'created',message:`Pesquisa criada: ${created.question}`,data:created,mutated:true};}
  const query=command.replace(/^(?:buscar|pesquisar|encontrar|me mostre|mostre|o que temos sobre)\s+/i,'').trim();
  const matches=resolveContext(await store.load(),query);
  if(matches.length){return {kind:'context',message:`Encontrei ${matches.length} contexto(s) para “${query}”.`,data:matches.slice(0,12)};}
  return {kind:'message',message:'Não consegui mapear esse pedido ainda. Tente “gerar SITREP”, “prioridades de hoje”, “criar ação: ...”, “criar projeto: ...”, “registrar vaga Produto na Empresa” ou “buscar Drex”.'};
}
