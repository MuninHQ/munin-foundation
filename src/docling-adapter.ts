import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export type DoclingOutputFormat='md'|'json'|'chunks';
export type DoclingRunResult={code:number;stdout:string;stderr:string};
export type DoclingRunner=(command:string,args:string[])=>Promise<DoclingRunResult>;
export type NormalizedDocument={source:string;outputDirectory:string;markdown?:string;document?:unknown;chunks?:unknown[];provenance:{adapter:'docling-cli';local:boolean;convertedAt:string;sourcePath:string}};

async function defaultRunner(command:string,args:string[]):Promise<DoclingRunResult>{return new Promise((resolve,reject)=>{const child=spawn(command,args,{windowsHide:true});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',reject);child.on('close',code=>resolve({code:code??-1,stdout,stderr}))})}
function stem(source:string){return path.basename(source,path.extname(source))}
async function readJson(file:string){return JSON.parse(await fs.readFile(file,'utf8'))}

export class DoclingAdapter {
  constructor(private readonly runner:DoclingRunner=defaultRunner,private readonly command=process.env.DOCLING_COMMAND?.trim()||'docling'){}
  async health(){try{const result=await this.runner(this.command,['--version']);return {ready:result.code===0,command:this.command,version:(result.stdout||result.stderr).trim().split(/\r?\n/)[0]||undefined,error:result.code===0?undefined:`exit ${result.code}`}}catch(error){return {ready:false,command:this.command,error:error instanceof Error?error.message:String(error)}}}
  async convert(source:string,outputDirectory=path.resolve('data/runtime/documents'),formats:DoclingOutputFormat[]=['md','json']){const sourcePath=path.resolve(source);await fs.access(sourcePath);await fs.mkdir(outputDirectory,{recursive:true});const unique=[...new Set(formats)];const args=['convert',sourcePath,...unique.flatMap(format=>['--to',format]),'--output',path.resolve(outputDirectory),'--quiet','--no-enable-remote-services','--no-allow-external-plugins'];const result=await this.runner(this.command,args);if(result.code!==0)throw new Error(`Docling failed (${result.code}): ${result.stderr.trim()||result.stdout.trim()}`);const base=path.join(path.resolve(outputDirectory),stem(sourcePath));const normalized:NormalizedDocument={source:sourcePath,outputDirectory:path.resolve(outputDirectory),provenance:{adapter:'docling-cli',local:true,convertedAt:new Date().toISOString(),sourcePath}};if(unique.includes('md')){try{normalized.markdown=await fs.readFile(`${base}.md`,'utf8')}catch{/* output name may vary for some containers */}}if(unique.includes('json')){try{normalized.document=await readJson(`${base}.json`)}catch{/* keep traceable conversion even if caller only requested side-effect output */}}if(unique.includes('chunks')){try{const text=await fs.readFile(`${base}.jsonl`,'utf8');normalized.chunks=text.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line))}catch{/* chunks file naming is version-dependent */}}return {normalized,stdout:result.stdout,stderr:result.stderr,args}}
}
