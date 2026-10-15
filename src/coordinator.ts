import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ActionAuditLog, classifyActionIntent, evaluateAction, type PolicyResult } from './action-constitution.js';
import { dataDir, runtimePath } from './config.js';
import { MemoryLedger } from './memory-ledger.js';
import { OllamaProvider } from './ollama-provider.js';
import { buildOperatorSitrep, type OperatorSitrep } from './operator-sitrep.js';
import { defaultProviderProfiles, ProviderRegistry, ProviderSelectionError, type ProviderDecision, type ProviderProfile } from './provider-policy.js';
import { ExecutionEngine, type ExecutionPlan } from './runtime.js';
import { ApprovalQueue, type ApprovalRecord } from './sentinel.js';
import type { Project } from './types.js';

/**
 * Munin Coordinator: the deterministic seam a Claude Code mod reads and delegates through.
 * Munin stays the authority: status comes from the canonical runtime, execution goes through the
 * existing ExecutionEngine under the Provider Registry, policy through the Action Constitution, and
 * continuity through the Memory Ledger. No model call is made to count, poll or report status.
 */

export const COORDINATOR_SOURCE='claude-code-mod:munin-coordenador';
export const MAX_CONCURRENT_DELEGATIONS=2;
const RUNNING_TTL_MS=30*60_000;
const STALE_SOURCE_MS=24*60*60_000;

export type SourceStatus={id:string;label:string;available:boolean;updatedAt?:string;stale:boolean;detail?:string};
export type DelegationTier='deterministic'|'local'|'economy'|'strong';
export type DelegationStatus='running'|'completed'|'failed'|'blocked'|'refused'|'interrupted';
export type Authorization={kind:'human';via:'composer'|'bridge'|'cli';actor?:string}|{kind:'agent'|'unknown';via:string;actor?:string};

export type DelegationRecord={
 id:string;objective:string;tier:DelegationTier;status:DelegationStatus;
 reason?:string;recommendation?:string;
 createdAt:string;finishedAt?:string;durationMs?:number;
 authorization:Authorization;source:string;
 policy?:Pick<PolicyResult,'decision'|'rule'>;
 providerDecision?:ProviderDecision;
 planId?:string;planStatus?:string;
 evidence?:Array<{task:string;status:string;providerId?:string;reviewScore?:number;simulated?:boolean}>;
 nextStep?:string;
};

export type CoordinatorStatus={
 generatedAt:string;
 severity:OperatorSitrep['severity']|'unavailable';
 sources:SourceStatus[];
 projects:Array<Pick<Project,'id'|'name'|'priority'|'status'|'updatedAt'>&{hasNextAction:boolean;blockers:number}>;
 work:{plansRunning:number;plansDone:number;plansFailed:number;plansBlocked:number;engineeringActive:number;engineeringFailed:number;engineeringNeedsUser:number};
 approvals:{pending:number;oldestPendingAt?:string};
 delegations:{running:number;limit:number;recent:Array<Pick<DelegationRecord,'id'|'objective'|'tier'|'status'|'createdAt'|'finishedAt'|'reason'>>};
 attention:string[];
 controlRoomReady:boolean;
};

export interface CoordinatorDependencies{
 root?:string;
 now?:()=>Date;
 sitrep?:()=>Promise<OperatorSitrep>;
 approvals?:()=>Promise<ApprovalRecord[]>;
 plans?:()=>Promise<ExecutionPlan[]>;
 projects?:()=>Promise<Project[]>;
 profiles?:()=>ProviderProfile[];
 engine?:(profiles:ProviderProfile[])=>Pick<ExecutionEngine,'createPlan'|'run'>;
 ledgerFile?:string;
 memory?:Pick<MemoryLedger,'append'>;
 audit?:Pick<ActionAuditLog,'append'>;
 localHealth?:()=>Promise<{ready:boolean;error?:string}>;
}

