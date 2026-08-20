import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AgentScorecard } from './agent-scorecards.js';

interface ScorecardFile{version:1;scorecards:Array<AgentScorecard&{updatedAt:string}>}
export type PersistedAgentScorecard=AgentScorecard&{updatedAt:string};

export class JsonAgentScorecardStore{
 constructor(private readonly path:string){}
 private async read():Promise<ScorecardFile>{try{const parsed=JSON.parse(await readFile(this.path,'utf8')) as ScorecardFile;if(parsed.version!==1||!Array.isArray(parsed.scorecards))throw new Error('Unsupported scorecard store format.');return parsed}catch(error:any){if(error?.code==='ENOENT')return{version:1,scorecards:[]};throw error}}
 private async write(file:ScorecardFile){await mkdir(dirname(this.path),{recursive:true});const tmp=`${this.path}.tmp`;await writeFile(tmp,JSON.stringify(file,null,2)+'\n','utf8');await rename(tmp,this.path)}
 async upsert(scorecard:AgentScorecard,updatedAt=new Date().toISOString()):Promise<PersistedAgentScorecard>{const file=await this.read();const stored={...scorecard,updatedAt};const index=file.scorecards.findIndex(item=>item.agentId===scorecard.agentId);if(index>=0)file.scorecards[index]=stored;else file.scorecards.push(stored);await this.write(file);return stored}
 async get(agentId:string):Promise<PersistedAgentScorecard|undefined>{return(await this.read()).scorecards.find(item=>item.agentId===agentId)}
 async list():Promise<PersistedAgentScorecard[]>{return(await this.read()).scorecards.sort((a,b)=>b.score-a.score||b.samples-a.samples)}
}
