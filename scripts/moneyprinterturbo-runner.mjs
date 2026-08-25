#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join } from 'node:path';
import { tmpdir } from 'node:os';

const readStdin=async()=>{const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);return Buffer.concat(chunks).toString('utf8')};
const fail=message=>{throw new Error(message)};

async function assertSafeInstallation(home){
  if(!home||!isAbsolute(home))fail('MUNIN_MPT_HOME must be an absolute MoneyPrinterTurbo directory');
  await stat(join(home,'cli.py')).catch(()=>fail('MoneyPrinterTurbo cli.py was not found under MUNIN_MPT_HOME'));
  const configPath=join(home,'config.toml');
  const config=await readFile(configPath,'utf8').catch(()=> '');
  if(/^\s*upload_post_auto_upload\s*=\s*true\s*(?:#.*)?$/mi.test(config))fail('MoneyPrinterTurbo automatic publishing must be disabled before Munin can generate a draft');
}

function run(command,args,options){return new Promise((resolve,reject)=>{const child=spawn(command,args,{...options,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',reject);child.once('exit',code=>code===0?resolve({stdout,stderr}):reject(new Error(`MoneyPrinterTurbo exited ${code}: ${stderr.trim().slice(-1200)}`)));});}

function lastJson(text){for(const line of text.trim().split(/\r?\n/).reverse()){try{return JSON.parse(line)}catch{}}fail('MoneyPrinterTurbo did not return its JSON task summary')}

let temp;
try{
  const request=JSON.parse(await readStdin());
  if(request.provider&&request.provider!=='moneyprinterturbo')fail(`Unsupported provider: ${request.provider}`);
  if(!request.topic?.trim())fail('topic is required');
  const home=process.env.MUNIN_MPT_HOME?.trim();
  await assertSafeInstallation(home);
  temp=await mkdtemp(join(tmpdir(),'munin-mpt-'));
  const manifestPath=join(temp,'task.json');
  const task={video_subject:request.topic.trim(),video_aspect:request.aspectRatio??'9:16'};
  if(request.script?.trim())task.video_script=request.script.trim();
  await writeFile(manifestPath,JSON.stringify([task]),'utf8');
  const uv=process.env.MUNIN_MPT_UV?.trim()||'uv';
  const args=['run','python','cli.py','--batch-file',manifestPath,'--stop-at','video'];
  const nodeScript=extname(uv).toLowerCase()==='.mjs';
  const {stdout}=await run(nodeScript?process.execPath:uv,nodeScript?[uv,...args]:args,{cwd:home,env:{...process.env,PYTHONUTF8:'1'}});
  const summary=lastJson(stdout);
  if(summary.succeeded!==1||summary.failed)fail(summary.tasks?.[0]?.error||'MoneyPrinterTurbo did not complete the draft');
  const taskResult=summary.tasks?.[0]??{};
  process.stdout.write(JSON.stringify({provider:'moneyprinterturbo',status:'draft-generated',taskId:taskResult.task_id,result:taskResult.result,humanApprovalRequired:true}));
}catch(error){process.stderr.write(String(error?.message||error));process.exitCode=1}finally{if(temp)await rm(temp,{recursive:true,force:true})}
