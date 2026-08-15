import type { MemoryInput, MemoryKind } from './continuity-memory.js';

type ExportMessage={author?:{role?:string};content?:{parts?:unknown[]};create_time?:number|null};
type ExportNode={message?:ExportMessage|null};
type ExportConversation={id?:string;title?:string;create_time?:number;update_time?:number;mapping?:Record<string,ExportNode>};

function textOf(message:ExportMessage){const parts=message.content?.parts??[];return parts.filter((part):part is string=>typeof part==='string').join('\n').trim()}
function iso(seconds?:number|null){return seconds&&Number.isFinite(seconds)?new Date(seconds*1000).toISOString():new Date().toISOString()}
function kindFor(text:string):MemoryKind{
 const value=text.toLocaleLowerCase();
 if(/\b(prefiro|preferência|quero que você|não quero|sempre faça|nunca faça|gosto de)\b/.test(value))return 'preference';
 if(/\b(meta|objetivo|quero conseguir|pretendo|prioridade)\b/.test(value))return 'goal';
 if(/\b(projeto|munin|aip|roadmap|backlog|build)\b/.test(value))return 'project';
 if(/\b(vaga|carreira|febraban|bank of america|citibank|b3|salário|currículo|entrevista)\b/.test(value))return 'career';
 if(/\b(decidimos|decisão|vamos usar|escolhi|definimos|fica decidido)\b/.test(value))return 'decision';
 return 'event';
}
function subjectFor(title:string|undefined,text:string,kind:MemoryKind){const clean=(title??'').trim();if(clean)return clean.slice(0,120);const first=text.split(/[.!?\n]/)[0]?.trim();return (first||`ChatGPT ${kind}`).slice(0,120)}
function meaningful(text:string){return text.length>=18&&!/^(ok|sim|não|cont|continue|build|next|feito|execute|executa)[.! ]*$/i.test(text.trim())}
function chunks(text:string,max=1800){if(text.length<=max)return [text];const pieces:string[]=[];let current='';for(const paragraph of text.split(/\n{2,}/)){if(current&&current.length+paragraph.length+2>max){pieces.push(current);current=''}current+=(current?'\n\n':'')+paragraph;if(current.length>max){pieces.push(current.slice(0,max));current=current.slice(max)}}if(current)pieces.push(current);return pieces}

export function parseChatGptExport(input:unknown):MemoryInput[]{
 if(!Array.isArray(input))throw new Error('ChatGPT export must be a conversations array.');
 const output:MemoryInput[]=[];const seen=new Set<string>();
 for(const raw of input as ExportConversation[]){const nodes=raw&&typeof raw==='object'&&raw.mapping&&typeof raw.mapping==='object'?Object.values(raw.mapping):[];
  for(const node of nodes){const message=node?.message;if(!message||message.author?.role!=='user')continue;const text=textOf(message);if(!meaningful(text))continue;
   for(const content of chunks(text)){const kind=kindFor(content);const subject=subjectFor(raw.title,content,kind);const key=`${kind}|${subject.toLowerCase()}|${content.toLowerCase()}`;if(seen.has(key))continue;seen.add(key);
    output.push({kind,subject,content,tags:['chatgpt-export',kind,...(/\bmunin\b/i.test(content)?['munin']:[]),...(/\b(b3|vaga|currículo|entrevista)\b/i.test(content)?['career']:[])],source:`chatgpt-export:${raw.id??'conversation'}`,confidence:'confirmed',observedAt:iso(message.create_time??raw.update_time??raw.create_time),lastConfirmedAt:iso(message.create_time??raw.update_time??raw.create_time)});
   }
  }
 }
 return output;
}

export function chatGptExportSummary(records:MemoryInput[]){const byKind:Record<string,number>={};for(const record of records)byKind[record.kind]=(byKind[record.kind]??0)+1;return {records:records.length,byKind};}
