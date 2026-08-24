import { readFile } from 'node:fs/promises';
import { creativeBriefFromPost, nextScheduledCreativeBrief, runDualAgentCreativeReview } from './creative-studio/dual-agent-review.js';

function arg(name:string){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined;}

async function main(){
  const postId=arg('--post');
  const chatGptPath=arg('--chatgpt');
  const chatGptCandidate=chatGptPath?await readFile(chatGptPath,'utf8'):undefined;
  const brief=postId?await creativeBriefFromPost(postId):await nextScheduledCreativeBrief();
  const review=await runDualAgentCreativeReview(brief,{chatGptCandidate});
  process.stdout.write(JSON.stringify({brief,review},null,2)+'\n');
  if(review.claude.status!=='ok')process.exitCode=2;
}

main().catch(error=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
