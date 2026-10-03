import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { formatContextProfile, profileContext, type ContextComponentInput } from './context-profiler.js';

const args=process.argv.slice(2);
const jsonOutput=args.includes('--json');
const inputPath=args.find(arg=>!arg.startsWith('--'));
if(!inputPath){
 console.error('Usage: npm run context:profile -- <components.json> [--json]');
 process.exitCode=2;
}else{
 try{
  const parsed:unknown=JSON.parse(await readFile(resolve(inputPath),'utf8'));
  if(!Array.isArray(parsed))throw new Error('Context profiler input must be a JSON array.');
  const profile=profileContext(parsed as ContextComponentInput[]);
  console.log(jsonOutput?JSON.stringify(profile,null,2):formatContextProfile(profile));
 }catch(error){
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
 }
}
