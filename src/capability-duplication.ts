import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { CapabilityCandidate } from './capability-radar.js';

export interface DuplicationEvidence {
  score: number;
  matches: string[];
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(token => token.length >= 3));
}

function similarity(a: string, b: string): number {
  const left=tokens(a),right=tokens(b); if(!left.size||!right.size)return 0;
  let intersection=0;for(const token of left)if(right.has(token))intersection++;
  const union=new Set([...left,...right]).size;
  return union?intersection/union:0;
}

async function sourceNames(root:string):Promise<string[]>{
 const src=join(root,'src');const names:string[]=[];
 async function walk(dir:string){
  let entries;try{entries=await readdir(dir,{withFileTypes:true})}catch{return}
  for(const entry of entries){const full=join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(['.ts','.js','.mjs'].includes(extname(entry.name)))names.push(basename(entry.name,extname(entry.name)).replace(/[-_]/g,' '));}
 }
 await walk(src);return names;
}

async function dependencyNames(root:string):Promise<string[]>{
 try{const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8')) as {dependencies?:Record<string,string>;devDependencies?:Record<string,string>};return [...Object.keys(pkg.dependencies??{}),...Object.keys(pkg.devDependencies??{})]}catch{return[]}
}

export async function collectDuplicationEvidence(candidate:CapabilityCandidate,root=process.cwd()):Promise<DuplicationEvidence>{
 const repoName=candidate.name.split('/').pop()??candidate.name;
 const surfaces=[...(await dependencyNames(root)),...(await sourceNames(root))];
 const ranked=surfaces.map(name=>({name,score:similarity(repoName,name)})).filter(item=>item.score>=0.34).sort((a,b)=>b.score-a.score).slice(0,5);
 const exact=surfaces.some(name=>name.toLowerCase()===repoName.toLowerCase());
 const score=Number(Math.min(1,exact?1:(ranked[0]?.score??0)).toFixed(3));
 return{score,matches:ranked.map(item=>`${item.name} (${item.score.toFixed(2)})`)};
}
