export type EmailHandoffMode='reply'|'analyze';
export interface EmailHandoffItem{subject:string;from?:string;attention?:string;reason?:string;score?:number;reasons?:string[]}
const CHATGPT_URL='https://chatgpt.com/';
const clean=(value:unknown,max=220)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
export function buildEmailHandoffPrompt(item:EmailHandoffItem,mode:EmailHandoffMode):string{
 const objective=mode==='reply'?'Prepare uma resposta profissional adequada para este e-mail. Não envie nada; produza apenas um rascunho para minha revisão.':'Analise por que este e-mail pode ser relevante, resuma os pontos que merecem atenção e sugira o próximo passo. Não execute ações externas.';
 return ['MUNIN — EMAIL → CHATGPT HANDOFF','',objective,'','METADADOS SANITIZADOS:',JSON.stringify({subject:clean(item.subject),from:clean(item.from),attention:clean(item.attention,40),reason:clean(item.reason),interestScore:item.score,relevance:(item.reasons??[]).slice(0,5).map(x=>clean(x,100))},null,2),'','Se a integração de e-mail estiver conectada ao ChatGPT, localize a mensagem/thread correspondente por remetente + assunto antes de responder. Caso não esteja disponível, peça somente o trecho mínimo necessário.','Preserve privacidade e não envie, arquive, delete ou altere o e-mail sem pedido explícito.'].join('\n');
}
export async function handoffEmailToChatGPT(item:EmailHandoffItem,mode:EmailHandoffMode,open=true):Promise<void>{const prompt=buildEmailHandoffPrompt(item,mode);await navigator.clipboard.writeText(prompt);if(open)window.open(CHATGPT_URL,'_blank','noopener,noreferrer')}
