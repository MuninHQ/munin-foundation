import { appendFile,mkdir,readFile } from 'node:fs/promises';import { dirname,resolve } from 'node:path';import { runtimePath } from './config.js';
export type AutonomousJournalEventType='run.started'|'phase.completed'|'completion.evaluated'|'run.finished';
export interface AutonomousJournalEvent{type:AutonomousJournalEventType;at:string;runId:string;objective:string;iteration?:number;phase?:string;status?:string;payload?:Record<string,unknown>}
export interface AutonomousRunRecovery{runId:string;objective:string;events:AutonomousJournalEvent[];terminal:boolean;lastIteration:number;lastPhase?:string}
export class AutonomousRunJournal{
 readonly path:string;private tail:Promise<void>=Promise.resolve();constructor(path=runtimePath('autonomous','run-journal.jsonl')){this.path=resolve(path)}
 append(event:AutonomousJournalEvent):Promise<void>{const op=this.tail.then(async()=>{await mkdir(dirname(this.path),{recursive:true});await appendFile(this.path,`${JSON.stringify(event)}\n`,'utf8')});this.tail=op.catch(()=>undefined);return op}
 async list():Promise<AutonomousJournalEvent[]>{try{return(await readFile(this.path,'utf8')).split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return[JSON.parse(line) as AutonomousJournalEvent]}catch{return[]}})}catch(error:any){if(error?.code==='ENOENT')return[];throw error}}
 async recover(runId:string):Promise<AutonomousRunRecovery|undefined>{const events=(await this.list()).filter(e=>e.runId===runId);if(!events.length)return undefined;const first=events[0];const last=events[events.length-1];return{runId,objective:first.objective,events,terminal:events.some(e=>e.type==='run.finished'),lastIteration:Math.max(0,...events.map(e=>e.iteration??0)),lastPhase:last.phase}}
 async interrupted():Promise<AutonomousRunRecovery[]>{const events=await this.list();const ids=[...new Set(events.map(e=>e.runId))];const recovered=(await Promise.all(ids.map(id=>this.recover(id)))).filter((x):x is AutonomousRunRecovery=>Boolean(x));return recovered.filter(x=>!x.terminal)}
}
