import { llmProviderStatus } from './llm-provider.js';
import { preflightOllama } from './provider-preflight.js';

export type EngineeringProviderReadiness={ok:boolean;message:string;evidence:string};

export async function prepareEngineeringProvider():Promise<EngineeringProviderReadiness>{
 const configured=await llmProviderStatus();
 const local=await preflightOllama();
 if(local.ready&&local.model){
  process.env.OLLAMA_BASE_URL=local.baseUrl;
  process.env.OLLAMA_MODEL=local.model;
  const primary=configured.enabled&&configured.provider!=='ollama-local'?`Provider principal ${configured.provider}/${configured.model??'modelo configurado'}; `:'';
  return {ok:true,message:local.state==='started'?'Fallback Ollama estava parado e foi iniciado automaticamente.':'Fallback Ollama pronto antes da missão.',evidence:`${primary}${local.message}`};
 }
 if(configured.enabled&&configured.provider!=='ollama-local')return {ok:true,message:'Provider principal configurado; fallback Ollama não está disponível.',evidence:local.message};
 return {ok:false,message:'Nenhum provider de engenharia está pronto para iniciar a missão.',evidence:local.message};
}
