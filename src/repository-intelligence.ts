import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
export type RepoIntelligenceBackend='rag-rat'|'graphify'|'native';
export type RepoIntelligenceHealth={backend:RepoIntelligenceBackend;available:boolean;command?:string;detail?:string};

function commandFor(backend:RepoIntelligenceBackend){if(backend==='rag-rat')return process.platform==='win32'?'rag-rat.exe':'rag-rat';if(backend==='graphify')return process.platform==='win32'?'graphify.exe':'graphify';return undefined}

export async function repositoryIntelligenceHealth(backend:RepoIntelligenceBackend):Promise<RepoIntelligenceHealth>{if(backend==='native')return {backend,available:true,detail:'Munin native Git/file inspection is always available.'};const command=commandFor(backend)!;try{const result=await execFileAsync(command,['--help'],{timeout:15_000,windowsHide:true,maxBuffer:1_000_000});return {backend,available:true,command,detail:String(result.stdout??'').slice(0,300)}}catch(error){return {backend,available:false,command,detail:error instanceof Error?error.message:String(error)}}}

export function repositoryIntelligencePolicy(){return {
 authoritativeSource:'repository' as const,
 preferredIndex:'rag-rat' as const,
 structuralGraphExperiment:'graphify' as const,
 fallback:'native' as const,
 rationale:'rag-rat best matches source-anchored rationale, impact, tests and git/GitHub papertrail; Graphify remains useful as an on-demand deterministic structural graph, not a second source of truth.',
 externalIndexAuthoritative:false,
 paidDependencyRequired:false,
 localFirst:true,
};}
