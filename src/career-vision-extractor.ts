import { loadLlmSettings } from './llm-settings.js';
import type { CareerIntakeExtractor, CareerIntakeInput } from './career-intake.js';

function safeBase(url:string){return url.replace(/\/$/,'');}
function requireImage(input:CareerIntakeInput):{mimeType:string;base64:string}{
 const image=input.image;
 if(!image?.dataBase64)throw new Error('CAREER_INTAKE_IMAGE_DATA_REQUIRED');
 if(!/^image\/(png|jpeg|jpg|webp)$/i.test(image.mimeType))throw new Error('CAREER_INTAKE_IMAGE_TYPE_UNSUPPORTED');
 const base64=image.dataBase64.replace(/^data:[^;]+;base64,/i,'').trim();
 if(!base64)throw new Error('CAREER_INTAKE_IMAGE_DATA_REQUIRED');
 if(base64.length>14_000_000)throw new Error('CAREER_INTAKE_IMAGE_TOO_LARGE');
 return {mimeType:image.mimeType.replace('jpg','jpeg'),base64};
}

async function config(){
 const settings=await loadLlmSettings();
 if(settings.enabled&&settings.baseUrl&&settings.model&&(settings.apiKey||settings.provider==='openai-compatible'))return settings;
 const baseUrl=process.env.MUNIN_LLM_BASE_URL?.trim();const apiKey=process.env.MUNIN_LLM_API_KEY?.trim()??'';const model=process.env.MUNIN_LLM_MODEL?.trim();
 if(baseUrl&&model)return {enabled:true,provider:'openai-compatible' as const,baseUrl,apiKey,model};
 throw new Error('CAREER_INTAKE_VISION_PROVIDER_REQUIRED');
}

const prompt='Extract the job vacancy from this screenshot. Return plain text only, preserving company, role, location, seniority, responsibilities, requirements, compensation, and any visible application details. Do not infer missing facts.';

export class CareerVisionExtractor implements CareerIntakeExtractor {
 async extract(input:CareerIntakeInput):Promise<string>{
  const image=requireImage(input);const settings=await config();
  if(settings.provider==='anthropic'){
   const response=await fetch(`${safeBase(settings.baseUrl)}/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':settings.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:settings.model,max_tokens:2200,temperature:0,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:image.mimeType,data:image.base64}},{type:'text',text:prompt}]}]}),signal:AbortSignal.timeout(Number(process.env.MUNIN_LLM_TIMEOUT_MS??180000))});
   if(!response.ok)throw new Error(`Career vision provider respondeu ${response.status}`);const payload=await response.json() as any;const text=Array.isArray(payload?.content)?payload.content.find((item:any)=>item?.type==='text')?.text:undefined;if(typeof text!=='string'||!text.trim())throw new Error('CAREER_INTAKE_VISION_EMPTY');return text.trim();
  }
  const headers:Record<string,string>={'content-type':'application/json'};if(settings.apiKey)headers.authorization=`Bearer ${settings.apiKey}`;
  const response=await fetch(`${safeBase(settings.baseUrl)}/chat/completions`,{method:'POST',headers,body:JSON.stringify({model:settings.model,temperature:0,max_tokens:2200,messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:`data:${image.mimeType};base64,${image.base64}`}}]}]}),signal:AbortSignal.timeout(Number(process.env.MUNIN_LLM_TIMEOUT_MS??180000))});
  if(!response.ok)throw new Error(`Career vision provider respondeu ${response.status}`);const payload=await response.json() as any;const text=payload?.choices?.[0]?.message?.content??payload?.output_text;if(typeof text!=='string'||!text.trim())throw new Error('CAREER_INTAKE_VISION_EMPTY');return text.trim();
 }
}
