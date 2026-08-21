import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces, platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import net from 'node:net';

const API_PORT=Number(process.env.MUNIN_API_PORT??4310);
const WEB_PORT=Number(process.env.MUNIN_WEB_PORT??5173);
const tokenFile=resolve(process.cwd(),'data/runtime/mobile-token.txt');
const children=[];

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
function killPort(port){
  if(platform()!=='win32')return false;
  const script=`$connection=Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if(-not $connection){exit 1}; $pidToKill=$connection.OwningProcess; if(-not $pidToKill){exit 1}; Stop-Process -Id $pidToKill -Force -ErrorAction Stop; Start-Sleep -Milliseconds 250; exit 0`;
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',shell:false});
  if(result.status!==0){if(result.stderr)process.stderr.write(result.stderr);return false;}
  return true;
}
async function ensureApi(){if(await portOpen(API_PORT)){if(await mobileRouteHealthy()){console.log('[Munin Mobile] Reusing compatible API runtime.');return;}console.log('[Munin Mobile] Stale/incompatible API detected; restarting runtime…');if(!killPort(API_PORT))throw new Error(`Port ${API_PORT} is occupied by an incompatible API. Stop that process and retry.`);await new Promise(r=>setTimeout(r,700));if(await portOpen(API_PORT))throw new Error(`Port ${API_PORT} is still occupied after restart attempt.`);}run('node',['dist/src/server.js'],'API');if(!(await waitFor(API_PORT)))throw new Error('Munin API did not start.');if(!(await mobileRouteHealthy()))throw new Error('Munin API started but /api/mobile/career is unavailable.');}
async function main(){console.log('[Munin Mobile] Building runtime and mobile web…');await runDone('npm',['run','build:core'],'core build');await ensureApi();if(!(await portOpen(WEB_PORT)))run('npm',['run','web','--','--host','0.0.0.0','--port',String(WEB_PORT),'--strictPort'],'mobile web');if(!(await waitFor(WEB_PORT)))throw new Error('Munin web did not start.');console.log('\n=== MUNIN MOBILE READY ===');console.log(`Token: ${token}`);console.log('Salve este token no primeiro acesso; ele permanece estável neste PC.');if(tailscaleAvailable()){const served=configureServe();const dns=tailscaleDns();if(served&&dns)console.log(`iPhone (Tailscale HTTPS): https://${dns}/mobile.html`);else console.log('Tailscale está instalado, mas Serve requer configuração/consentimento. Rode: tailscale serve --bg '+WEB_PORT);}for(const address of localAddresses())console.log(`LAN: http://${address}:${WEB_PORT}/mobile.html`);console.log('Acesso via Tailscale Serve é preferível: privado no tailnet e HTTPS.');}
function shutdown(){for(const child of children)if(!child.killed)child.kill('SIGTERM');process.exit(0)}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);main().catch(error=>{console.error('[Munin Mobile]',error instanceof Error?error.message:error);process.exitCode=1});
