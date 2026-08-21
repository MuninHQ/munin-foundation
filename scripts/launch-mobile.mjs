import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces, platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import net from 'node:net';

const API_PORT=Number(process.env.MUNIN_API_PORT??4310);
const WEB_PORT=Number(process.env.MUNIN_WEB_PORT??5173);
const NPM_COMMAND=process.env.MUNIN_NPM_COMMAND??'npm';
const skipBuild=process.env.MUNIN_MOBILE_SKIP_BUILD==='1';
const skipWeb=process.env.MUNIN_MOBILE_SKIP_WEB==='1';
const skipTailscale=process.env.MUNIN_MOBILE_SKIP_TAILSCALE==='1';
const skipLanAddresses=process.env.MUNIN_MOBILE_SKIP_LAN_ADDRESSES==='1';
const tokenFile=resolve(process.cwd(),'data/runtime/mobile-token.txt');
const WEB_SERVER_ENTRY=resolve(process.cwd(),'scripts/mobile-web-server.mjs');
const children=[];
let apiRecovery;
let apiMonitor;
let webRecovery;
let webMonitor;

function persistentToken(){if(process.env.MUNIN_MOBILE_TOKEN?.trim())return process.env.MUNIN_MOBILE_TOKEN.trim();if(existsSync(tokenFile)){const value=readFileSync(tokenFile,'utf8').trim();if(value)return value;}mkdirSync(dirname(tokenFile),{recursive:true});const token=randomBytes(24).toString('base64url');writeFileSync(tokenFile,token+'\n',{encoding:'utf8',mode:0o600});return token;}
const token=persistentToken();
const env={...process.env,MUNIN_MOBILE_TOKEN:token,MUNIN_API_HOST:'127.0.0.1'};
function run(command,args,label){const child=spawn(command,args,{stdio:'inherit',shell:platform()==='win32',env});children.push(child);child.on('exit',code=>{if(code&&code!==0)console.error(`[Munin Mobile] ${label} exited with ${code}`)});return child;}
function runDone(command,args,label){return new Promise((ok,fail)=>{const child=spawn(command,args,{stdio:'inherit',shell:platform()==='win32',env});child.on('exit',code=>code===0?ok():fail(new Error(`${label} failed with ${code}`)));child.on('error',fail);});}
function portOpen(port){return new Promise(resolve=>{const socket=net.createConnection({port,host:'127.0.0.1'});const done=value=>{socket.destroy();resolve(value)};socket.setTimeout(500);socket.once('connect',()=>done(true));socket.once('timeout',()=>done(false));socket.once('error',()=>done(false));});}
async function waitFor(port,timeout=20000){const start=Date.now();while(Date.now()-start<timeout){if(await portOpen(port))return true;await new Promise(r=>setTimeout(r,250));}return false;}
function localAddresses(){return Object.values(networkInterfaces()).flat().filter(Boolean).filter(item=>item.family==='IPv4'&&!item.internal).map(item=>item.address);}
function tailscaleAvailable(){return spawnSync('tailscale',['version'],{stdio:'ignore',shell:platform()==='win32'}).status===0;}
function tailscaleDns(){const result=spawnSync('tailscale',['status','--json'],{encoding:'utf8',shell:platform()==='win32'});if(result.status!==0)return undefined;try{const data=JSON.parse(result.stdout);return typeof data.Self?.DNSName==='string'?data.Self.DNSName.replace(/\.$/,''):undefined}catch{return undefined}}
function configureServe(){const result=spawnSync('tailscale',['serve','--bg',String(WEB_PORT)],{encoding:'utf8',shell:platform()==='win32'});if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);return result.status===0;}
async function mobileRouteHealthy(){try{const response=await fetch(`http://127.0.0.1:${API_PORT}/api/mobile/career`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(2500)});return response.status===200;}catch{return false;}}
async function webRouteHealthy(){try{const response=await fetch(`http://127.0.0.1:${WEB_PORT}/mobile.html`,{cache:'no-store',signal:AbortSignal.timeout(2500)});if(response.status!==200)return false;return (await response.text()).includes('mobile-release-guard.js?v=6');}catch{return false;}}
function killPort(port){
  if(platform()!=='win32')return false;
  const script=`$connection=Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if(-not $connection){exit 1}; $pidToKill=$connection.OwningProcess; if(-not $pidToKill){exit 1}; Stop-Process -Id $pidToKill -Force -ErrorAction Stop; Start-Sleep -Milliseconds 250; exit 0`;
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',shell:false});
  if(result.status!==0){if(result.stderr)process.stderr.write(result.stderr);return false;}
  return true;
}
async function ensureApi(){if(await portOpen(API_PORT)){if(await mobileRouteHealthy()){console.log('[Munin Mobile] Reusing compatible API runtime.');return;}console.log('[Munin Mobile] Stale/incompatible API detected; restarting runtime…');if(!killPort(API_PORT))throw new Error(`Port ${API_PORT} is occupied by an incompatible API. Stop that process and retry.`);await new Promise(r=>setTimeout(r,700));if(await portOpen(API_PORT))throw new Error(`Port ${API_PORT} is still occupied after restart attempt.`);}const child=run(process.execPath,['dist/src/server.js'],'API');console.log(`[Munin Mobile] API started (PID ${child.pid}).`);if(!(await waitFor(API_PORT)))throw new Error('Munin API did not start.');if(!(await mobileRouteHealthy()))throw new Error('Munin API started but /api/mobile/career is unavailable.');}
async function ensureWeb(){if(await portOpen(WEB_PORT)){if(await webRouteHealthy()){console.log('[Munin Mobile] Reusing compatible web runtime.');return;}console.log('[Munin Mobile] Stale/incompatible web runtime detected; restarting…');if(!killPort(WEB_PORT))throw new Error(`Port ${WEB_PORT} is occupied by an incompatible web runtime. Stop that process and retry.`);await new Promise(r=>setTimeout(r,700));if(await portOpen(WEB_PORT))throw new Error(`Port ${WEB_PORT} is still occupied after web restart attempt.`);}const child=run(process.execPath,[WEB_SERVER_ENTRY],'mobile web');console.log(`[Munin Mobile] Web started (PID ${child.pid}).`);if(!(await waitFor(WEB_PORT)))throw new Error('Munin web did not start.');if(!(await webRouteHealthy()))throw new Error('Munin web started but mobile.html is unavailable or stale.');}
async function recoverApi(){if(apiRecovery)return apiRecovery;apiRecovery=ensureApi().catch(error=>{console.error('[Munin Mobile] API recovery failed:',error instanceof Error?error.message:error)}).finally(()=>{apiRecovery=undefined});return apiRecovery;}
function monitorApi(){if(apiMonitor)return;apiMonitor=setInterval(()=>{void (async()=>{if(apiRecovery)return;if(!(await mobileRouteHealthy())){console.warn('[Munin Mobile] API unavailable; recovering automatically…');await recoverApi();}})()},3000);}
async function recoverWeb(){if(webRecovery)return webRecovery;webRecovery=ensureWeb().catch(error=>{console.error('[Munin Mobile] Web recovery failed:',error instanceof Error?error.message:error)}).finally(()=>{webRecovery=undefined});return webRecovery;}
function monitorWeb(){if(webMonitor)return;webMonitor=setInterval(()=>{void (async()=>{if(webRecovery)return;if(!(await webRouteHealthy())){console.warn('[Munin Mobile] Web unavailable; recovering automatically…');await recoverWeb();}})()},3000);}
async function main(){console.log('[Munin Mobile] Building runtime and mobile web…');if(!skipBuild)await runDone(NPM_COMMAND,['run','build'],'runtime build');await ensureApi();monitorApi();if(!skipWeb){await ensureWeb();monitorWeb();}console.log('\n=== MUNIN MOBILE READY ===');console.log(`Token: ${token}`);console.log('Salve este token no primeiro acesso; ele permanece estável neste PC.');if(!skipTailscale&&tailscaleAvailable()){const served=configureServe();const dns=tailscaleDns();if(served&&dns)console.log(`iPhone (Tailscale HTTPS): https://${dns}/mobile.html`);else console.log('Tailscale está instalado, mas Serve requer configuração/consentimento. Rode: tailscale serve --bg '+WEB_PORT);}if(!skipWeb){if(!skipLanAddresses)for(const address of localAddresses())console.log(`LAN: http://${address}:${WEB_PORT}/mobile.html`);console.log('Acesso via Tailscale Serve é preferível: privado no tailnet e HTTPS.');}console.log('[Munin Mobile] Guardian active. Keep this window open.');await new Promise(()=>{});}
function shutdown(){if(apiMonitor)clearInterval(apiMonitor);if(webMonitor)clearInterval(webMonitor);for(const child of children)if(!child.killed)child.kill('SIGTERM');process.exit(0)}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);main().catch(error=>{console.error('[Munin Mobile]',error instanceof Error?error.message:error);process.exitCode=1});
