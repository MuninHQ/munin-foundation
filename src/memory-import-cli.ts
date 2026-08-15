import { readFile } from 'node:fs/promises';
import { ContinuityMemoryStore, type MemoryInput } from './continuity-memory.js';

const [, , command, arg] = process.argv;
const store=new ContinuityMemoryStore();
if(command==='import'){
  if(!arg)throw new Error('Usage: memory import <json-file>');
  const parsed=JSON.parse(await readFile(arg,'utf8')) as MemoryInput[];
  console.log(JSON.stringify(await store.import(parsed),null,2));
}else if(command==='search'){
  console.log(JSON.stringify(await store.search(arg??''),null,2));
}else if(command==='stats'){
  console.log(JSON.stringify(await store.stats(),null,2));
}else{
  console.log('Munin continuity memory\n  import <json-file>\n  search <query>\n  stats');
}