// Objectives the coordinator never delegates: consequential, personal or external effects (PT and EN).
// The Action Constitution remains authoritative; this is a stricter, coordinator-only floor.
const consequentialObjective=/\b(?:envi(?:ar|e|a)|mand(?:ar|e)|respond(?:er|a)|public(?:ar|que)|post(?:ar|e)|candidat(?:ar|e|ura)|aplicar\s+(?:para|na|à)\s+vaga|pag(?:ar|ue|amento)|compr(?:ar|e|a)|transfer(?:ir|ência)|deploy|produ[cç][aã]o|apag(?:ar|ue)|exclu(?:ir|a)|delet(?:ar|e)|send|reply|publish|post|apply|pay(?:ment)?|purchase|buy|delete|remove|push|merge|e-?mail|linkedin|whatsapp|telegram|mensagem|message)\b/i;

function iso(d:Date){return d.toISOString()}
async function readJson<T>(file:string,fallback:T):Promise<T>{try{return JSON.parse(await readFile(file,'utf8')) as T}catch{return fallback}}
async function mtime(file:string):Promise<string|undefined>{try{return (await stat(file)).mtime.toISOString()}catch{return undefined}}
const shorten=(text:string,max=120)=>text.length>max?`${text.slice(0,max-1)}…`:text;

export class CoordinatorLedger{
 constructor(private readonly file=runtimePath('coordinator','delegations.json')){}
 private lockDir(){return `${this.file}.lock`}
 async withLock<T>(fn:()=>Promise<T>):Promise<T>{
  await mkdir(path.dirname(this.file),{recursive:true});
  const deadline=Date.now()+3000;
  while(true){try{await mkdir(this.lockDir());break}catch{if(Date.now()>=deadline)throw new Error('Timed out acquiring coordinator ledger lock');await new Promise(r=>setTimeout(r,15))}}
  try{return await fn()}finally{await rm(this.lockDir(),{recursive:true,force:true})}
 }
 async list():Promise<DelegationRecord[]>{const items=await readJson<DelegationRecord[]>(this.file,[]);return Array.isArray(items)?items:[]}
 async save(items:DelegationRecord[]){await mkdir(path.dirname(this.file),{recursive:true});const tmp=`${this.file}.tmp`;await writeFile(tmp,JSON.stringify(items.slice(-200),null,2)+'\n','utf8');await rename(tmp,this.file)}
 /** Marks runs left 'running' past the TTL as interrupted so a crashed delegation cannot hold a slot forever. */
 static active(items:DelegationRecord[],now:Date){return items.filter(item=>item.status==='running'&&now.getTime()-new Date(item.createdAt).getTime()<RUNNING_TTL_MS)}
}

async function readProjects(root:string):Promise<Project[]>{const state=await readJson<{projects?:Project[]}>(path.join(root,'state.json'),{});return state.projects??[]}

