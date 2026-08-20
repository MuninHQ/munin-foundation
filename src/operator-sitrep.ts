import { readFile } from 'node:fs/promises';
import { browserHealth, browserOperatorPolicy, type BrowserHealth } from './browser-operator.js';
import { runtimePath } from './config.js';
import { connectionStatus, type OAuthProvider } from './oauth.js';
import { hydrateControlRoomState, summarizeHydratedState } from './control-room-state.js';
import { MemoryLedger } from './memory-ledger.js';
import type { EngineeringJob, EngineeringJobStatus } from './engineering-jobs.js';
import { JsonBlockerLedger } from './json-blocker-ledger.js';
import type { BlockerRecord } from './blocker-ledger.js';

export type OperatorSeverity='ok'|'attention'|'blocked';
export type OperatorSitrep={
 generatedAt:string;
 severity:OperatorSeverity;
 controlRoom:{ready:boolean;missing:string[];currentStateBytes:number;backlogBytes:number;sessionLogBytes:number};
 engineering:{total:number;byStatus:Record<EngineeringJobStatus,number>;active:number;needsUser:number;failed:number};
 chiefDeveloper:{openBlockers:number;deviceBlockers:number;humanBlockers:number;recoverableBlockers:number;blockers:Array<Pick<BlockerRecord,'id'|'laneId'|'category'|'disposition'|'reason'|'createdAt'>>};
 browser:{available:boolean;backend:string;readOnly:boolean;detail?:string};
 memory:{ledgerEntries:number};
 connectors:Array<{provider:OAuthProvider;connected:boolean;configured:boolean;readOnly:boolean;externalMutationAllowed:boolean;writeScopes:string[]}>;
 attention:string[];
};

export interface OperatorSitrepDependencies{
 jobs?:()=>Promise<EngineeringJob[]>;
 browser?:()=>Promise<BrowserHealth>;
 ledgerCount?:()=>Promise<number>;
 connectors?:()=>Promise<Awaited<ReturnType<typeof connectionStatus>>>;
 blockers?:()=>Promise<BlockerRecord[]>;
}

async function loadJobs():Promise<EngineeringJob[]>{try{return JSON.parse(await readFile(runtimePath('engineering-jobs.json'),'utf8')) as EngineeringJob[]}catch{return []}}
function emptyJobCounts():Record<EngineeringJobStatus,number>{return{queued:0,running:0,completed:0,needs_user:0,failed:0}}

export async function buildOperatorSitrep(root=process.cwd(),dependencies:OperatorSitrepDependencies={}):Promise<OperatorSitrep>{
 const [state,jobs,browser,ledgerCount,connectors,blockers]=await Promise.all([
  hydrateControlRoomState(root),
  dependencies.jobs?.()??loadJobs(),
  dependencies.browser?.()??browserHealth('playwright-cli'),
  dependencies.ledgerCount?.()??new MemoryLedger().list({limit:1000}).then(entries=>entries.length),
  dependencies.connectors?.()??connectionStatus(),
  dependencies.blockers?.()??new JsonBlockerLedger(runtimePath('chief-developer-blockers.json')).listOpen(),
 ]);
 const controlRoom=summarizeHydratedState(state);
 const byStatus=emptyJobCounts();for(const job of jobs)byStatus[job.status]=(byStatus[job.status]??0)+1;
 const connectorRows=connectors.map(item=>({provider:item.provider,connected:item.connected,configured:item.configured,readOnly:item.security.readOnly,externalMutationAllowed:item.security.externalMutationAllowed,writeScopes:item.security.writeScopes}));
 const blockerRows=blockers.map(({id,laneId,category,disposition,reason,createdAt})=>({id,laneId,category,disposition,reason,createdAt}));
 const deviceBlockers=blockers.filter(item=>item.category==='device').length;
 const humanBlockers=blockers.filter(item=>item.disposition==='human'||['credential','2fa','financial','irreversible','permission'].includes(item.category)).length;
 const recoverableBlockers=blockers.length-humanBlockers-deviceBlockers;
 const attention:string[]=[];
 if(!controlRoom.ready)attention.push(`Control Room state missing: ${controlRoom.missing.join(', ')}`);
 if(byStatus.needs_user)attention.push(`${byStatus.needs_user} engineering job(s) require user action.`);
 if(byStatus.failed)attention.push(`${byStatus.failed} engineering job(s) failed.`);
 if(deviceBlockers)attention.push(`${deviceBlockers} Chief Developer device blocker(s) are deferred; unrelated lanes may continue.`);
 if(humanBlockers)attention.push(`${humanBlockers} Chief Developer blocker(s) require genuine human action.`);
 if(recoverableBlockers)attention.push(`${recoverableBlockers} Chief Developer blocker(s) should be rerouted or retried autonomously.`);
 if(!browser.available)attention.push('Playwright browser verification backend is unavailable.');
 for(const connector of connectorRows){if(!connector.readOnly||connector.externalMutationAllowed||connector.writeScopes.length)attention.push(`${connector.provider} connector violates the read-only contract.`)}
 const severity:OperatorSeverity=!controlRoom.ready?'blocked':(byStatus.needs_user>0||byStatus.failed>0||humanBlockers>0?'blocked':(deviceBlockers>0||recoverableBlockers>0||!browser.available||attention.length>0?'attention':'ok'));
 return{
  generatedAt:new Date().toISOString(),severity,
  controlRoom,
  engineering:{total:jobs.length,byStatus,active:byStatus.queued+byStatus.running,needsUser:byStatus.needs_user,failed:byStatus.failed},
  chiefDeveloper:{openBlockers:blockers.length,deviceBlockers,humanBlockers,recoverableBlockers,blockers:blockerRows},
  browser:{available:browser.available,backend:browser.backend,readOnly:browserOperatorPolicy().inspectMode==='read-only-navigation-and-snapshot',detail:browser.detail},
  memory:{ledgerEntries:ledgerCount},connectors:connectorRows,attention,
 };
}
