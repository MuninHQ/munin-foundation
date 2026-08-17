import { existsSync } from 'node:fs';
import path from 'node:path';
import { browserHealth } from './browser-operator.js';
import { semanticBackendHealth } from './semantic-code-intelligence.js';
import { SkillRegistry } from './skills.js';

export type ReadinessState='ready'|'degraded'|'blocked';
export type ReadinessCheck={name:string;state:ReadinessState;detail:string;required:boolean};
export type AutonomyReadinessReport={state:ReadinessState;repositoryRoot:string;checks:ReadinessCheck[];blockers:string[];nextActions:string[]};

export interface AutonomyReadinessProbes{
 browser():Promise<{available:boolean;detail?:string}>;
 semantic():Promise<{available:boolean;detail?:string}>;
 skills():Promise<number>;
}

function overall(checks:ReadinessCheck[]):ReadinessState{
 if(checks.some(check=>check.required&&check.state==='blocked'))return 'blocked';
 if(checks.some(check=>check.state!=='ready'))return 'degraded';
 return 'ready';
}

export async function inspectAutonomyReadiness(repositoryRoot=process.cwd(),probes?:Partial<AutonomyReadinessProbes>):Promise<AutonomyReadinessReport>{
 const defaults:AutonomyReadinessProbes={
  browser:async()=>browserHealth('playwright-cli'),
  semantic:async()=>semanticBackendHealth('serena',repositoryRoot),
  skills:async()=>new SkillRegistry(path.join(repositoryRoot,'skills')).discover().then(items=>items.length),
 };
 const active={...defaults,...probes};
 const checks:ReadinessCheck[]=[];
 const gitReady=existsSync(path.join(repositoryRoot,'.git'));
 checks.push({name:'git-repository',state:gitReady?'ready':'blocked',required:true,detail:gitReady?'Git repository detected.':'No .git repository detected.'});
 const capabilityEnabled=process.env.MUNIN_RUNTIME_CAPABILITIES==='1';
 checks.push({name:'runtime-capability-seam',state:capabilityEnabled?'ready':'degraded',required:false,detail:capabilityEnabled?'MUNIN_RUNTIME_CAPABILITIES=1.':'Capability seam is available in code but disabled by environment.'});
 const skillCount=await active.skills();
 checks.push({name:'engineering-methodology-skills',state:skillCount>0?'ready':'degraded',required:false,detail:`${skillCount} local skill(s) discovered.`});
 const browser=await active.browser();
 checks.push({name:'playwright-cli',state:browser.available?'ready':'degraded',required:false,detail:browser.available?'Playwright CLI available for read-only UI verification.':browser.detail??'Playwright CLI unavailable.'});
 const semantic=await active.semantic();
 checks.push({name:'serena-semantic-intelligence',state:semantic.available?'ready':'degraded',required:false,detail:semantic.available?'Serena local project health check passed.':semantic.detail??'Serena unavailable; native repository intelligence remains the fallback.'});
 const state=overall(checks);
 const blockers=checks.filter(check=>check.required&&check.state==='blocked').map(check=>`${check.name}: ${check.detail}`);
 const nextActions:string[]=[];
 if(!capabilityEnabled)nextActions.push('Set MUNIN_RUNTIME_CAPABILITIES=1 when you want to opt into the experimental runtime capability seam.');
 if(!browser.available)nextActions.push('Install/validate Playwright CLI on the desktop before requesting browser-verified engineering missions.');
 if(!semantic.available)nextActions.push('Install/initialize Serena locally before promoting semantic symbol/reference tooling; native fallback remains active meanwhile.');
 return {state,repositoryRoot,checks,blockers,nextActions};
}
