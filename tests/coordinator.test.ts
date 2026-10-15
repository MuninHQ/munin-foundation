import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildCoordinatorStatus, coordinatorSitrep, delegateTask, MAX_CONCURRENT_DELEGATIONS, type CoordinatorDependencies, type DelegationRecord } from '../src/coordinator.js';
import type { OperatorSitrep } from '../src/operator-sitrep.js';
import { DeterministicProvider } from '../src/providers.js';
import type { ProviderProfile } from '../src/provider-policy.js';
import type { ApprovalRecord } from '../src/sentinel.js';

const human={kind:'human' as const,via:'composer' as const,actor:'test'};

function sitrep(overrides:Partial<OperatorSitrep>={}):OperatorSitrep{
 return {generatedAt:'2026-10-15T12:00:00.000Z',severity:'ok',controlRoom:{ready:true,missing:[],currentStateBytes:10,backlogBytes:10,sessionLogBytes:10},
  engineering:{total:0,byStatus:{queued:0,running:0,completed:0,needs_user:0,failed:0},active:0,needsUser:0,failed:0},
  chiefDeveloper:{openBlockers:0,deviceBlockers:0,humanBlockers:0,recoverableBlockers:0,blockers:[]},
  email:{available:true,actionable:2,careerActionable:1,generalActionable:1,reviewRequired:0,interestingReads:0,workerStatus:'healthy',consecutiveFailures:0,
   topActions:[{subject:'PRIVATE SUBJECT LINE',from:'someone@example.com'} as never],topReads:[]},
  browser:{available:true,backend:'playwright-cli',readOnly:true},memory:{ledgerEntries:1},connectors:[],attention:[],...overrides};
}

const pendingApproval:ApprovalRecord={id:'appr-1',createdAt:'2026-10-14T10:00:00.000Z',updatedAt:'2026-10-14T10:00:00.000Z',status:'pending',decision:{disposition:'needs_approval'} as never};

async function harness(extra:Partial<CoordinatorDependencies>={}){
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-coordinator-'));
 process.env.MUNIN_DATA_DIR=dir;
 const memory:Array<Record<string,unknown>>=[];const audit:unknown[]=[];
 const deps:CoordinatorDependencies={
  ledgerFile:path.join(dir,'coordinator','delegations.json'),
  memory:{append:async input=>{memory.push(input as never);return {entry:input as never,added:true}}},
  audit:{append:async record=>{audit.push(record);return record as never}},
  sitrep:async()=>sitrep(),approvals:async()=>[structuredClone(pendingApproval)],plans:async()=>[],projects:async()=>[],
  profiles:()=>[{id:'deterministic-local',provider:new DeterministicProvider(),capabilities:['*'],mode:'offline',estimatedCostPerCall:0,estimatedLatencyMs:1,enabled:true}] as ProviderProfile[],
  ...extra,
 };
 return {dir,deps,memory,audit};
}

test('status reports sources, approvals and counts without exposing private message content',async()=>{
 const {deps}=await harness();
 const status=await buildCoordinatorStatus(deps);
 assert.equal(status.approvals.pending,1);
 assert.equal(status.severity,'attention');
 assert.ok(status.sources.every(source=>typeof source.available==='boolean'));
 assert.doesNotMatch(JSON.stringify(status),/PRIVATE SUBJECT LINE|someone@example\.com/);
});

test('SITREP always yields a summary and exactly three ranked next steps',async()=>{
 const {deps}=await harness();
 const report=coordinatorSitrep(await buildCoordinatorStatus(deps));
 assert.ok(report.summary.some(line=>line.includes('Aprovações pendentes: 1')));
 assert.equal(report.nextSteps.length,3);
 assert.match(report.nextSteps[0],/aprovação/);
});

test('an unavailable canonical source is reported as unavailable, never as healthy',async()=>{
 const {deps}=await harness({sitrep:async()=>{throw new Error('runtime offline')}});
 const status=await buildCoordinatorStatus(deps);
 assert.equal(status.severity,'unavailable');
 const source=status.sources.find(item=>item.id==='operator-sitrep');
 assert.equal(source?.available,false);
 assert.match(source?.detail??'',/runtime offline/);
 assert.match(coordinatorSitrep(status).nextSteps[0],/Restaurar a fonte canônica/);
});

test('an authorized bounded task is delegated deterministically and written back with provenance',async()=>{
 const {deps,memory,audit}=await harness();
 const record=await delegateTask({objective:'Resumir a lista sintética de tarefas de teste',authorization:human},deps);
 assert.equal(record.status,'completed');
 assert.equal(record.planStatus,'DONE');
 assert.ok(record.evidence?.every(item=>item.providerId==='deterministic-local'&&item.simulated===true));
 assert.equal(record.policy?.decision,'allow');
 assert.equal(memory.length,1);
 assert.equal(memory[0].source,'claude-code-mod:munin-coordenador');
 assert.deepEqual((memory[0].payload as {authorization:unknown}).authorization,human);
 assert.equal(audit.length,1);
});

