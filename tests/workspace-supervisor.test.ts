import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LocalHostAdapter } from '../src/local-host-adapter.js';

test('restart writes only a typed request when supervisor heartbeat is healthy',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-supervisor-'));try{
  const state=path.join(dir,'workspace-supervisor.json');const request=path.join(dir,'workspace-restart-request.json');
  await writeFile(state,JSON.stringify({status:'running',pid:123,heartbeatAt:new Date().toISOString()}));
  const adapter=new LocalHostAdapter({supervisorStatePath:state,restartRequestPath:request});
  const result=await adapter.restartMunin();
  const parsed=JSON.parse(await readFile(request,'utf8')) as {kind:string;id:string;supervisorPid:number};
  assert.equal(parsed.kind,'restart-munin');assert.equal(parsed.supervisorPid,123);assert.match(result,/Controlled Munin restart requested/);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('restart fails closed for stale or missing supervisor',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-supervisor-stale-'));try{
  const state=path.join(dir,'workspace-supervisor.json');const request=path.join(dir,'workspace-restart-request.json');
  const adapter=new LocalHostAdapter({supervisorStatePath:state,restartRequestPath:request});
  await assert.rejects(()=>adapter.restartMunin(),/supervisor is unavailable/i);
  await writeFile(state,JSON.stringify({status:'running',pid:123,heartbeatAt:new Date(Date.now()-60000).toISOString()}));
  await assert.rejects(()=>adapter.restartMunin(),/heartbeat is stale/i);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('supervisor and launcher avoid arbitrary process killing and shell restart',async()=>{
 const supervisor=await readFile(new URL('../../scripts/workspace-supervisor.mjs',import.meta.url),'utf8');
 const launcher=await readFile(new URL('../../scripts/launch.mjs',import.meta.url),'utf8');
 assert.match(supervisor,/shell: false/);assert.match(supervisor,/restartExitCode = 75/);assert.match(launcher,/MUNIN_SUPERVISED/);assert.match(launcher,/workspace-restart-request\.json/);
 assert.doesNotMatch(supervisor,/taskkill|Stop-Process|exec\(/i);assert.doesNotMatch(launcher,/taskkill|Stop-Process/i);
});

test('package exposes reversible workspace supervisor startup commands',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8')) as {scripts:Record<string,string>};
 assert.match(pkg.scripts['workspace:supervisor'],/workspace-supervisor\.mjs/);
 assert.match(pkg.scripts['workspace:supervisor:startup:install'],/install-workspace-supervisor-startup\.ps1/);
 assert.match(pkg.scripts['workspace:supervisor:startup:remove'],/remove-workspace-supervisor-startup\.ps1/);
});
