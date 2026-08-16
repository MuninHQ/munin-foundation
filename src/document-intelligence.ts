import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const execFileAsync=promisify(execFile);

export type DocumentChunk={id:string;index:number;text:string;source:string;sourceHash:string;heading?:string};
export type DocumentManifest={version:1;source:string;sourceHash:string;sourceBytes:number;sourceModifiedAt:string;ingestedAt:string;engine:'docling'|'native-fallback';artifacts:{markdown?:string;json?:string;chunks?:string};chunkCount:number;warnings:string[]};
export type DocumentIngestResult={
  source:string;
  engine:'docling'|'native-fallback';
  outputDir:string;
  markdown?:string;
  json?:unknown;
  chunks:DocumentChunk[];
  manifest:DocumentManifest;
  warnings:string[];
};

type Deps={execFileImpl?:typeof execFileAsync};

async function exists(file:string){try{await fs.access(file);return true}catch{return false}}
async function findDocling(execFileImpl:typeof execFileAsync){
  const locator=process.platform==='win32'?'where.exe':'which';
  try{const result=await execFileImpl(locator,['docling'],{timeout:5000,windowsHide:true});return String(result.stdout??'').split(/\r?\n/).map(x=>x.trim()).find(Boolean)}catch{return undefined}
}
function outputStem(source:string){const base=path.basename(source).replace(/\.[^.]+$/,'');return base||'document'}
async function sha256(file:string){const data=await fs.readFile(file);return createHash('sha256').update(data).digest('hex')}
function splitChunks(markdown:string,source:string,sourceHash:string,maxChars=1800){
  const chunks:DocumentChunk[]=[];let heading:string|undefined;let buffer='';
  const flush=()=>{const text=buffer.trim();if(!text)return;const index=chunks.length;chunks.push({id:`${sourceHash.slice(0,16)}:${index}`,index,text,source,sourceHash,heading});buffer=''};
  for(const block of markdown.split(/\n{2,}/)){
    const trimmed=block.trim();if(!trimmed)continue;
    const match=trimmed.match(/^#{1,6}\s+(.+)$/m);if(match){flush();heading=match[1].trim()}
    if(buffer&&buffer.length+trimmed.length+2>maxChars)flush();
    if(trimmed.length>maxChars){for(let i=0;i<trimmed.length;i+=maxChars){buffer=trimmed.slice(i,i+maxChars);flush()}continue}
    buffer+=(buffer?'\n\n':'')+trimmed;
  }
  flush();return chunks;
}
async function readDoclingOutputs(source:string,outputDir:string){
  const stem=outputStem(source),mdPath=path.join(outputDir,`${stem}.md`),jsonPath=path.join(outputDir,`${stem}.json`);
  const markdown=await exists(mdPath)?await fs.readFile(mdPath,'utf8'):undefined;let json:unknown=undefined;
  if(await exists(jsonPath)){const raw=await fs.readFile(jsonPath,'utf8');try{json=JSON.parse(raw)}catch{json={raw}}}
  return {markdown,json,mdPath,jsonPath};
}
async function finalize(source:string,outputDir:string,engine:'docling'|'native-fallback',markdown: string|undefined,json:unknown,warnings:string[]):Promise<DocumentIngestResult>{
  const stat=await fs.stat(source);const sourceHash=await sha256(source);const stem=outputStem(source);const chunks=markdown?splitChunks(markdown,source,sourceHash):[];
  const chunksPath=path.join(outputDir,`${stem}.chunks.jsonl`);if(chunks.length)await fs.writeFile(chunksPath,chunks.map(x=>JSON.stringify(x)).join('\n')+'\n','utf8');
  const manifest:DocumentManifest={version:1,source,sourceHash,sourceBytes:stat.size,sourceModifiedAt:stat.mtime.toISOString(),ingestedAt:new Date().toISOString(),engine,artifacts:{markdown:markdown?`${stem}.md`:undefined,json:json?`${stem}.json`:undefined,chunks:chunks.length?`${stem}.chunks.jsonl`:undefined},chunkCount:chunks.length,warnings:[...warnings]};
  await fs.writeFile(path.join(outputDir,`${stem}.manifest.json`),JSON.stringify(manifest,null,2)+'\n','utf8');return {source,engine,outputDir,markdown,json,chunks,manifest,warnings};
}
async function nativeFallback(source:string,outputDir:string):Promise<DocumentIngestResult>{
  const ext=path.extname(source).toLowerCase(),warnings=['Docling não está disponível; Munin usou ingestão determinística limitada.'];await fs.mkdir(outputDir,{recursive:true});
  if(['.md','.txt','.json','.csv','.html','.htm'].includes(ext)){
    const raw=await fs.readFile(source,'utf8'),markdown=ext==='.json'?`\`\`\`json\n${raw}\n\`\`\``:raw,record={source,engine:'native-fallback',content:raw};const stem=outputStem(source);
    await fs.writeFile(path.join(outputDir,`${stem}.md`),markdown,'utf8');await fs.writeFile(path.join(outputDir,`${stem}.json`),JSON.stringify(record,null,2)+'\n','utf8');return finalize(source,outputDir,'native-fallback',markdown,record,warnings);
  }
  warnings.push(`Formato ${ext||'(sem extensão)'} requer Docling para extração estruturada.`);return finalize(source,outputDir,'native-fallback',undefined,undefined,warnings);
}
export async function ingestDocument(source:string,outputDir=path.resolve('data/runtime/documents'),deps:Deps={}):Promise<DocumentIngestResult>{
  const abs=path.resolve(source);if(!await exists(abs))throw new Error(`Documento não encontrado: ${abs}`);await fs.mkdir(outputDir,{recursive:true});const execFileImpl=deps.execFileImpl??execFileAsync;const docling=await findDocling(execFileImpl);if(!docling)return nativeFallback(abs,outputDir);
  try{await execFileImpl(docling,['convert',abs,'--to','md','--to','json','--output',outputDir,'--abort-on-error','--quiet'],{timeout:Number(process.env.MUNIN_DOCLING_TIMEOUT_MS??600000),windowsHide:true,maxBuffer:16*1024*1024});const outputs=await readDoclingOutputs(abs,outputDir);if(!outputs.markdown&&!outputs.json)throw new Error('Docling concluiu sem produzir Markdown ou JSON esperado.');return finalize(abs,outputDir,'docling',outputs.markdown,outputs.json,[])}catch(error){const fallback=await nativeFallback(abs,outputDir);fallback.warnings.unshift(`Docling falhou: ${error instanceof Error?error.message:String(error)}`);fallback.manifest.warnings=[...fallback.warnings];await fs.writeFile(path.join(outputDir,`${outputStem(abs)}.manifest.json`),JSON.stringify(fallback.manifest,null,2)+'\n','utf8');return fallback}
}