export async function buildCoordinatorStatus(dependencies:CoordinatorDependencies={}):Promise<CoordinatorStatus>{
 const now=(dependencies.now??(()=>new Date()))();
 const repoRoot=dependencies.root??process.cwd();
 const runtime=dataDir();
 const ledger=new CoordinatorLedger(dependencies.ledgerFile);
 const settle=async<T>(fn:()=>Promise<T>):Promise<{ok:true;value:T}|{ok:false;error:string}>=>{try{return {ok:true,value:await fn()}}catch(error){return {ok:false,error:error instanceof Error?error.message:String(error)}}};
 const [sitrep,approvals,plans,projects,delegations]=await Promise.all([
  settle(dependencies.sitrep??(()=>buildOperatorSitrep(repoRoot))),
  settle(dependencies.approvals??(()=>new ApprovalQueue().list())),
  settle(dependencies.plans??(async()=>readJson<ExecutionPlan[]>(runtimePath('executions.json'),[]))),
  settle(dependencies.projects??(()=>readProjects(runtime))),
  settle(()=>ledger.list()),
 ]);
 const sourceTimes=await Promise.all([
  mtime(path.join(repoRoot,'ops','CURRENT_STATE.md')),
  mtime(runtimePath('executions.json')),
  mtime(path.resolve('data/runtime/approval-queue.json')),
  mtime(path.join(runtime,'state.json')),
 ]);
 const source=(id:string,label:string,result:{ok:boolean;error?:string},updatedAt:string|undefined,missingMeansEmpty=true):SourceStatus=>{
  const stale=Boolean(updatedAt&&now.getTime()-new Date(updatedAt).getTime()>STALE_SOURCE_MS);
  if(!result.ok)return {id,label,available:false,stale:false,detail:shorten(result.error??'unavailable',160)};
  if(!updatedAt&&!missingMeansEmpty)return {id,label,available:false,stale:false,detail:'source file not found'};
  return {id,label,available:true,updatedAt,stale,detail:updatedAt?undefined:'no records yet'};
 };
 const sources:SourceStatus[]=[
  source('operator-sitrep','Operator SITREP / Control Room',sitrep,sitrep.ok?sitrep.value.generatedAt:undefined),
  {...source('control-room','ops/CURRENT_STATE.md',{ok:true},sourceTimes[0],false),stale:Boolean(sourceTimes[0]&&now.getTime()-new Date(sourceTimes[0]).getTime()>7*STALE_SOURCE_MS)},
  source('execution-runtime','ExecutionEngine plans',plans,sourceTimes[1]),
  source('approval-queue','Approval queue',approvals,sourceTimes[2]),
  source('projects','Context store projects',projects,sourceTimes[3]),
 ];
 const planList=plans.ok?plans.value:[];
 const approvalList=approvals.ok?approvals.value:[];
 const pending=approvalList.filter(item=>item.status==='pending').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
 const ledgerItems=delegations.ok?delegations.value:[];
 const attention:string[]=[];
 if(sitrep.ok)for(const line of sitrep.value.attention)attention.push(line);
 else attention.push('Operator SITREP unavailable: Munin status cannot be confirmed.');
 if(pending.length)attention.push(`${pending.length} approval(s) waiting for a human decision.`);
 for(const item of sources)if(item.stale)attention.push(`Source ${item.label} is stale (last update ${item.updatedAt}).`);
 const severity:CoordinatorStatus['severity']=!sitrep.ok?'unavailable':(sitrep.value.severity==='ok'&&pending.length?'attention':sitrep.value.severity);
 return {
  generatedAt:iso(now),severity,sources,
  projects:(projects.ok?projects.value:[]).map(p=>({id:p.id,name:shorten(p.name,80),priority:p.priority,status:p.status,updatedAt:p.updatedAt,hasNextAction:Boolean(p.nextAction),blockers:p.blockers?.length??0})).slice(0,20),
  work:{
   plansRunning:planList.filter(p=>p.status==='RUNNING').length,plansDone:planList.filter(p=>p.status==='DONE').length,
   plansFailed:planList.filter(p=>p.status==='FAILED').length,plansBlocked:planList.filter(p=>p.status==='BLOCKED').length,
   engineeringActive:sitrep.ok?sitrep.value.engineering.active:0,engineeringFailed:sitrep.ok?sitrep.value.engineering.failed:0,engineeringNeedsUser:sitrep.ok?sitrep.value.engineering.needsUser:0,
  },
  approvals:{pending:pending.length,oldestPendingAt:pending[0]?.createdAt},
  delegations:{running:CoordinatorLedger.active(ledgerItems,now).length,limit:MAX_CONCURRENT_DELEGATIONS,recent:ledgerItems.slice(-8).reverse().map(({id,objective,tier,status,createdAt,finishedAt,reason})=>({id,objective:shorten(objective,80),tier,status,createdAt,finishedAt,reason}))},
  attention,controlRoomReady:sitrep.ok?sitrep.value.controlRoom.ready:false,
 };
}

