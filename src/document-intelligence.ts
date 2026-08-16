import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const execFileAsync=promisify(execFile);

export type DocumentIngestResult={
  source:string;
  engine:'docling'|'native-fallback';
  outputDir:string;
  markdown?:string;
  json?:unknown;
  warnings:string[];
};

type Deps={
  execFileImpl?:typeof execFileAsync;
};

async function exists(file:string){try{await fs.access(file);return true}catch{return false}}
async function findDocling(execFileImpl:typeof execFileAsync){
  const locator=process.platform==='win32'?'where.exe':'which';
  try{
    const result=await execFileImpl(locator,['docling'],{timeout:5000,windowsHide:true});
    return String(result.stdout??'').split(/\r?\n/).map(x=>x.trim()).find(Boolean);
  }catch{return undefined}
}

function outputStem(source:string){
  const base=path.basename(source).replace(/\.[^.]+$/,'');
  return base||'document';
}

async function readDoclingOutputs(source:string,outputDir:string):Promise<Pick<DocumentIngestResult,'markdown'|'json'>>{
  const stem=outputStem(source);
  const mdPath=path.join(outputDir,`${stem}.md`);
  const jsonPath=path.join(outputDir,`${stem}.json`);
  const markdown=await exists(mdPath)?await fs.readFile(mdPath,'utf8'):undefined;
  let json:unknown=undefined;
  if(await exists(jsonPath)){
    const raw=await fs.readFile(jsonPath,'utf8');
    try{json=JSON.parse(raw)}catch{json={raw}}
  }
  return {markdown,json};
}

async function nativeFallback(source:string,outputDir:string):Promise<DocumentIngestResult>{
  const ext=path.extname(source).toLowerCase();
  const warnings=['Docling não está disponível; Munin usou ingestão determinística limitada.'];
  await fs.mkdir(outputDir,{recursive:true});
  if(['.md','.txt','.json','.csv','.html','.htm'].includes(ext)){
    const raw=await fs.readFile(source,'utf8');
    const markdown=ext==='.json'?`\`\`\`json\n${raw}\n\`\`\``:raw;
    const record={source:path.resolve(source),engine:'native-fallback',content:raw};
    await fs.writeFile(path.join(outputDir,`${outputStem(source)}.md`),markdown,'utf8');
    await fs.writeFile(path.join(outputDir,`${outputStem(source)}.json`),JSON.stringify(record,null,2)+'\n','utf8');
    return {source:path.resolve(source),engine:'native-fallback',outputDir,markdown,json:record,warnings};
  }
  warnings.push(`Formato ${ext||'(sem extensão)'} requer Docling para extração estruturada.`);
  return {source:path.resolve(source),engine:'native-fallback',outputDir,warnings};
}

export async function ingestDocument(source:string,outputDir=path.resolve('data/runtime/documents'),deps:Deps={}):Promise<DocumentIngestResult>{
  const abs=path.resolve(source);
  if(!await exists(abs))throw new Error(`Documento não encontrado: ${abs}`);
  await fs.mkdir(outputDir,{recursive:true});
  const execFileImpl=deps.execFileImpl??execFileAsync;
  const docling=await findDocling(execFileImpl);
  if(!docling)return nativeFallback(abs,outputDir);
  try{
    await execFileImpl(docling,['convert',abs,'--to','md','--to','json','--output',outputDir,'--abort-on-error','--quiet'],{timeout:Number(process.env.MUNIN_DOCLING_TIMEOUT_MS??600000),windowsHide:true,maxBuffer:16*1024*1024});
    const outputs=await readDoclingOutputs(abs,outputDir);
    if(!outputs.markdown&&!outputs.json)throw new Error('Docling concluiu sem produzir Markdown ou JSON esperado.');
    return {source:abs,engine:'docling',outputDir,...outputs,warnings:[]};
  }catch(error){
    const fallback=await nativeFallback(abs,outputDir);
    fallback.warnings.unshift(`Docling falhou: ${error instanceof Error?error.message:String(error)}`);
    return fallback;
  }
}
