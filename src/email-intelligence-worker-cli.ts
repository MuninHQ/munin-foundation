import { EmailIntelligenceWorker } from './email-intelligence-worker.js';

const once=process.argv.includes('--once');
const intervalArg=process.argv.find(arg=>arg.startsWith('--interval='));
const requested=intervalArg?Number(intervalArg.split('=')[1]):undefined;
const worker=new EmailIntelligenceWorker({intervalMs:Number.isFinite(requested)?requested:undefined});
process.on('SIGINT',()=>worker.stop());process.on('SIGTERM',()=>worker.stop());

async function main(){
  if(once){const result=await worker.runOnce();process.stdout.write(JSON.stringify({mode:'once',...result})+'\n');return}
  process.stdout.write(JSON.stringify({mode:'continuous',intervalMs:requested??900000})+'\n');
  await worker.runLoop(event=>process.stdout.write(JSON.stringify(event)+'\n'));
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'failed',summary:error instanceof Error?error.message:String(error)})+'\n');process.exitCode=1});
