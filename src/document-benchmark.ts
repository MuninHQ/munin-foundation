import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ingestDocument } from './document-intelligence.js';

export type DocumentBenchmarkItem={file:string;extension:string;bytes:number;engine:string;durationMs:number;chunks:number;warnings:string[];ok:boolean};
export type DocumentBenchmarkReport={generatedAt:string;inputDir:string;outputDir:string;documents:number;mineru?:number;docling:number;fallback:number;failed:number;totalMs:number;items:DocumentBenchmarkItem[]};

const supported=/\.(pdf|docx|pptx|xlsx|html?|epub|md|txt|json|csv|png|jpe?g|webp|tiff?|wav|mp3|m4a|eml|msg|odt|ods|odp|xbrl)$/i;

export async function benchmarkDocuments(inputDir:string,outputDir=path.resolve('data/runtime/document-benchmark')):Promise<DocumentBenchmarkReport>{
 const input=path.resolve(inputDir);const out=path.resolve(outputDir);await fs.mkdir(out,{recursive:true});
 const entries=await fs.readdir(input,{withFileTypes:true});const files=entries.filter(x=>x.isFile()&&supported.test(x.name)).map(x=>path.join(input,x.name)).sort();
 const items:DocumentBenchmarkItem[]=[];const started=performance.now();
 for(const file of files){const stat=await fs.stat(file);const artifactOut=path.join(out,path.basename(file).replace(/[^a-z0-9._-]+/gi,'_'));const t0=performance.now();
  try{const result=await ingestDocument(file,artifactOut);items.push({file:path.basename(file),extension:path.extname(file).toLowerCase(),bytes:stat.size,engine:result.engine,durationMs:Math.round(performance.now()-t0),chunks:result.manifest.chunkCount,warnings:result.warnings,ok:Boolean(result.markdown||result.json)});}
  catch(error){items.push({file:path.basename(file),extension:path.extname(file).toLowerCase(),bytes:stat.size,engine:'error',durationMs:Math.round(performance.now()-t0),chunks:0,warnings:[error instanceof Error?error.message:String(error)],ok:false});}
 }
 const report:DocumentBenchmarkReport={generatedAt:new Date().toISOString(),inputDir:input,outputDir:out,documents:items.length,mineru:items.filter(x=>x.engine==='mineru').length,docling:items.filter(x=>x.engine==='docling').length,fallback:items.filter(x=>x.engine==='native-fallback').length,failed:items.filter(x=>!x.ok).length,totalMs:Math.round(performance.now()-started),items};
 await fs.writeFile(path.join(out,'benchmark-report.json'),JSON.stringify(report,null,2)+'\n','utf8');return report;
}
