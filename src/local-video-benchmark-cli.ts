import { performance } from 'node:perf_hooks';
import { ExecutionEngine } from './runtime.js';
import { RuntimeCapabilityAdapter } from './runtime-capability-adapter.js';

function arg(name:string){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined;}
function numberArg(name:string){const raw=arg(name);if(!raw)return undefined;const value=Number(raw);if(!Number.isFinite(value))throw new Error(`${name} must be numeric`);return value;}

async function main(){
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const health=await adapter.localVideo({action:'health'});
 const base={at:new Date().toISOString(),health:health.output,host:{platform:process.platform,arch:process.arch,node:process.version}};
 if(process.argv.includes('--health-only')){console.log(JSON.stringify(base,null,2));return;}
 if(!health.output.ready){console.log(JSON.stringify({...base,status:'BLOCKED',reason:health.output.detail},null,2));process.exitCode=2;return;}
 const prompt=arg('--prompt')??'Premium executive technology scene, restrained cinematic motion, dark graphite environment, no text or logos.';
 const request={action:'generate' as const,prompt,outputPath:arg('--output'),width:numberArg('--width'),height:numberArg('--height'),frames:numberArg('--frames'),seed:numberArg('--seed')};
 const started=performance.now();
 try{
  const result=await adapter.localVideo(request);const elapsedMs=Math.round(performance.now()-started);
  console.log(JSON.stringify({...base,status:'COMPLETED',elapsedMs,request:result.output.request,result:result.output.result},null,2));
 }catch(error){const elapsedMs=Math.round(performance.now()-started);console.log(JSON.stringify({...base,status:'FAILED',elapsedMs,error:error instanceof Error?error.message:String(error)},null,2));process.exitCode=1;}
}

main().catch(error=>{console.error(error instanceof Error?error.stack:error);process.exitCode=1;});
