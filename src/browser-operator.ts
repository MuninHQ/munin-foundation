import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
export type BrowserBackend='playwright-cli'|'browser-use';
export type BrowserHealth={backend:BrowserBackend;available:boolean;command:string;detail?:string};
export type BrowserInspection={backend:BrowserBackend;available:boolean;url:string;command:string;snapshot?:string;detail?:string;readOnly:true};
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
function executable(backend:BrowserBackend,platform:NodeJS.Platform=process.platform){return backend==='playwright-cli'?(platform==='win32'?'playwright-cli.cmd':'playwright-cli'):(platform==='win32'?'browser-use.exe':'browser-use')}
function browserCommandEnv(){return {...process.env,NO_UPDATE_NOTIFIER:'1'}}

export type BrowserInvocation={command:string;argsPrefix:string[];displayCommand:string};
export function resolveBrowserInvocation(backend:BrowserBackend,platform:NodeJS.Platform=process.platform,pathEnv:string|undefined=process.env.PATH,fileExists:(candidate:string)=>boolean=existsSync):BrowserInvocation{
 const command=executable(backend,platform);
 if(backend!=='playwright-cli'||platform!=='win32')return {command,argsPrefix:[],displayCommand:command};
 for(const entry of (pathEnv??'').split(';').filter(Boolean)){
  const script=path.win32.join(entry,'node_modules','@playwright','cli','playwright-cli.js');
  if(fileExists(script))return {command:process.execPath,argsPrefix:[script],displayCommand:`${process.execPath} ${script}`};
 }
 return {command,argsPrefix:[],displayCommand:command};
}

export async function browserHealth(backend=selectedBackend()):Promise<BrowserHealth>{const invocation=resolveBrowserInvocation(backend);try{const result=await execFileAsync(invocation.command,[...invocation.argsPrefix,'--help'],{timeout:15_000,windowsHide:true,maxBuffer:1_000_000,env:browserCommandEnv()});return {backend,available:true,command:invocation.displayCommand,detail:String(result.stdout??'').slice(0,300)}}catch(error){return {backend,available:false,command:invocation.displayCommand,detail:error instanceof Error?error.message:String(error)}}}

export function validateBrowserInspectionUrl(raw:string):string{
 if(!raw||raw.length>2048)throw new Error('Browser inspection URL must be between 1 and 2048 characters.');
 let parsed:URL;try{parsed=new URL(raw)}catch{throw new Error('Browser inspection requires a valid absolute URL.');}
 if(parsed.protocol!=='http:'&&parsed.protocol!=='https:')throw new Error('Browser inspection allows only http/https URLs.');
 if(parsed.username||parsed.password)throw new Error('Browser inspection URL must not contain embedded credentials.');
 const host=parsed.hostname.toLowerCase();
 if(host==='169.254.169.254'||host==='metadata.google.internal')throw new Error('Browser inspection blocks cloud metadata endpoints.');
 return parsed.toString();
}

export async function inspectBrowserReadOnly(rawUrl:string,backend:BrowserBackend='playwright-cli'):Promise<BrowserInspection>{
 const url=validateBrowserInspectionUrl(rawUrl);const invocation=resolveBrowserInvocation(backend);
 if(backend!=='playwright-cli')return {backend,available:false,url,command:invocation.displayCommand,readOnly:true,detail:'Read-only inspection is promoted only for Playwright CLI.'};
 const session=`munin-ro-${process.pid}-${Date.now().toString(36)}`;
 const args=(...values:string[])=>[...invocation.argsPrefix,...values];
 try{
  const opened=await execFileAsync(invocation.command,args(`-s=${session}`,'open',url),{timeout:45_000,windowsHide:true,maxBuffer:2_000_000,env:browserCommandEnv()});
  const snapshot=await execFileAsync(invocation.command,args(`-s=${session}`,'snapshot','--depth=6'),{timeout:30_000,windowsHide:true,maxBuffer:2_000_000,env:browserCommandEnv()});
  return {backend,available:true,url,command:invocation.displayCommand,readOnly:true,snapshot:`${String(opened.stdout??'')}\n${String(snapshot.stdout??'')}`.trim().slice(0,120_000)};
 }catch(error){return {backend,available:false,url,command:invocation.displayCommand,readOnly:true,detail:error instanceof Error?error.message:String(error)}
 }finally{try{await execFileAsync(invocation.command,args(`-s=${session}`,'close'),{timeout:10_000,windowsHide:true,maxBuffer:200_000,env:browserCommandEnv()})}catch{/* best-effort cleanup */}}
}

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
 allowedActions:['health','inspect'] as const,
 inspectMode:'read-only-navigation-and-snapshot' as const,
 actionPolicyRequired:true,
 cloudRequired:false,
 paidDependencyRequired:false,
 benchmarkRequiredBeforePromotion:true,
};}
