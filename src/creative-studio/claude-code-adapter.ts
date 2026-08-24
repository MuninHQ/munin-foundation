import { spawn } from 'node:child_process';
import type { CreativeAgentResult, CreativeBrief } from './types.js';

export interface ClaudeCodeAdapterOptions {
  executable?:string;
  timeoutMs?:number;
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
  const executable=options.executable??process.env.MUNIN_CLAUDE_CODE_BIN??'claude';
  const timeoutMs=options.timeoutMs??120_000;
  return await new Promise(resolve=>{
    let settled=false;
    let stdout='';
    let stderr='';
    const finish=(result:CreativeAgentResult)=>{if(settled)return;settled=true;resolve(result);};
    const child=spawn(executable,['-p','--output-format','text'],{
      cwd:process.cwd(),
      env:{...process.env},
      windowsHide:true,
      shell:process.platform==='win32',
      stdio:['pipe','pipe','pipe'],
    });
    const timer=setTimeout(()=>{
      child.kill();
      finish({agent:'claude-code',status:'error',error:`Claude Code timed out after ${timeoutMs}ms`,durationMs:Date.now()-started});
    },timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data',(chunk:string)=>{stdout+=chunk;});
    child.stderr.on('data',(chunk:string)=>{stderr+=chunk;});
    child.on('error',error=>{
      clearTimeout(timer);
      const unavailable=(error as NodeJS.ErrnoException).code==='ENOENT';
      finish({agent:'claude-code',status:unavailable?'unavailable':'error',error:error.message,durationMs:Date.now()-started});
    });
    child.on('close',code=>{
      clearTimeout(timer);
      if(code===0&&stdout.trim())finish({agent:'claude-code',status:'ok',output:stdout.trim(),durationMs:Date.now()-started});
      else finish({agent:'claude-code',status:code===127?'unavailable':'error',error:stderr.trim()||`Claude Code exited with code ${code}`,durationMs:Date.now()-started});
    });
    child.stdin.end(buildClaudeCreativePrompt(brief));
  });
}
