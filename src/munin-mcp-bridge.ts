import type { RuntimeCapabilityRegistry } from './runtime-capability-seam.js';

export type MuninMcpCommand = 'munin.sitrep'|'munin.build'|'munin.career.analyze'|'munin.memory.search'|'munin.linkedin.compose'|'munin.intelligence.research'|'munin.engineering.review';
export interface MuninMcpRequest { command: MuninMcpCommand; arguments?: Record<string, unknown> }
export interface MuninMcpResponse { command: MuninMcpCommand; ok: boolean; capability?: string; result?: unknown; error?: string }
export interface MuninMcpBinding { command: MuninMcpCommand; capability: string }
export type MuninMcpTaskStatus='working'|'input_required'|'completed'|'failed'|'cancelled';
export interface MuninMcpTask { id:string; command:MuninMcpCommand; status:MuninMcpTaskStatus; createdAt:string; updatedAt:string; result?:unknown; error?:string }

const DEFAULT_BINDINGS:MuninMcpBinding[]=[{command:'munin.intelligence.research',capability:'intelligence.external'},{command:'munin.engineering.review',capability:'engineering.independent-review'}];

export class MuninMcpBridge {
 private readonly bindings=new Map<MuninMcpCommand,string>();
 private readonly tasks=new Map<string,MuninMcpTask>();
 constructor(private readonly registry:RuntimeCapabilityRegistry,bindings:MuninMcpBinding[]=DEFAULT_BINDINGS){for(const binding of bindings)this.bindings.set(binding.command,binding.capability)}
 bind(command:MuninMcpCommand,capability:string):void{if(!capability.trim())throw new Error('MCP capability binding is required.');this.bindings.set(command,capability)}
 list():MuninMcpBinding[]{return[...this.bindings.entries()].map(([command,capability])=>({command,capability}))}
 async invoke(request:MuninMcpRequest):Promise<MuninMcpResponse>{const capability=this.bindings.get(request.command);if(!capability)return{command:request.command,ok:false,error:'Command is not bound to a runtime capability.'};if(!this.registry.has(capability))return{command:request.command,ok:false,capability,error:'Bound runtime capability is not registered.'};try{const execution=await this.registry.execute(capability,request.arguments??{},{source:'munin-mcp-bridge',command:request.command});return{command:request.command,ok:true,capability,result:execution.output}}catch(error){return{command:request.command,ok:false,capability,error:error instanceof Error?error.message:String(error)}}}
 async createTask(request:MuninMcpRequest):Promise<MuninMcpTask>{const now=new Date().toISOString();const id=`mcp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;const task:MuninMcpTask={id,command:request.command,status:'working',createdAt:now,updatedAt:now};this.tasks.set(id,task);const response=await this.invoke(request);const current=this.tasks.get(id)!;current.updatedAt=new Date().toISOString();current.status=response.ok?'completed':'failed';current.result=response.result;current.error=response.error;return{...current}}
 getTask(id:string):MuninMcpTask|undefined{const task=this.tasks.get(id);return task?{...task}:undefined}
 updateTask(id:string,status:Extract<MuninMcpTaskStatus,'working'|'input_required'>):MuninMcpTask{const task=this.tasks.get(id);if(!task)throw new Error('MCP task not found.');if(['completed','failed','cancelled'].includes(task.status))throw new Error('Terminal MCP task cannot be updated.');task.status=status;task.updatedAt=new Date().toISOString();return{...task}}
 cancelTask(id:string):MuninMcpTask{const task=this.tasks.get(id);if(!task)throw new Error('MCP task not found.');if(task.status==='completed'||task.status==='failed')throw new Error('Completed MCP task cannot be cancelled.');task.status='cancelled';task.updatedAt=new Date().toISOString();return{...task}}
}
