import { spawn } from 'node:child_process';
import { extname, isAbsolute } from 'node:path';
import { buildContentVideoRenderManifest, type ContentVideoRenderer } from './content-video-pipeline.js';
import type { RuntimeCapability, RuntimeCapabilityRegistry } from './runtime-capability-seam.js';

export type ContentVideoAction='health'|'plan'|'generate';
export interface ContentVideoInput{action:ContentVideoAction;topic?:string;script?:string;language?:string;aspectRatio?:'16:9'|'9:16'|'1:1';outputDir?:string;provider?:'local-render'|'moneyprinterturbo'|'custom';renderer?:ContentVideoRenderer}
export interface ContentVideoOutput{action:ContentVideoAction;ready:boolean;detail:string;policy:{enabled:boolean;runnerConfigured:boolean;automaticInstallAllowed:false;automaticPublishAllowed:false;paidDependencyRequired:false;humanApprovalRequired:true;defaultProvider:'local-render'};request?:Record<string,unknown>;result?:unknown}

function policy(){
 const enabled=process.env.MUNIN_CONTENT_VIDEO_ENABLED==='1';
 const runner=process.env.MUNIN_CONTENT_VIDEO_RUNNER?.trim()??'';
 return{enabled,runnerConfigured:Boolean(runner),automaticInstallAllowed:false as const,automaticPublishAllowed:false as const,paidDependencyRequired:false as const,humanApprovalRequired:true as const,defaultProvider:'local-render' as const};
}

function requestFor(input:ContentVideoInput){
 if(!input.topic?.trim())throw new Error('topic is required');
 const pipeline=buildContentVideoRenderManifest({
  topic:input.topic,
  script:input.script,
  language:input.language,
  aspectRatio:input.aspectRatio,
  renderer:input.renderer,
  outputDir:input.outputDir,
 });
 return{
  topic:pipeline.topic,
  script:pipeline.script,
  language:pipeline.language,
  aspectRatio:pipeline.aspectRatio,
  outputDir:pipeline.outputDir,
  provider:input.provider??'local-render',
  pipeline,
  requireHumanApproval:true,
  brandRules:{noLogo:true,noMonogram:true,noSignature:true,noWatermark:true},
 };
}

function run(runner:string,request:Record<string,unknown>):Promise<unknown>{
 if(!isAbsolute(runner))throw new Error('MUNIN_CONTENT_VIDEO_RUNNER must be an absolute path');
 const nodeScript=extname(runner).toLowerCase()==='.mjs';
 return new Promise((resolve,reject)=>{
  const child=spawn(nodeScript?process.execPath:runner,nodeScript?[runner]:[],{stdio:['pipe','pipe','pipe'],shell:false,windowsHide:true,env:process.env});
  let stdout='',stderr='';
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',value=>stdout+=value);child.stderr.on('data',value=>stderr+=value);
  child.once('error',reject);
  child.once('exit',code=>{
   if(code!==0)return reject(new Error(`Content video runner exited ${code}: ${stderr.trim().slice(0,800)}`));
   try{resolve(stdout.trim()?JSON.parse(stdout):{ok:true});}catch{resolve({ok:true,output:stdout.trim()});}
  });
  child.stdin.end(JSON.stringify(request));
 });
}

export function createContentVideoCapability():RuntimeCapability<ContentVideoInput,ContentVideoOutput>{
 return{name:'media.content-video',async execute(input){
  const p=policy();
  if(input.action==='health')return{
   action:'health',
   ready:p.enabled&&p.runnerConfigured,
   policy:p,
   detail:p.enabled
    ?(p.runnerConfigured?'Local content-video runner configured; human review and publication boundary remain mandatory.':'Configure MUNIN_CONTENT_VIDEO_RUNNER with a reviewed local render adapter.')
    :'Content video is opt-in; planning works without a runner, generation remains disabled.',
  };
  const request=requestFor(input);
  if(input.action==='plan')return{action:'plan',ready:p.enabled&&p.runnerConfigured,policy:p,detail:'Versioned local render manifest prepared without installing, generating or publishing media.',request};
  if(!p.enabled)throw new Error('Content video capability is disabled');
  const runner=process.env.MUNIN_CONTENT_VIDEO_RUNNER?.trim();
  if(!runner)throw new Error('MUNIN_CONTENT_VIDEO_RUNNER is required');
  return{action:'generate',ready:true,policy:p,detail:'Draft video runner completed locally; publication remains blocked pending human review.',request,result:await run(runner,request)};
 }};
}
export function registerContentVideoCapability(registry:RuntimeCapabilityRegistry):void{if(!registry.has('media.content-video'))registry.register(createContentVideoCapability());}
export function contentVideoPolicy(){return policy();}
