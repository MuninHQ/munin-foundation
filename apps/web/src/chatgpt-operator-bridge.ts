type WorkspacePayload={state?:{projects?:any[];actions?:any[];jobs?:any[];research?:any[]};intelligence?:{dailyBrief?:{headline?:string;priorities?:string[];alerts?:string[]}}};
type MobileHomePayload={generatedAt?:string;goals?:any[];pendingActions?:any[];decisions?:any[];continuityMemory?:{total?:number;active?:number};memoryReview?:{pending?:number}};

const CHATGPT_URL='https://chatgpt.com/';
const maxItems=5;
const clean=(value:unknown,max=180)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
const safeItems=(items:unknown)=>Array.isArray(items)?items.slice(0,maxItems):[];

async function jsonFetch(path:string,token?:string){
 const headers:Record<string,string>={};
 if(token)headers.Authorization=`Bearer ${token}`;
 const response=await fetch(path,{headers});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 return response.json();
}

function desktopContext(payload:WorkspacePayload){
 const state=payload.state??{};
 const projects=safeItems(state.projects).map((x:any)=>({name:clean(x.name),status:clean(x.status,60),priority:clean(x.priority,10),nextAction:clean(x.nextAction)}));
 const actions=safeItems(state.actions).map((x:any)=>({title:clean(x.title),status:clean(x.status,60),priority:clean(x.priority,10)}));
 const jobs=safeItems(state.jobs).map((x:any)=>({company:clean(x.company),role:clean(x.role),status:clean(x.status,60),nextAction:clean(x.nextAction)}));
 const research=safeItems(state.research).map((x:any)=>({question:clean(x.question),status:clean(x.status,60)}));
 const brief=payload.intelligence?.dailyBrief;
 return {surface:'web',counts:{projects:state.projects?.length??0,actions:state.actions?.length??0,jobs:state.jobs?.length??0,research:state.research?.length??0},brief:brief?{headline:clean(brief.headline,240),priorities:safeItems(brief.priorities).map(x=>clean(x,220)),alerts:safeItems(brief.alerts).map(x=>clean(x,220))}:undefined,projects,actions,jobs,research};
}

function mobileContext(payload:MobileHomePayload){
 return {surface:'mobile',generatedAt:clean(payload.generatedAt,60),memory:{active:payload.continuityMemory?.active??payload.continuityMemory?.total??0,pendingReview:payload.memoryReview?.pending??0},goals:safeItems(payload.goals).map((x:any)=>({title:clean(x.title),priority:clean(x.priority,10),status:clean(x.status,60),progress:Number(x.progress??0),nextAction:clean(x.nextAction)})),pendingActions:safeItems(payload.pendingActions).map((x:any)=>({title:clean(x.title),priority:clean(x.priority,10),status:clean(x.status,60)})),decisions:safeItems(payload.decisions).map((x:any)=>({title:clean(x.title)}))};
}

async function buildContext(){
 const token=localStorage.getItem('munin-mobile-token')??'';
 if(token){
  try{return mobileContext(await jsonFetch('/api/mobile/home',token) as MobileHomePayload)}catch{/* desktop fallback below */}
 }
 return desktopContext(await jsonFetch('/api/workspace') as WorkspacePayload);
}

function buildPrompt(objective:string,context:unknown){
 const request=objective.trim()||'Leia o estado atual do Munin, identifique o próximo movimento de maior valor e continue o trabalho até um bloqueio humano real.';
 return [
  'MUNIN — CHATGPT OPERATOR HANDOFF',
  '',
  'Você é o cockpit de inteligência do projeto Munin. O runtime local não deve iniciar Ollama ou exigir OpenAI API por padrão.',
  'Use o repositório conectado MuninHQ/munin-foundation como fonte durável de verdade para arquitetura, backlog e código.',
  'Continue trabalho seguro e reversível autonomamente; preserve os guardrails do projeto e não introduza serviço pago sem aprovação explícita.',
  '',
  `OBJETIVO DO OPERADOR: ${request}`,
  '',
  'SNAPSHOT LOCAL SANITIZADO (sem tokens/credenciais):',
  JSON.stringify(context,null,2),
  '',
  'Ao responder, reconcilie este snapshot com o estado mais recente do GitHub antes de alterar código. Se houver divergência, prefira a evidência mais nova e informe a diferença.'
 ].join('\n');
}

