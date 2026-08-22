import { runEditorialAutomation } from './linkedin-editorial-automation.js';

function numberEnv(name:string){const value=Number(process.env[name]);return Number.isFinite(value)?value:undefined;}
async function main(){
  const result=await runEditorialAutomation({generateImage:process.env.MUNIN_LINKEDIN_AUTO_IMAGE!=='0',refreshSources:true,policy:{minAdaptiveScore:numberEnv('MUNIN_LINKEDIN_MIN_ADAPTIVE'),minNovelty:numberEnv('MUNIN_LINKEDIN_MIN_NOVELTY'),minBrandScore:numberEnv('MUNIN_LINKEDIN_MIN_BRAND'),maxDraftsPerWeek:numberEnv('MUNIN_LINKEDIN_MAX_DRAFTS_WEEK'),maxPendingDrafts:numberEnv('MUNIN_LINKEDIN_MAX_PENDING')}});
  process.stdout.write(JSON.stringify(result)+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'failed',summary:error instanceof Error?error.message:String(error)})+'\n');process.exitCode=1});
