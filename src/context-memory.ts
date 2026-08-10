import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type MemoryScope='public-professional'|'private-operational'|'sensitive-private';
export type MemoryConfidence='high'|'medium-high'|'medium'|'low';
export type Freshness='durable'|'refresh-before-action'|'time-sensitive';
export type ContextSection={
  key:string;
  scope:MemoryScope;
  confidence:MemoryConfidence;
  freshness:Freshness;
  value:unknown;
  source:string;
  importedAt:string;
  updatedAt:string;
  version:number;
};
export type ContextMemoryState={schemaVersion:1;sections:Record<string,ContextSection>;imports:{id:string;source:string;at:string;keys:string[]}[];updatedAt:string};
export type ImportConflict={key:string;reason:'existing-section';existingUpdatedAt:string;incomingScope:MemoryScope};
export type ImportPreview={keys:string[];newKeys:string[];conflicts:ImportConflict[];scopes:Record<MemoryScope,number>;warnings:string[]};

const file=join(process.cwd(),'data','runtime','context-memory.json');
const empty=():ContextMemoryState=>({schemaVersion:1,sections:{},imports:[],updatedAt:new Date(0).toISOString()});

export async function loadContextMemory():Promise<ContextMemoryState>{try{const parsed=JSON.parse(await readFile(file,'utf8')) as ContextMemoryState;return {...empty(),...parsed,sections:parsed.sections??{},imports:Array.isArray(parsed.imports)?parsed.imports:[]};}catch{return empty();}}
async function save(state:ContextMemoryState){state.updatedAt=new Date().toISOString();await mkdir(dirname(file),{recursive:true});await writeFile(file,JSON.stringify(state,null,2),'utf8');return state;}

function validScope(value:unknown):MemoryScope{return value==='public-professional'||value==='sensitive-private'||value==='private-operational'?value:'private-operational';}
function confidenceFor(key:string,value:any):MemoryConfidence{if(typeof value?.confidence==='string'&&['high','medium-high','medium','low'].includes(value.confidence))return value.confidence as MemoryConfidence;if(['job_search','technology','financial','personal_daily'].includes(key))return 'medium-high';return 'high';}
function freshnessFor(key:string,value:any):Freshness{if(value?.freshness==='must_refresh_before_action'||key==='job_search')return 'refresh-before-action';if(['financial','personal_daily','technology'].includes(key))return 'time-sensitive';return 'durable';}
function unwrapScope(value:any){if(value&&typeof value==='object'&&!Array.isArray(value)){const copy={...value};delete copy.scope;delete copy.confidence;delete copy.freshness;return copy;}return value;}
function normalizeSeed(seed:unknown){if(!seed||typeof seed!=='object'||Array.isArray(seed))throw new Error('Seed deve ser um objeto JSON.');const root=seed as Record<string,any>;const keys=Object.keys(root).filter(k=>k!=='manifest');if(!keys.length)throw new Error('Nenhuma seção de contexto encontrada.');return keys.map(key=>({key,scope:validScope(root[key]?.scope),confidence:confidenceFor(key,root[key]),freshness:freshnessFor(key,root[key]),value:unwrapScope(root[key])}));}

export async function previewContextSeed(seed:unknown):Promise<ImportPreview>{const incoming=normalizeSeed(seed);const state=await loadContextMemory();const conflicts=incoming.filter(x=>state.sections[x.key]).map(x=>({key:x.key,reason:'existing-section' as const,existingUpdatedAt:state.sections[x.key].updatedAt,incomingScope:x.scope}));const scopes:Record<MemoryScope,number>={'public-professional':0,'private-operational':0,'sensitive-private':0};incoming.forEach(x=>scopes[x.scope]++);const warnings:string[]=[];if(incoming.some(x=>x.scope==='sensitive-private'))warnings.push('O pacote contém contexto sensível. Esses dados não devem ser usados em saídas públicas.');if(incoming.some(x=>x.freshness!=='durable'))warnings.push('Há seções temporais que exigem atualização antes de ações externas.');return {keys:incoming.map(x=>x.key),newKeys:incoming.filter(x=>!state.sections[x.key]).map(x=>x.key),conflicts,scopes,warnings};}

export async function importContextSeed(seed:unknown,options:{source?:string;replaceConflicts?:boolean}={}){const incoming=normalizeSeed(seed);const state=await loadContextMemory();const now=new Date().toISOString();const imported:string[]=[];const skipped:string[]=[];for(const item of incoming){const existing=state.sections[item.key];if(existing&&!options.replaceConflicts){skipped.push(item.key);continue;}state.sections[item.key]={...item,source:options.source??'context-seed',importedAt:existing?.importedAt??now,updatedAt:now,version:(existing?.version??0)+1};imported.push(item.key);}state.imports.unshift({id:`ctx_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,source:options.source??'context-seed',at:now,keys:imported});state.imports=state.imports.slice(0,50);await save(state);return {imported,skipped,state};}

export async function queryContextMemory(query:string,allowedScopes:MemoryScope[]=['public-professional','private-operational']){const state=await loadContextMemory();const q=query.trim().toLowerCase();const terms=q.split(/\s+/).filter(x=>x.length>2);return Object.values(state.sections).filter(s=>allowedScopes.includes(s.scope)).map(section=>{const hay=`${section.key} ${JSON.stringify(section.value)}`.toLowerCase();const score=terms.length?terms.reduce((n,t)=>n+(hay.includes(t)?1:0),0):1;return {section,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12);}

export async function publicContextSnapshot(){const state=await loadContextMemory();return Object.fromEntries(Object.entries(state.sections).filter(([,v])=>v.scope==='public-professional').map(([k,v])=>[k,{...v,value:v.value}]));}
