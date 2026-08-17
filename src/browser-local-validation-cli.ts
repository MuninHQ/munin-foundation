import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { runLocalBrowserValidation } from './browser-local-validation.js';

const server=http.createServer((_req,res)=>{
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
  res.end('<!doctype html><html><body><main><h1>Munin Browser Validation</h1><form><label>Name <input name="name" value="munin"></label><button type="submit">Submit</button></form><p id="marker">local-read-only-fixture</p></main></body></html>');
});

await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve());});
try{
  const address=server.address();
  if(!address||typeof address==='string')throw new Error('Unable to resolve local validation server address.');
  const targetUrl=`http://127.0.0.1:${address.port}/`;
  const report=await runLocalBrowserValidation(targetUrl);
  const outDir=path.resolve(process.env.MUNIN_DATA_DIR??'runtime-data','browser-benchmark');
  await fs.mkdir(outDir,{recursive:true});
  const file=path.join(outDir,`local-validation-${Date.now()}.json`);
  await fs.writeFile(file,JSON.stringify(report,null,2),'utf8');
  console.log(JSON.stringify({...report,reportPath:file},null,2));
  if(report.recommendation.recommended!=='playwright-cli'||!report.evidence.firstSnapshot||!report.evidence.secondSnapshot||!report.evidence.permissionGateBlocked)process.exitCode=1;
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
