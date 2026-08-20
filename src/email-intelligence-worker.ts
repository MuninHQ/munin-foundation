import { syncCareerInbox } from './email-providers.js';
import { refreshEmailIntelligence } from './email-intelligence.js';

export interface EmailWorkerOptions { intervalMs?: number; maxBackoffMs?: number }

export class EmailIntelligenceWorker {
  private stopping=false;
  constructor(private readonly options:EmailWorkerOptions={}){}
  stop(){this.stopping=true}
  async runOnce(){const sync=await syncCareerInbox();const intelligence=await refreshEmailIntelligence();return{sync,intelligence}}
  async runLoop(onEvent:(event:unknown)=>void=()=>{}):Promise<void>{
    const interval=Math.max(5*60_000,Math.min(60*60_000,this.options.intervalMs??15*60_000));
    const maxBackoff=Math.max(interval,Math.min(6*60*60_000,this.options.maxBackoffMs??60*60_000));
    let backoff=interval;
    while(!this.stopping){
      try{const result=await this.runOnce();onEvent({status:'ok',at:new Date().toISOString(),...result});backoff=interval}
      catch(error){onEvent({status:'error',at:new Date().toISOString(),summary:error instanceof Error?error.message:String(error)});backoff=Math.min(maxBackoff,backoff*2)}
      if(!this.stopping)await new Promise(resolve=>setTimeout(resolve,backoff));
    }
  }
}
