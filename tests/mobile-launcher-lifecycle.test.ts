import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {resolve} from 'node:path';
import test from 'node:test';

const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){const server=net.createServer();await new Promise<void>((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const port=address.port;await new Promise<void>(resolve=>server.close(()=>resolve()));return port}
async function waitUntil(check:()=>Promise<boolean>,timeout=15000){const started=Date.now();while(Date.now()-started<timeout){if(await check())return;await delay(200)}throw new Error('condition did not become true')}
test('mobile launcher remains resident and recovers its API and web children', {timeout:45000}, async()=>{
  const apiPort=await freePort();
  const webPort=await freePort();
  const launcher=spawn(process.execPath,['scripts/launch-mobile.mjs'],{cwd:process.cwd(),env:{...process.env,MUNIN_API_PORT:String(apiPort),MUNIN_WEB_PORT:String(webPort),MUNIN_MOBILE_TOKEN:'lifecycle-test-token',MUNIN_MOBILE_SKIP_BUILD:'1',MUNIN_MOBILE_SKIP_TAILSCALE:'1',MUNIN_MOBILE_SKIP_LAN_ADDRESSES:'1',MUNIN_MOBILE_SKIP_EMAIL_SYNC:'1',MUNIN_MOBILE_WEB_ROOT:resolve(process.cwd(),'dist-web')},stdio:['ignore','pipe','pipe']});
  let output='';launcher.stdout.on('data',chunk=>{output+=String(chunk)});launcher.stderr.on('data',chunk=>{output+=String(chunk)});
  try{
    await waitUntil(async()=>output.includes('Guardian active')).catch(error=>{throw new Error(`${error instanceof Error?error.message:error}\n${output.slice(-4000)}`)});
    assert.equal(launcher.exitCode,null,'launcher exited after reporting ready');
    const healthy=await fetch(`http://127.0.0.1:${apiPort}/api/mobile/career`,{headers:{Authorization:'Bearer lifecycle-test-token'}});
    assert.equal(healthy.status,200);
    const web=await fetch(`http://127.0.0.1:${webPort}/mobile.html`);assert.equal(web.status,200);assert.match(await web.text(),/mobile-release-guard\.js\?v=6/);
    const firstApiPid=Number(output.match(/API started \(PID (\d+)\)/)?.[1]);assert.ok(firstApiPid);
    process.kill(firstApiPid,'SIGTERM');
    await waitUntil(async()=>{try{const pids=[...output.matchAll(/API started \(PID (\d+)\)/g)].map(match=>Number(match[1]));if(!pids.some(pid=>pid!==firstApiPid))return false;const response=await fetch(`http://127.0.0.1:${apiPort}/api/mobile/career`,{headers:{Authorization:'Bearer lifecycle-test-token'}});return response.status===200}catch{return false}},20000);
    assert.equal(launcher.exitCode,null,'launcher exited while recovering the API');
    const firstWebPid=Number(output.match(/Web started \(PID (\d+)\)/)?.[1]);assert.ok(firstWebPid);
    process.kill(firstWebPid,'SIGTERM');
    await waitUntil(async()=>{try{const pids=[...output.matchAll(/Web started \(PID (\d+)\)/g)].map(match=>Number(match[1]));if(!pids.some(pid=>pid!==firstWebPid))return false;const response=await fetch(`http://127.0.0.1:${webPort}/mobile.html`);return response.status===200&&(await response.text()).includes('mobile-release-guard.js?v=6')}catch{return false}},20000);
    assert.equal(launcher.exitCode,null,'launcher exited while recovering the web runtime');
  }finally{launcher.kill('SIGTERM')}
});