const css=`
.munin-gpt-launch{position:fixed;left:22px;bottom:24px;z-index:70;border:1px solid #2d83b8;background:#081827;color:#c9ecff;border-radius:999px;padding:11px 15px;font:700 11px/1 system-ui;letter-spacing:.08em;box-shadow:0 12px 35px #0009;cursor:pointer}
.munin-gpt-panel{position:fixed;left:18px;bottom:76px;z-index:70;width:min(430px,calc(100vw - 36px));background:#07131f;border:1px solid #28506b;border-radius:16px;padding:16px;box-shadow:0 30px 80px #000d;color:#d8ebf7;font-family:system-ui;display:none}
.munin-gpt-panel.open{display:block}.munin-gpt-panel h3{font-size:13px;letter-spacing:.13em;margin:0 0 6px}.munin-gpt-panel p{font-size:11px;line-height:1.5;color:#7899ad;margin:0 0 12px}.munin-gpt-panel textarea{box-sizing:border-box;width:100%;min-height:82px;resize:vertical;background:#040d15;color:#edf8ff;border:1px solid #24445b;border-radius:10px;padding:10px;font:12px/1.45 system-ui;outline:none}.munin-gpt-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.munin-gpt-actions button{border:1px solid #2d83b8;border-radius:9px;background:#0d5f91;color:white;padding:10px 12px;font:700 10px/1 system-ui;cursor:pointer}.munin-gpt-actions button.secondary{background:transparent;color:#91b8cf}.munin-gpt-status{display:block;min-height:16px;margin-top:9px;color:#6ea8c7;font-size:10px}
@media(max-width:640px){.munin-gpt-launch{left:14px;bottom:max(78px,calc(env(safe-area-inset-bottom) + 66px))}.munin-gpt-panel{left:10px;bottom:max(128px,calc(env(safe-area-inset-bottom) + 116px));width:calc(100vw - 20px)}}`;

function mount(){
 if(document.querySelector('.munin-gpt-launch'))return;
 const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
 const launch=document.createElement('button');launch.className='munin-gpt-launch';launch.textContent='ChatGPT';launch.title='Continuar no ChatGPT sem API paga';launch.setAttribute('aria-label','Abrir ponte para o ChatGPT');
 const panel=document.createElement('section');panel.className='munin-gpt-panel';panel.innerHTML=`<h3>CHATGPT · OPERATOR BRIDGE</h3><p>O Munin prepara somente um snapshot sanitizado. Nenhum token, OAuth ou chave de API é colocado no handoff. O ChatGPT continua sendo o cockpit; o runtime local continua leve.</p><textarea placeholder="O que você quer que o ChatGPT faça com o Munin agora?"></textarea><div class="munin-gpt-actions"><button data-action="open">COPIAR + ABRIR CHATGPT</button><button class="secondary" data-action="copy">SÓ COPIAR CONTEXTO</button><button class="secondary" data-action="close">FECHAR</button></div><span class="munin-gpt-status"></span>`;
 document.body.append(panel,launch);
 const textarea=panel.querySelector('textarea') as HTMLTextAreaElement;const status=panel.querySelector('.munin-gpt-status') as HTMLSpanElement;
 launch.onclick=()=>{panel.classList.toggle('open');launch.setAttribute('aria-expanded',String(panel.classList.contains('open')));if(panel.classList.contains('open'))setTimeout(()=>textarea.focus(),0)};
 async function handoff(open:boolean){
  status.textContent='Montando contexto sanitizado…';
  try{const context=await buildContext();const prompt=buildPrompt(textarea.value,context);await navigator.clipboard.writeText(prompt);status.textContent=open?'Contexto copiado. Abrindo o ChatGPT…':'Contexto copiado. Cole na conversa do projeto Munin.';if(open)window.open(CHATGPT_URL,'_blank','noopener,noreferrer');}
  catch(error){status.textContent=`Não foi possível montar o handoff: ${error instanceof Error?error.message:String(error)}`;}
 }
 (panel.querySelector('[data-action="open"]') as HTMLButtonElement).onclick=()=>void handoff(true);
 (panel.querySelector('[data-action="copy"]') as HTMLButtonElement).onclick=()=>void handoff(false);
 (panel.querySelector('[data-action="close"]') as HTMLButtonElement).onclick=()=>panel.classList.remove('open');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
