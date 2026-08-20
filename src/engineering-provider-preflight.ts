import { llmProviderStatus } from './llm-provider.js';
import { ollamaOptedIn, preflightOllama } from './provider-preflight.js';

export type EngineeringProviderReadiness={ok:boolean;message:string;evidence:string};

export async function prepareEngineeringProvider():Promise<EngineeringProviderReadiness>{
 const configured=await llmProviderStatus();
 if(configured.enabled&&configured.provider!=='ollama-local')return {ok:true,message:'Provider de inteligência configurado para a missão.',evidence:`${configured.provider}/${configured.model??'modelo configurado'} via ${configured.source??'configuração'}.`};
 if(ollamaOptedIn()){
  const local=await preflightOllama();
  if(local.ready&&local.model){
   process.env.OLLAMA_BASE_URL=local.baseUrl;
   process.env.OLLAMA_MODEL=local.model;
   return {ok:true,message:local.state==='started'?'Ollama opcional foi iniciado após opt-in explícito.':'Ollama opcional está pronto.',evidence:local.message};
  }
  return {ok:false,message:'Provider local opcional não está pronto.',evidence:local.message};
 }
 return {ok:false,message:'External intelligence required para esta missão de engenharia.',evidence:'ChatGPT-first mode: nenhum provider in-process está configurado e Ollama permanece desativado por padrão. Use o cockpit ChatGPT ou habilite explicitamente um provider opcional.'};
}