/** Deterministic SITREP: a summary plus exactly three next steps, ranked from evidence. */
export function coordinatorSitrep(status:CoordinatorStatus):{summary:string[];nextSteps:string[]}{
 const unavailable=status.sources.filter(s=>!s.available).map(s=>s.label);
 const summary=[
  `Severidade: ${status.severity} · gerado ${status.generatedAt}`,
  `Control Room: ${status.controlRoomReady?'pronto':'incompleto/indisponível'}`,
  `Trabalho: ${status.work.plansRunning} plano(s) em execução · ${status.work.plansDone} concluído(s) · ${status.work.plansFailed} com falha · engenharia ativa ${status.work.engineeringActive}, falhas ${status.work.engineeringFailed}, aguardando usuário ${status.work.engineeringNeedsUser}`,
  `Aprovações pendentes: ${status.approvals.pending}${status.approvals.oldestPendingAt?` (mais antiga ${status.approvals.oldestPendingAt})`:''}`,
  `Delegações em execução: ${status.delegations.running}/${status.delegations.limit}`,
  `Projetos: ${status.projects.length}${status.projects.length?` (${status.projects.filter(p=>p.blockers>0).length} com bloqueio)`:''}`,
 ];
 if(unavailable.length)summary.push(`Fontes indisponíveis: ${unavailable.join(', ')}`);
 const candidates:Array<{rank:number;text:string}>=[];
 if(status.severity==='unavailable')candidates.push({rank:0,text:'Restaurar a fonte canônica: rodar `npm run operator:sitrep` no Munin e corrigir o erro reportado antes de confiar no painel.'});
 if(!status.controlRoomReady&&status.severity!=='unavailable')candidates.push({rank:1,text:'Recriar/atualizar ops/CURRENT_STATE.md, ops/BACKLOG.md e ops/SESSION_LOG.md (Control Room incompleto).'});
 if(status.approvals.pending)candidates.push({rank:2,text:`Revisar ${status.approvals.pending} aprovação(ões) pendente(s) na fila do Munin; o coordenador não aprova nada sozinho.`});
 if(status.work.engineeringNeedsUser)candidates.push({rank:3,text:`Atender ${status.work.engineeringNeedsUser} job(s) de engenharia aguardando usuário.`});
 const human=status.attention.find(a=>/human|humana|mailbox connection|needs a mailbox/i.test(a));
 if(human)candidates.push({rank:4,text:`Ação humana pendente: ${shorten(human,140)}`});
 if(status.work.engineeringFailed||status.work.plansFailed)candidates.push({rank:5,text:'Diagnosticar falhas registradas (engenharia/planos) e confirmar se são antigas ou novas antes de reexecutar.'});
 for(const item of status.sources.filter(s=>s.stale))candidates.push({rank:6,text:`Atualizar a fonte desatualizada: ${item.label}.`});
 for(const line of status.attention)candidates.push({rank:7,text:shorten(line,160)});
 candidates.push({rank:8,text:'Escolher a próxima tarefa delimitada e delegá-la com /munin-delegar (determinístico primeiro).'});
 candidates.push({rank:9,text:'Registrar o resultado do dia com npm run second-brain:commit.'});
 candidates.push({rank:10,text:'Revisar o BACKLOG canônico e repriorizar.'});
 const seen=new Set<string>();const nextSteps:string[]=[];
 for(const c of candidates.sort((a,b)=>a.rank-b.rank)){if(seen.has(c.text))continue;seen.add(c.text);nextSteps.push(c.text);if(nextSteps.length===3)break}
 return {summary,nextSteps};
}

export type DelegationRequest={objective:string;tier?:DelegationTier;justification?:string;authorization:Authorization};

const tierPreference:Record<DelegationTier,string[]>={deterministic:['deterministic-local'],local:['ollama-local'],economy:[],strong:[]};

/**
 * Delegates one bounded, authorized task to Munin's existing ExecutionEngine.
 * Order of gates: human authorization → coordinator floor → Action Constitution → tier/justification →
 * concurrency (max 2) → Provider Registry (offline, zero cost) → execution → ledger + memory write-back.
 */
