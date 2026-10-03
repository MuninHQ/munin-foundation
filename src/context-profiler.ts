export type ContextComponentKind='system'|'steering'|'tools'|'history'|'memory'|'user'|'other';
export interface ContextComponentInput{name:string;kind:ContextComponentKind;text?:string;chars?:number}
export interface ContextComponentProfile{name:string;kind:ContextComponentKind;chars:number;estimatedTokens:number;sharePercent:number}
export interface ContextProfile{totalChars:number;estimatedTokens:number;components:ContextComponentProfile[];largest?:ContextComponentProfile;recommendations:string[];rawContentReturned:false}

function estimateChars(chars:number):number{return chars===0?0:Math.ceil(chars/4);}

function sizeOf(input:ContextComponentInput):number{
 if(!input.name.trim())throw new Error('Context component name is required.');
 if(input.text!==undefined&&input.chars!==undefined)throw new Error(`Context component "${input.name}" must provide text or chars, not both.`);
 if(input.text!==undefined)return Array.from(input.text).length;
 if(input.chars===undefined)return 0;
 if(!Number.isInteger(input.chars)||input.chars<0)throw new Error(`Context component "${input.name}" chars must be a non-negative integer.`);
 return input.chars;
}

export function profileContext(inputs:ContextComponentInput[]):ContextProfile{
 const sized=inputs.map(input=>({name:input.name.trim(),kind:input.kind,chars:sizeOf(input)}));
 const totalChars=sized.reduce((sum,item)=>sum+item.chars,0);
 const totalTokens=estimateChars(totalChars);
 const components=sized.map(item=>({
  ...item,
  estimatedTokens:estimateChars(item.chars),
  sharePercent:totalChars===0?0:Math.round((item.chars/totalChars)*1000)/10,
 })).sort((a,b)=>b.estimatedTokens-a.estimatedTokens||a.name.localeCompare(b.name));
 const largest=components[0];
 const recommendations:string[]=[];
 if(largest&&largest.sharePercent>=35)recommendations.push(`${largest.name} is ${largest.sharePercent}% of estimated context; inspect it first for pointers, deduplication or bounded summaries.`);
 const tools=components.filter(item=>item.kind==='tools').reduce((sum,item)=>sum+item.sharePercent,0);
 if(tools>=30)recommendations.push(`Tool schemas are ${Math.round(tools*10)/10}% of estimated context; load only task-relevant tool surfaces when possible.`);
 const repeated=components.filter(item=>item.kind==='steering'||item.kind==='memory').reduce((sum,item)=>sum+item.sharePercent,0);
 if(repeated>=30)recommendations.push(`Steering + memory are ${Math.round(repeated*10)/10}% of estimated context; prefer GLOSSARY.md pointers and targeted recall over repeated prose.`);
 if(totalChars===0)recommendations.push('No context volume was supplied.');
 return{totalChars,estimatedTokens:totalTokens,components,largest,recommendations,rawContentReturned:false};
}

export function formatContextProfile(profile:ContextProfile):string{
 const rows=profile.components.map(item=>`- ${item.name} [${item.kind}]: ~${item.estimatedTokens} tokens (${item.sharePercent}%)`);
 return[
  'Munin Context Profiler · estimate only',
  `Total: ~${profile.estimatedTokens} tokens · ${profile.totalChars} chars`,
  ...rows,
  'Recommendations:',
  ...(profile.recommendations.length?profile.recommendations.map(item=>`- ${item}`):['- No dominant context source detected.']),
  'Raw content returned: NO',
 ].join('\n');
}
