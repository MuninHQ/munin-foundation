import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
export type BrowserBackend='playwright-cli'|'browser-use';
export type BrowserHealth={backend:BrowserBackend;available:boolean;command:string;detail?:string};

function selectedBackend():BrowserBackend{return process.env.MUNIN_BROWSER_BACKEND==='browser-use'?'browser-use':'playwright-cli'}
function executable(backend:BrowserBackend){return backend==='playwright-cli'?(process.platform==='win32'?'playwright-cli.cmd':'playwright-cli'):(process.platform==='win32'?'browser-use.exe':'browser-use')}

export async function browserHealth(backend=selectedBackend()):Promise<BrowserHealth>{const command=executable(backend);try{const result=await execFileAsync(command,['--help'],{timeout:15_000,windowsHide:true,maxBuffer:1_000_000});return {backend,available:true,command,detail:String(result.stdout??'').slice(0,300)}}catch(error){return {backend,available:false,command,detail:error instanceof Error?error.message:String(error)}}}

export function browserOperatorPolicy(){return {
 preferred:'playwright-cli' as const,
 fallback:'browser-use' as const,
 rationale:'Playwright CLI is the default low-context deterministic path; Browser Use is reserved for tasks that materially benefit from agentic recovery loops.',
 persistentProfile:true,
 actionPolicyRequired:true,
 cloudRequired:false,
 paidDependencyRequired:false,
};}
