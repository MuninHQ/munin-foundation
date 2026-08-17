import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
export type BrowserBackend='playwright-cli'|'browser-use';
export type BrowserHealth={backend:BrowserBackend;available:boolean;command:string;detail?:string};
export type BrowserBenchmarkSample={
 backend:BrowserBackend;
 available:boolean;
 navigationMs?:number;
 formMs?:number;
 recoveryMs?:number;
 contextTokens?:number;
 memoryMb?:number;
 actionLog:boolean;
 replay:boolean;
 permissionGate:boolean;
 mobileTrigger:boolean;
 notes?:string;
};
export type BrowserBenchmarkResult={backend:BrowserBackend;score:number;eligible:boolean;reasons:string[]};

function selectedBackend():BrowserBackend{return process.env.MUNIN_BROWSER_BACKEND==='browser-use'?'browser-use':'playwright-cli'}
function executable(backend:BrowserBackend){return backend==='playwright-cli'?(process.platform==='win32'?'playwright-cli.cmd':'playwright-cli'):(process.platform==='win32'?'browser-use.exe':'browser-use')}

export async function browserHealth(backend=selectedBackend()):Promise<BrowserHealth>{const command=executable(backend);try{const result=await execFileAsync(command,['--help'],{timeout:15_000,windowsHide:true,maxBuffer:1_000_000});return {backend,available:true,command,detail:String(result.stdout??'').slice(0,300)}}catch(error){return {backend,available:false,command,detail:error instanceof Error?error.message:String(error)}}}

function inverseScore(value:number|undefined,ceiling:number){if(value===undefined||!Number.isFinite(value)||value<0)return 0;return Math.max(0,1-Math.min(value,ceiling)/ceiling)}

export function scoreBrowserBenchmark(sample:BrowserBenchmarkSample):BrowserBenchmarkResult{
 const reasons:string[]=[];
 if(!sample.available)reasons.push('backend unavailable');
 if(!sample.actionLog)reasons.push('missing action log');
 if(!sample.permissionGate)reasons.push('missing deterministic permission gate');
 const eligible=sample.available&&sample.actionLog&&sample.permissionGate;
 const reliability=(Number(sample.replay)+Number(sample.mobileTrigger)+Number(sample.permissionGate)+Number(sample.actionLog))/4;
 const latency=(inverseScore(sample.navigationMs,30_000)+inverseScore(sample.formMs,30_000)+inverseScore(sample.recoveryMs,60_000))/3;
 const efficiency=(inverseScore(sample.contextTokens,50_000)+inverseScore(sample.memoryMb,2_000))/2;
 const score=Math.round((reliability*0.5+latency*0.3+efficiency*0.2)*1000)/10;
 return {backend:sample.backend,score:eligible?score:0,eligible,reasons};
}

export function recommendBrowserBackend(samples:BrowserBenchmarkSample[]){
 const ranked=samples.map(scoreBrowserBenchmark).sort((a,b)=>b.score-a.score||a.backend.localeCompare(b.backend));
 const eligible=ranked.filter(item=>item.eligible);
 return {recommended:eligible[0]?.backend??null,ranked};
}

export function browserOperatorPolicy(){return {
 preferred:'playwright-cli' as const,
 fallback:'browser-use' as const,
 rationale:'Playwright CLI is the default low-context deterministic path; Browser Use is reserved for tasks that materially benefit from agentic recovery loops.',
 persistentProfile:true,
 actionPolicyRequired:true,
 cloudRequired:false,
 paidDependencyRequired:false,
 benchmarkRequiredBeforePromotion:true,
};}
