type HostJobType='runtime-health'|'git-fast-forward'|'run-acceptance'|'tailscale-health';
type HostQueueItem={job:{id:string;type:string;createdAt:string};status:string;enqueuedAt:string;finishedAt?:string;result?:{summary?:string;evidence?:string[]}};

const token=()=>localStorage.getItem('munin-mobile-token')??'';
async function api<T>(path:string,init:RequestInit={}):Promise<T>{
  const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token()}`);if(init.body)headers.set('Content-Type','application/json');
  const response=await fetch(path,{...init,headers});const payload=await response.json().catch(()=>({error:`HTTP ${response.status}`}));
  if(!response.ok)throw new Error(payload.error??`HTTP ${response.status}`);return payload as T;
}

const labels:Record<HostJobType,string>={
  'runtime-health':'HEALTH',
  'run-acceptance':'VALIDAR',
  'git-fast-forward':'ATUALIZAR MAIN',
  'tailscale-health':'TAILSCALE',
};

const css=`
.munin-host-launch{position:fixed;right:14px;bottom:max(78px,calc(env(safe-area-inset-bottom) + 66px));z-index:72;border:1px solid #365869;background:#07151d;color:#a9d7e9;border-radius:999px;padding:10px 13px;font:700 10px/1 system-ui;letter-spacing:.08em;box-shadow:0 12px 35px #0009}
.munin-host-panel{position:fixed;right:10px;bottom:max(128px,calc(env(safe-area-inset-bottom) + 116px));z-index:72;width:min(390px,calc(100vw - 20px));background:#07131b;border:1px solid #294756;border-radius:16px;padding:15px;box-shadow:0 30px 80px #000d;color:#d9edf5;font-family:system-ui;display:none}.munin-host-panel.open{display:block}
.munin-host-panel h3{margin:0 0 5px;font-size:12px;letter-spacing:.12em}.munin-host-panel p{margin:0 0 11px;color:#7895a3;font-size:10px;line-height:1.45}.munin-host-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.munin-host-actions button{border:1px solid #28566c;background:#0b2634;color:#d9f3ff;border-radius:9px;padding:10px 8px;font:700 9px/1 system-ui}.munin-host-actions button.update{border-color:#6c5b28;background:#2b2410;color:#ffe9a4}.munin-host-status{display:block;min-height:16px;margin-top:9px;color:#7aa5b7;font-size:10px;white-space:pre-wrap}.munin-host-history{max-height:145px;overflow:auto;margin-top:8px;border-top:1px solid #17313e;padding-top:7px}.munin-host-row{display:flex;justify-content:space-between;gap:8px;font-size:9px;padding:5px 0;color:#8aa8b5}.munin-host-row strong{color:#d3eaf3}
`;

function mount(){
  if(document.querySelector('.munin-host-launch'))return;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  const launch=document.createElement('button');launch.className='munin-host-launch';launch.textContent='HOST';launch.title='Munin Host Bridge';
  const panel=document.createElement('section');panel.className='munin-host-panel';panel.innerHTML=`<h3>HOST BRIDGE</h3><p>Jobs tipados e autenticados. Sem shell remoto. Restart permanece indisponível até existir supervisão segura.</p><div class="munin-host-actions"></div><span class="munin-host-status"></span><div class="munin-host-history"></div>`;
  document.body.append(panel,launch);
  const actions=panel.querySelector('.munin-host-actions') as HTMLDivElement;const status=panel.querySelector('.munin-host-status') as HTMLSpanElement;const history=panel.querySelector('.munin-host-history') as HTMLDivElement;
  for(const type of Object.keys(labels) as HostJobType[]){const button=document.createElement('button');button.textContent=labels[type];if(type==='git-fast-forward')button.className='update';button.onclick=()=>void enqueue(type);actions.appendChild(button)}
  launch.onclick=()=>{panel.classList.toggle('open');if(panel.classList.contains('open'))void refresh()};

  async function enqueue(type:HostJobType){
    if(!token()){status.textContent='Token mobile ausente.';return}
    status.textContent=`Enfileirando ${labels[type]}…`;
    try{const item=await api<HostQueueItem>('/api/mobile/host/jobs',{method:'POST',body:JSON.stringify({type})});status.textContent=`Job ${item.job.id} enfileirado.`;await refresh()}
    catch(error){status.textContent=error instanceof Error?error.message:String(error)}
  }
  async function refresh(){
    try{const payload=await api<{jobs:HostQueueItem[]}>('/api/mobile/host/jobs');history.replaceChildren(...payload.jobs.slice(0,8).map(item=>{const row=document.createElement('div');row.className='munin-host-row';const name=document.createElement('strong');name.textContent=item.job.type;const state=document.createElement('span');state.textContent=item.status;row.append(name,state);return row}));}
    catch(error){status.textContent=error instanceof Error?error.message:String(error)}
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
