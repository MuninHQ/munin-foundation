#!/usr/bin/env node
// Opt-in adapter for Munin media.content-video. No provider policy changes.
import { spawn } from 'node:child_process';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory=dirname(fileURLToPath(import.meta.url));
try {
  const chunks=[];let size=0;
  for await(const chunk of process.stdin){size+=chunk.length;if(size>32768)throw new Error('Request exceeds 32 KiB');chunks.push(chunk);}
  const request=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!request||typeof request!=='object'||Array.isArray(request))throw new Error('Request must be a JSON object');
  const output=request.outputDir||process.env.MUNIN_MONEYPRINTER_OUTPUT||join(directory,'..','data','runtime','moneyprinter-local');
  if(typeof output!=='string'||!isAbsolute(output))throw new Error('Output directory must be absolute');
  const python=process.env.MUNIN_MONEYPRINTER_PYTHON||'python';
  const narrator=process.env.MUNIN_MONEYPRINTER_NARRATOR||'windows';
  if(!['windows','none'].includes(narrator))throw new Error('Narrator must be windows or none');
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(python,[join(directory,'moneyprinter-local','cli.py'),'run','--output',output,'--narrator',narrator],
      {shell:false,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1'}});
    let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.once('error',reject);child.stdin.on('error',()=>{});
    child.once('exit',code=>code===0?resolve(stdout):reject(new Error(`Local Moneyprinter exited ${code}: ${stderr.slice(-1800)}`)));
    child.stdin.end(JSON.stringify(request));
  });
  process.stdout.write(JSON.stringify(JSON.parse(result.trim())));
} catch(error) {
  process.stderr.write(String(error?.message||error));process.exitCode=1;
}
