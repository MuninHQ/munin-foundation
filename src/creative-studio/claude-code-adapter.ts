import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CreativeAgentResult, CreativeBrief } from './types.js';

const execFileAsync=promisify(execFile);

export interface ClaudeCodeAdapterOptions {
  executable?:string;
  timeoutMs?:number;
  cwd?:string;
}

function formatBrief(brief:CreativeBrief){
  return [
    'You are the Claude creative reviewer inside Munin Creative Studio.',
    'Return a concise creative proposal and critique. Do not publish, schedule, or modify external systems.',
    '',
    `TITLE: ${brief.title}`,
    `OBJECTIVE: ${brief.objective}`,
    `AUDIENCE: ${brief.audience.join(', ')}`,
    `THEMES: ${brief.themes.join(', ')}`,
    `VISUAL CONCEPT: ${brief.visualConcept}`,
    `CURRENT IMAGE PROMPT: ${brief.imagePrompt}`,
    '',
    'CONSTRAINTS:',
    ...brief.constraints.map(value=>`- ${value}`),
    '',
    'EVALUATION CRITERIA:',
    ...brief.evaluationCriteria.map(value=>`- ${value}`),
    '',
    'POST BODY:',
    brief.postBody,
    '',
    'Respond with these headings: PROPOSAL, WHAT_TO_KEEP, WHAT_TO_IMPROVE, FINAL_IMAGE_PROMPT, SCORE_0_100.',
  ].join('\n');
}

export function buildClaudeCreativePrompt(brief:CreativeBrief){return formatBrief(brief);}

export async function runClaudeCodeCreativeReview(brief:CreativeBrief,options:ClaudeCodeAdapterOptions={}):Promise<CreativeAgentResult>{
  const started=Date.now();
  const executable=options.executable??process.env.MUNIN_CLAUDE_CODE_BIN?.trim()??'claude';
  const timeoutMs=Math.max(5_000,Math.min(300_000,options.timeoutMs??120_000));
  try{
    const prompt=buildClaudeCreativePrompt(brief);
    const {stdout,stderr}=await execFileAsync(executable,['-p',prompt,'--output-format','text'],{
      cwd:options.cwd??process.cwd(),
      env:{...process.env},
      windowsHide:true,
      shell:false,
      timeout:timeoutMs,
      maxBuffer:4*1024*1024,
    });
    const output=String(stdout??'').trim();
    if(!output)throw new Error(String(stderr??'').trim()||'Claude Code returned no output.');
    return {agent:'claude-code',status:'ok',output,durationMs:Date.now()-started};
  }catch(error){
    const failure=error as NodeJS.ErrnoException & {killed?:boolean;signal?:string};
    const unavailable=failure.code==='ENOENT';
    const timedOut=failure.killed===true||failure.signal==='SIGTERM';
    return {
      agent:'claude-code',
      status:unavailable?'unavailable':'error',
      error:timedOut?`Claude Code timed out after ${timeoutMs}ms`:(failure.message||String(error)),
      durationMs:Date.now()-started,
    };
  }
}
