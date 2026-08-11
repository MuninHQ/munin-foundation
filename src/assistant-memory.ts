import { readFile } from 'node:fs/promises';
import { runtimePath } from './config.js';
import { writeJsonAtomic } from './storage.js';

export type AssistantEntity={type:'job'|'project'|'research'|'action';id:string;label:string};
export type AssistantTurn={role:'user'|'assistant';text:string;at:string};
export type AssistantMemory={turns:AssistantTurn[];lastEntity?:AssistantEntity;updatedAt:string};
const file=()=>runtimePath('assistant-memory.json');
const empty=():AssistantMemory=>({turns:[],updatedAt:new Date(0).toISOString()});
export async function loadAssistantMemory():Promise<AssistantMemory>{try{return JSON.parse(await readFile(file(),'utf8')) as AssistantMemory}catch{return empty()}}
export async function saveAssistantMemory(memory:AssistantMemory){memory.turns=memory.turns.slice(-30);memory.updatedAt=new Date().toISOString();await writeJsonAtomic(file(),memory)}
export async function rememberTurn(role:AssistantTurn['role'],text:string,entity?:AssistantEntity){const memory=await loadAssistantMemory();memory.turns.push({role,text,at:new Date().toISOString()});if(entity)memory.lastEntity=entity;await saveAssistantMemory(memory);return memory}
export async function clearAssistantMemory(){const memory=empty();await saveAssistantMemory(memory);return memory}
