import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const runner=resolve('scripts/moneyprinterturbo-runner.mjs');
function execute(input:unknown,env:NodeJS.ProcessEnv){return new Promise<{code:number|null;stdout:string;stderr:string}>((done,reject)=>{const child=spawn(process.execPath,[runner],{env:{...process.env,...env},stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.once('error',reject);child.once('exit',code=>done({code,stdout,stderr}));child.stdin.end(JSON.stringify(input));});}

test('MoneyPrinterTurbo runner maps a governed draft request to the upstream CLI',async()=>{const root=await mkdtemp(join(tmpdir(),'munin-mpt-test-'));try{const home=join(root,'MoneyPrinterTurbo'),fakeUv=join(root,'uv.mjs');await mkdir(home);await writeFile(join(home,'cli.py'),'# test fixture\n');await writeFile(join(home,'config.toml'),'upload_post_auto_upload = false\n');await writeFile(fakeUv,"console.log(JSON.stringify({succeeded:1,failed:0,tasks:[{task_id:'mpt-1',result:['draft.mp4']}]}));\n");const result=await execute({provider:'moneyprinterturbo',topic:'Governança de IA',aspectRatio:'9:16'},{MUNIN_MPT_HOME:home,MUNIN_MPT_UV:fakeUv});assert.equal(result.code,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{provider:'moneyprinterturbo',status:'draft-generated',taskId:'mpt-1',result:['draft.mp4'],humanApprovalRequired:true});}finally{await rm(root,{recursive:true,force:true})}});

test('MoneyPrinterTurbo runner refuses installations configured to auto-publish',async()=>{const root=await mkdtemp(join(tmpdir(),'munin-mpt-test-'));try{await writeFile(join(root,'cli.py'),'# test fixture\n');await writeFile(join(root,'config.toml'),'upload_post_auto_upload = true\n');const result=await execute({topic:'test'},{MUNIN_MPT_HOME:root});assert.equal(result.code,1);assert.match(result.stderr,/automatic publishing must be disabled/);}finally{await rm(root,{recursive:true,force:true})}});
