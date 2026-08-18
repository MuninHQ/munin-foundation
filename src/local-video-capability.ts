import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';
import type { RuntimeCapability, RuntimeCapabilityRegistry } from './runtime-capability-seam.js';

export type LocalVideoAction='health'|'plan'|'generate';
export interface LocalVideoInput{action:LocalVideoAction;prompt?:string;referencePaths?:string[];outputPath?:string;width?:number;height?:number;frames?:number;seed?:number;backend?:'diffsynth'|'comfyui'|'custom'}
export interface LocalVideoPolicy{enabled:boolean;automaticModelDownloadAllowed:false;paidDependencyRequired:false;defaultBackend:string;runnerConfigured:boolean;empiricalBenchmarkRequired:true}
export interface LocalVideoOutput{action:LocalVideoAction;policy:LocalVideoPolicy;ready:boolean;detail:string;request?:Record<string,unknown>;result?:unknown}

function policy():LocalVideoPolicy{
 const enabled=process.env.MUNIN_LOCAL_VIDEO_ENABLED==='1';
 const runner=process.env.MUNIN_LOCAL_VIDEO_RUNNER?.trim()??'';
 return {enabled,automaticModelDownloadAllowed:false,paidDependencyRequired:false,defaultBackend:process.env.MUNIN_LOCAL_VIDEO_BACKEND?.trim()||'diffsynth',runnerConfigured:Boolean(runner),empiricalBenchmarkRequired:true};
}
function positiveInt(value:number|undefined,fallback:number,min:number,max:number){if(value===undefined)return fallback;if(!Number.isInteger(value)||value<min||value>max)throw new Error(`value must be an integer between ${min} and ${max}`);return value;}
function requestFor(input:LocalVideoInput){if(!input.prompt?.trim())throw new Error('prompt is required');return {prompt:input.prompt.trim(),referencePaths:(input.referencePaths??[]).filter(Boolean).slice(0,8),outputPath:input.outputPath,width:positiveInt(input.width,832,256,2048),height:positiveInt(input.height,480,256,2048),frames:positiveInt(input.frames,124,5,721),seed:Number.isInteger(input.seed)?input.seed:0,backend:input.backend??process.env.MUNIN_LOCAL_VIDEO_BACKEND?.trim()??'diffsynth'};}
function runLocalRunner(runner:string,request:Record<string,unknown>):Promise<unknown>{
 if(!isAbsolute(runner))throw new Error('MUNIN_LOCAL_VIDEO_RUNNER must be an absolute path');
 return new Promise((resolve,reject)=>{
  const child=spawn(runner,[],{stdio:['pipe','pipe','pipe'],shell:false,windowsHide:true,env:process.env});let stdout='',stderr='';
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  child.once('error',reject);child.once('exit',code=>{if(code!==0)return reject(new Error(`Local video runner exited ${code}: ${stderr.trim().slice(0,800)}`));try{resolve(stdout.trim()?JSON.parse(stdout):{ok:true});}catch{resolve({ok:true,output:stdout.trim()});}});
  child.stdin.end(JSON.stringify(request));
 });
}

export function createLocalVideoCapability():RuntimeCapability<LocalVideoInput,LocalVideoOutput>{return{name:'media.local-video',async execute(input){const p=policy();if(input.action==='health')return{action:'health',policy:p,ready:p.enabled&&p.runnerConfigured,detail:p.enabled?(p.runnerConfigured?'Local video runner configured; host benchmark still required before default routing.':'Enable a runner with MUNIN_LOCAL_VIDEO_RUNNER.'):'Local video is opt-in; set MUNIN_LOCAL_VIDEO_ENABLED=1 after reviewing model/license/hardware requirements.'};const request=requestFor(input);if(input.action==='plan')return{action:'plan',policy:p,ready:p.enabled&&p.runnerConfigured,detail:'Generation plan created without downloading weights or invoking a backend.',request};if(!p.enabled)throw new Error('Local video capability is disabled');const runner=process.env.MUNIN_LOCAL_VIDEO_RUNNER?.trim();if(!runner)throw new Error('MUNIN_LOCAL_VIDEO_RUNNER is required');const result=await runLocalRunner(runner,request);return{action:'generate',policy:p,ready:true,detail:'Local runner completed. Output quality/performance remains empirical host evidence.',request,result};}};}
export function registerLocalVideoCapability(registry:RuntimeCapabilityRegistry):void{if(!registry.has('media.local-video'))registry.register(createLocalVideoCapability());}
export function localVideoPolicy():LocalVideoPolicy{return policy();}