export async function delegateTask(request:DelegationRequest,dependencies:CoordinatorDependencies={}):Promise<DelegationRecord>{
 const now=dependencies.now??(()=>new Date());
 const ledger=new CoordinatorLedger(dependencies.ledgerFile);
 const memory=dependencies.memory??new MemoryLedger();
 const audit=dependencies.audit??new ActionAuditLog(runtimePath('action-audit.jsonl'));
 const objective=request.objective.trim();
 const tier=request.tier??'deterministic';
 const base:DelegationRecord={id:`dlg-${randomUUID().slice(0,8)}`,objective:shorten(objective,500),tier,status:'refused',createdAt:iso(now()),authorization:request.authorization,source:COORDINATOR_SOURCE};
 const finish=async(record:DelegationRecord,persist=true)=>{
  if(persist)await ledger.withLock(async()=>{const items=await ledger.list();const index=items.findIndex(i=>i.id===record.id);if(index>=0)items[index]=record;else items.push(record);await ledger.save(items)});
  await memory.append({kind:'action',scope:'project',source:COORDINATOR_SOURCE,summary:`Delegation ${record.status}: ${shorten(record.objective,160)}`,entityId:record.id,payload:{tier:record.tier,status:record.status,reason:record.reason,recommendation:record.recommendation,planId:record.planId,planStatus:record.planStatus,evidence:record.evidence,nextStep:record.nextStep,authorization:record.authorization,policy:record.policy,providerId:record.providerDecision?.selectedProviderId,durationMs:record.durationMs}}).catch(()=>undefined);
  return record;
 };
 if(!objective)return finish({...base,reason:'empty objective'});
 if(request.authorization.kind!=='human')return finish({...base,reason:`not authorized: ${request.authorization.kind} via ${request.authorization.via} is not a human authorization`,nextStep:'Peça ao André para confirmar a tarefa diretamente (composer/bridge).'});
 if(consequentialObjective.test(objective))return finish({...base,reason:'consequential or external-effect objective: outside the coordinator scope',recommendation:'Use o fluxo de aprovação explícita do Munin; o coordenador só delega tarefas locais, delimitadas e inofensivas.',nextStep:'Encaminhar pelo fluxo de aprovação humana do Munin.'});
 const policy=evaluateAction({class:classifyActionIntent(objective,'local-write'),tool:'munin-coordinator',payloadPreview:objective,reason:'coordinator delegation'});
 await audit.append(policy).catch(()=>undefined);
 const policySummary={decision:policy.decision,rule:policy.rule};
 if(policy.decision!=='allow')return finish({...base,status:policy.decision==='needs_user'?'blocked':'refused',policy:policySummary,reason:`Action Constitution: ${policy.rule}`,nextStep:'Requer aprovação humana explícita pelo fluxo do Munin.'});
 if(tier==='strong'&&!(request.justification&&request.justification.trim().length>=20))return finish({...base,policy:policySummary,reason:'strong tier requires a written justification (≥ 20 characters)',recommendation:'Prefira deterministic ou local; justifique o uso de modelo forte.'});
 const profiles=(dependencies.profiles??defaultProviderProfiles)();
 if(tier==='economy'||tier==='strong'){
  const zeroCostRemote=profiles.filter(p=>p.enabled&&p.mode==='external'&&p.estimatedCostPerCall===0);
  if(!zeroCostRemote.length)return finish({...base,status:'blocked',policy:policySummary,reason:`no zero-cost ${tier} provider is registered in the Provider Registry`,recommendation:'Nenhum modelo pago é habilitado pelo coordenador. Use deterministic/local, ou faça a tarefa na sessão atual do Claude (assinatura existente).',nextStep:'Executar manualmente na sessão Claude ou reformular para o tier deterministic.'});
 }
 // Concurrency gate and claim happen under one lock so two callers cannot both take the last slot.
 const claim=await ledger.withLock(async()=>{
  const items=await ledger.list();const at=now();
  for(const item of items)if(item.status==='running'&&at.getTime()-new Date(item.createdAt).getTime()>=RUNNING_TTL_MS){item.status='interrupted';item.finishedAt=iso(at);item.reason='exceeded running TTL without settlement'}
  const active=CoordinatorLedger.active(items,at);
  if(active.length>=MAX_CONCURRENT_DELEGATIONS){await ledger.save(items);return {ok:false as const,active:active.length}}
  const record:DelegationRecord={...base,status:'running',policy:policySummary};items.push(record);await ledger.save(items);return {ok:true as const,record};
 });
 if(!claim.ok)return finish({...base,status:'blocked',policy:policySummary,reason:`concurrency limit reached (${claim.active}/${MAX_CONCURRENT_DELEGATIONS} running)`,nextStep:'Aguardar uma delegação terminar e tentar de novo.'});
 const record=claim.record;
 const started=Date.now();
 const registry=new ProviderRegistry(profiles);
 const preferred=tierPreference[tier];
 const policyForTier={offlineOnly:true,maxCostPerCall:0,preferredProviders:preferred};
 try{
  // Preflight the tier's provider so an unavailable executor is reported, never silently replaced.
  const preflight=registry.select({taskId:record.id,objective,title:'coordinator preflight',capability:'write',expectedOutput:'preflight',context:{}},policyForTier);
  if(preferred.length&&preflight.decision.selectedProviderId&&!preferred.includes(preflight.decision.selectedProviderId)){
   return finish({...record,status:'blocked',providerDecision:preflight.decision,reason:`requested tier '${tier}' provider is unavailable (${preferred.join(', ')}); Registry would fall back to ${preflight.decision.selectedProviderId}`,recommendation:tier==='local'?'Habilite o Ollama local (MUNIN_OLLAMA_ENABLED) ou use o tier deterministic.':'Use o tier deterministic.',finishedAt:iso(now()),durationMs:Date.now()-started,nextStep:'Reenviar com o tier disponível ou habilitar o executor.'});
  }
  if(tier==='local'){
   const health=await (dependencies.localHealth??(()=>new OllamaProvider({timeoutMs:5_000}).health()))().catch(error=>({ready:false,error:String(error)}));
   if(!health.ready)return finish({...record,status:'blocked',providerDecision:preflight.decision,reason:`local executor unavailable: Ollama not ready${health.error?` (${shorten(health.error,120)})`:''}`,recommendation:'Inicie o Ollama com o modelo configurado ou use o tier deterministic.',finishedAt:iso(now()),durationMs:Date.now()-started,nextStep:'Reenviar com o tier deterministic ou após o Ollama ficar pronto.'});
  }
  const tierProfiles=profiles.filter(p=>!preferred.length||preferred.includes(p.id));
  const engine=(dependencies.engine??((items:ProviderProfile[])=>new ExecutionEngine(dataDir(),items,policyForTier)))(tierProfiles);
  const plan=await engine.createPlan(objective);
  const ran=await engine.run(plan.id);
  const evidence=ran.tasks.map(task=>({task:task.title,status:task.status,providerId:task.providerId,reviewScore:task.review?.score,simulated:task.providerMetadata?.simulated===true}));
  const status:DelegationStatus=ran.status==='DONE'?'completed':ran.status==='FAILED'?'failed':'blocked';
  return finish({...record,status,planId:ran.id,planStatus:ran.status,evidence,providerDecision:ran.tasks.find(t=>t.providerDecision)?.providerDecision,finishedAt:iso(now()),durationMs:Date.now()-started,nextStep:status==='completed'?(evidence.some(e=>e.simulated)?'Resultado do executor determinístico é um esqueleto simulado (simulated=true): revisar e completar o conteúdo real na sessão.':'Revisar o resultado no plano registrado e decidir o próximo passo.'):'Ver a evidência do plano e corrigir a causa antes de reexecutar.'});
 }catch(error){
  const decision=error instanceof ProviderSelectionError?error.decision:undefined;
  return finish({...record,status:decision?'blocked':'failed',providerDecision:decision,reason:decision?`executor unavailable: ${error instanceof Error?error.message:String(error)}`:shorten(error instanceof Error?error.message:String(error),300),finishedAt:iso(now()),durationMs:Date.now()-started,nextStep:'Verificar a disponibilidade do executor no Provider Registry (`npm run provider-policy -- list`).'});
 }
}
