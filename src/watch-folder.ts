import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './config.js';
import { writeJsonAtomic } from './storage.js';
import { captureCareerMessage } from './career-capture.js';

export interface WatchFolderConfig { folder?: string; enabled: boolean; intervalMs: number; }
export interface WatchFolderLog { at: string; file: string; status: 'imported'|'duplicate'|'ignored'|'error'; detail?: string; }
interface WatchFolderState { config: WatchFolderConfig; processed: Record<string,string>; log: WatchFolderLog[]; lastScanAt?: string; }

const DEFAULT_STATE: WatchFolderState = { config: { enabled: false, intervalMs: 5000 }, processed: {}, log: [] };

export class CareerWatchFolder {
  private timer?: NodeJS.Timeout;
  private scanning = false;
  constructor(private readonly root = dataDir()) {}
  private file(){ return path.join(this.root,'career-watch-folder.json'); }
  async load():Promise<WatchFolderState>{ await mkdir(this.root,{recursive:true}); try { const parsed=JSON.parse(await readFile(this.file(),'utf8')) as WatchFolderState; return {...DEFAULT_STATE,...parsed,config:{...DEFAULT_STATE.config,...parsed.config},processed:parsed.processed??{},log:parsed.log??[]}; } catch { return structuredClone(DEFAULT_STATE); } }
  private async save(state:WatchFolderState){ await writeJsonAtomic(this.file(),state); }
  async status(){ const state=await this.load(); return {config:state.config,lastScanAt:state.lastScanAt,recent:state.log.slice(-20).reverse()}; }
  async configure(folder:string|undefined,enabled:boolean){ const state=await this.load(); if(folder){ const resolved=path.resolve(folder); const info=await stat(resolved); if(!info.isDirectory()) throw new Error('Watch folder must be a directory'); state.config.folder=resolved; } state.config.enabled=enabled; await this.save(state); this.restart(state.config); if(enabled) void this.scan(); return this.status(); }
  start(){ void this.load().then(state=>this.restart(state.config)); }
  stop(){ if(this.timer) clearInterval(this.timer); this.timer=undefined; }
  private restart(config:WatchFolderConfig){ this.stop(); if(config.enabled&&config.folder){ this.timer=setInterval(()=>void this.scan(),Math.max(2000,config.intervalMs)); this.timer.unref?.(); } }
  async scan(){ if(this.scanning) return {added:0,duplicates:0,errors:0}; this.scanning=true; try { const state=await this.load(); const folder=state.config.folder; if(!state.config.enabled||!folder) return {added:0,duplicates:0,errors:0}; const entries=await readdir(folder,{withFileTypes:true}); let added=0,duplicates=0,errors=0; for(const entry of entries){ if(!entry.isFile()) continue; const ext=path.extname(entry.name).toLowerCase(); if(!['.eml','.txt','.msg'].includes(ext)) continue; const full=path.join(folder,entry.name); try { const info=await stat(full); if(info.size>5_000_000){ this.pushLog(state,{at:new Date().toISOString(),file:entry.name,status:'ignored',detail:'larger than 5 MB'}); continue; } const fingerprint=`${info.size}:${info.mtimeMs}`; if(state.processed[full]===fingerprint) continue; if(ext==='.msg'){ this.pushLog(state,{at:new Date().toISOString(),file:entry.name,status:'ignored',detail:'save .msg as .eml'}); state.processed[full]=fingerprint; continue; } const content=await readFile(full,'utf8'); const result=await captureCareerMessage({format:ext==='.eml'?'eml':'txt',filename:entry.name,content}); state.processed[full]=fingerprint; if(result.added){added++;this.pushLog(state,{at:new Date().toISOString(),file:entry.name,status:'imported'});}else{duplicates++;this.pushLog(state,{at:new Date().toISOString(),file:entry.name,status:'duplicate'});} } catch(error){errors++;this.pushLog(state,{at:new Date().toISOString(),file:entry.name,status:'error',detail:error instanceof Error?error.message:String(error)});} } state.lastScanAt=new Date().toISOString(); await this.save(state); return {added,duplicates,errors}; } finally { this.scanning=false; } }
  private pushLog(state:WatchFolderState,item:WatchFolderLog){ state.log.push(item); if(state.log.length>200) state.log=state.log.slice(-200); }
}
