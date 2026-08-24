import { nextScheduledCreativeBrief, runDualAgentCreativeReview } from './dual-agent-review.js';

export async function runHostCreativeReview():Promise<string>{
  const brief=await nextScheduledCreativeBrief();
  const review=await runDualAgentCreativeReview(brief);
  return JSON.stringify({brief,review},null,2);
}
