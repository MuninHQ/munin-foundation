import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createContentVideoCapability } from '../src/content-video-capability.js';

const runner = resolve('scripts/moneyprinter-local-runner.mjs');
const python = process.env.MUNIN_MONEYPRINTER_PYTHON || 'python';
function run(command:string, args:string[]) {
  return new Promise<{code:number|null;stdout:string;stderr:string}>((done,reject)=>{
    const child=spawn(command,args,{shell:false,windowsHide:true});let stdout='',stderr='';
    child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
    child.once('error',reject);child.once('exit',code=>done({code,stdout,stderr}));
  });
}

test('local Moneyprinter durable state and safety contracts', async t=>{
  const available=await run(python,['--version']).catch(()=>null);
  if(!available||available.code!==0){t.skip('Optional local Python runtime is not installed');return;}
  const result=await run(python,['scripts/moneyprinter-local/test_pipeline.py']);
  assert.equal(result.code,0,result.stderr);
});

test('local Moneyprinter generates a real CPU draft through the existing Munin capability', async t=>{
  await assert.doesNotReject(access(runner),'local runner is not implemented');
  if(process.platform!=='win32'){t.skip('Windows offline renderer is optional');return;}
  for(const [command,args] of [[python,['--version']],['ffmpeg',['-version']],['ffprobe',['-version']]] as const){
    const available=await run(command,[...args]).catch(()=>null);
    if(!available||available.code!==0){t.skip(`Optional local dependency unavailable: ${command}`);return;}
  }
  const output=await mkdtemp(join(tmpdir(),'munin-moneyprinter-test-'));
  const keys=['MUNIN_CONTENT_VIDEO_ENABLED','MUNIN_CONTENT_VIDEO_RUNNER','MUNIN_MONEYPRINTER_NARRATOR'];
  const before=keys.map(k=>process.env[k]);
  try {
    process.env.MUNIN_CONTENT_VIDEO_ENABLED='1';process.env.MUNIN_CONTENT_VIDEO_RUNNER=runner;
    process.env.MUNIN_MONEYPRINTER_NARRATOR='none';
    const input={action:'generate' as const,provider:'custom' as const,topic:'Teste local',script:'Uma ideia vira um pequeno teste.',outputDir:output};
    const result=await createContentVideoCapability().execute(input,{capability:'media.content-video',executionId:'local-test',startedAt:new Date().toISOString(),input,metadata:{}});
    const draft=result.result as {path:string;status:string;humanApprovalRequired:boolean;apiCost:number;durationSeconds:number;runDir:string};
    assert.equal(draft.status,'draft-generated');assert.equal(draft.humanApprovalRequired,true);assert.equal(draft.apiCost,0);
    assert.ok(draft.durationSeconds>=4);
    const header=await readFile(draft.path);assert.equal(header.subarray(4,8).toString(),'ftyp');
    const resume=await run(python,['scripts/moneyprinter-local/cli.py','work','--run',draft.runDir]);
    assert.equal(resume.code,0,resume.stderr);assert.equal(JSON.parse(resume.stdout).completedThisRun,0);
  } finally {
    keys.forEach((key,i)=>before[i]===undefined?delete process.env[key]:process.env[key]=before[i]);
    await rm(output,{recursive:true,force:true});
  }
});
