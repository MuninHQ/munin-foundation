import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimePath } from './config.js';
import type { OrchestrationTrace } from './orchestration-trace.js';
import { redactSecretText } from './secret-redaction.js';

function sanitize(value:string|undefined):string|undefined{return value===undefined?undefined:redactSecretText(value)}
function sanitizeTrace(trace:OrchestrationTrace):OrchestrationTrace{return {...trace,attempts:trace.attempts.map(item=>({...item,providerId:redactSecretText(item.providerId),error:sanitize(item.error)})),selectedProviderId:sanitize(trace.selectedProviderId),providerDecision:trace.providerDecision?{...trace.providerDecision,selectedProviderId:sanitize(trace.providerDecision.selectedProviderId),consideredProviderIds:trace.providerDecision.consideredProviderIds.map(redactSecretText),rejected:trace.providerDecision.rejected.map(item=>({...item,providerId:redactSecretText(item.providerId),reason:sanitize(item.reason)??item.reason})),rationale:trace.providerDecision.rationale.map(item=>sanitize(item)??item)}:undefined}}

export class OrchestrationTraceStore{
 constructor(private readonly file=runtimePath('orchestration-traces.jsonl')){}
 async append(trace:OrchestrationTrace):Promise<void>{await mkdir(path.dirname(this.file),{recursive:true});await appendFile(this.file,JSON.stringify(sanitizeTrace(trace))+'\n','utf8')}
 async list(limit=100):Promise<OrchestrationTrace[]>{if(!Number.isInteger(limit)||limit<1||limit>1000)throw new Error('limit must be an integer between 1 and 1000');try{const text=await readFile(this.file,'utf8');return text.split(/\r?\n/).filter(Boolean).slice(-limit).map(line=>JSON.parse(line) as OrchestrationTrace).reverse()}catch(error:any){if(error?.code==='ENOENT')return [];throw error}}
}

export interface OrchestrationMetrics{windowHours:number;runs:number;successfulRuns:number;completionRate:number;retryRate:number;humanInterventionRate:number;medianDurationMs:number;providerFailures:number}
export function summarizeOrchestrationTraces(traces:OrchestrationTrace[],now=new Date(),windowHours=24):OrchestrationMetrics{
 const cutoff=now.getTime()-windowHours*60*60*1000;const recent=traces.filter(trace=>{const time=Date.parse(trace.completedAt);return Number.isFinite(time)&&time>=cutoff&&time<=now.getTime()});
 const durations=recent.map(trace=>Math.max(0,Date.parse(trace.completedAt)-Date.parse(trace.startedAt))).filter(Number.isFinite).sort((a,b)=>a-b);
 const median=durations.length?durations.length%2?durations[(durations.length-1)/2]:(durations[durations.length/2-1]+durations[durations.length/2])/2:0;
 const successful=recent.filter(trace=>trace.attempts.some(attempt=>attempt.ok)).length;const retries=recent.filter(trace=>trace.attempts.length>1).length;const failures=recent.reduce((sum,trace)=>sum+trace.attempts.filter(attempt=>!attempt.ok).length,0);
 return {windowHours,runs:recent.length,successfulRuns:successful,completionRate:recent.length?successful/recent.length:0,retryRate:recent.length?retries/recent.length:0,humanInterventionRate:0,medianDurationMs:median,providerFailures:failures};
}