test('agent or peer messages are never treated as human authorization',async()=>{
 const {deps}=await harness();
 const record=await delegateTask({objective:'Resumir lista sintética',authorization:{kind:'agent',via:'peer'}},deps);
 assert.equal(record.status,'refused');
 assert.match(record.reason??'',/not a human authorization/);
 assert.equal(record.planId,undefined);
});

test('consequential objectives are refused before any execution (PT and EN)',async()=>{
 const {deps}=await harness();
 for(const objective of ['Enviar email para o recrutador','Candidatar-me à vaga X','publish the post to LinkedIn','Pagar a fatura']){
  const record=await delegateTask({objective,authorization:human},deps);
  assert.equal(record.status,'refused',objective);
  assert.equal(record.planId,undefined,objective);
 }
});

test('an unavailable executor is reported as blocked with a recommendation, never as executed',async()=>{
 const {deps}=await harness({localHealth:async()=>({ready:false,error:'connect ECONNREFUSED'}),profiles:()=>[
  {id:'deterministic-local',provider:new DeterministicProvider(),capabilities:['*'],mode:'offline',estimatedCostPerCall:0,estimatedLatencyMs:1,enabled:true},
  {id:'ollama-local',provider:new DeterministicProvider(),capabilities:['write','review','plan'],mode:'offline',estimatedCostPerCall:0,estimatedLatencyMs:30000,enabled:true},
 ] as ProviderProfile[]});
 const local=await delegateTask({objective:'Resumir lista sintética',tier:'local',authorization:human},deps);
 assert.equal(local.status,'blocked');
 assert.match(local.reason??'',/Ollama not ready/);
 assert.equal(local.planId,undefined);
 const economy=await delegateTask({objective:'Resumir lista sintética',tier:'economy',authorization:human},deps);
 assert.equal(economy.status,'blocked');
 assert.match(economy.reason??'',/no zero-cost economy provider/);
 const strong=await delegateTask({objective:'Resumir lista sintética',tier:'strong',authorization:human},deps);
 assert.equal(strong.status,'refused');
 assert.match(strong.reason??'',/justification/);
 const none=await (await harness({profiles:()=>[]})).deps;
 const empty=await delegateTask({objective:'Resumir lista sintética',authorization:human},none);
 assert.equal(empty.status,'blocked');
 assert.match(empty.reason??'',/executor unavailable/);
});

test(`no more than ${MAX_CONCURRENT_DELEGATIONS} delegations run at once; stale runs are released`,async()=>{
 const {deps}=await harness();
 const now=new Date();
 const running=(id:string,createdAt:string):DelegationRecord=>({id,objective:'synthetic',tier:'deterministic',status:'running',createdAt,authorization:human,source:'test'});
 await mkdir(path.dirname(deps.ledgerFile!),{recursive:true});
 await writeFile(deps.ledgerFile!,JSON.stringify([running('a',now.toISOString()),running('b',now.toISOString())]),'utf8');
 const blocked=await delegateTask({objective:'Resumir lista sintética',authorization:human},deps);
 assert.equal(blocked.status,'blocked');
 assert.match(blocked.reason??'',/concurrency limit reached \(2\/2/);
 await writeFile(deps.ledgerFile!,JSON.stringify([running('a',now.toISOString()),running('old',new Date(now.getTime()-31*60_000).toISOString())]),'utf8');
 const allowed=await delegateTask({objective:'Resumir lista sintética',authorization:human},deps);
 assert.equal(allowed.status,'completed');
 const ledger=JSON.parse(await readFile(deps.ledgerFile!,'utf8')) as DelegationRecord[];
 assert.equal(ledger.find(item=>item.id==='old')?.status,'interrupted');
});

test('two concurrent callers cannot both take the last slot',async()=>{
 const {deps}=await harness();
 await mkdir(path.dirname(deps.ledgerFile!),{recursive:true});
 await writeFile(deps.ledgerFile!,JSON.stringify([{id:'a',objective:'s',tier:'deterministic',status:'running',createdAt:new Date().toISOString(),authorization:human,source:'test'}]),'utf8');
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
 const slow={...deps,engine:()=>({createPlan:async(objective:string)=>{await gate;return {id:'p',objective,status:'READY',createdAt:'',updatedAt:'',tasks:[]} as never},run:async()=>({id:'p',objective:'s',status:'DONE',createdAt:'',updatedAt:'',tasks:[]}) as never})};
 const first=delegateTask({objective:'Resumir lista sintética um',authorization:human},slow);
 await new Promise(resolve=>setTimeout(resolve,50));
 const second=await delegateTask({objective:'Resumir lista sintética dois',authorization:human},slow);
 release();
 assert.equal(second.status,'blocked');
 assert.equal((await first).status,'completed');
});

test('delegation never resolves or alters pending approvals',async()=>{
 const approvals=[structuredClone(pendingApproval)];
 const {deps}=await harness({approvals:async()=>approvals});
 const before=JSON.stringify(approvals);
 await delegateTask({objective:'Resumir lista sintética',authorization:human},deps);
 await delegateTask({objective:'Aprovar a aprovação appr-1',authorization:human},deps);
 assert.equal(JSON.stringify(approvals),before);
 assert.equal((await buildCoordinatorStatus(deps)).approvals.pending,1);
});
