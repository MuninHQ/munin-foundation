import { readFile } from 'node:fs/promises';
import { ContinuityMemoryStore, type MemoryInput } from './continuity-memory.js';
import { chatGptExportSummary, parseChatGptExport } from './chatgpt-export.js';

const [, , command, arg] = process.argv;
const store=new ContinuityMemoryStore();
if(command==='import'){
  if(!arg)throw new Error('Usage: memory import <json-file>');
  const parsed=JSON.parse(await readFile(arg,'utf8')) as MemoryInput[];
  console.log(JSON.stringify(await store.import(parsed),null,2));
}else if(command==='import-chatgpt'){
  if(!arg)throw new Error('Usage: memory import-chatgpt <conversations.json>');
  const exported=JSON.parse(await readFile(arg,'utf8')) as unknown;
  const records=parseChatGptExport(exported);const summary=chatGptExportSummary(records);const result=await store.import(records);
  console.log(JSON.stringify({source:arg,summary,result},null,2));
}else if(command==='search'){
  console.log(JSON.stringify(await store.search(arg??''),null,2));
}else if(command==='stats'){
  console.log(JSON.stringify(await store.stats(),null,2));
}else if(command==='backup'){
  console.log(JSON.stringify(await store.backup(arg),null,2));
}else{
  console.log('Munin continuity memory\n  import <json-file>\n  import-chatgpt <conversations.json>\n  search <query>\n  stats\n  backup [directory]');
}
