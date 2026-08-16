import './vault-documents.css';

type VaultDocument={id:string;sourceName:string;engine:string;sha256:string;chunkCount:number;ingestedAt:string;warnings:string[]};
type DocumentList={documents:VaultDocument[]};
type IngestResult={sourceFile:string;engine:string;chunkCount:number;warnings:string[];manifest?:{sha256?:string;ingestedAt?:string}};

const ACCEPT='.pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.html,.png,.jpg,.jpeg,.webp';
const MAX_BYTES=20_000_000;
const token=()=>localStorage.getItem('munin-mobile-token')??'';

async function api<T>(path:string,init:RequestInit={}):Promise<T>{
 const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token()}`);if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 const response=await fetch(path,{...init,headers});const payload=await response.json().catch(()=>({error:`HTTP ${response.status}`}));
 if(!response.ok)throw new Error(payload.error??`HTTP ${response.status}`);return payload as T;
}

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]??c))}
function shortHash(value:string){return value?`${value.slice(0,8)}…${value.slice(-6)}`:'—'}
function formatDate(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}

function fileToBase64(file:File,onProgress:(percent:number)=>void):Promise<string>{
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error??new Error('Não foi possível ler o arquivo.'));reader.onprogress=e=>{if(e.lengthComputable)onProgress(Math.min(70,Math.round((e.loaded/e.total)*70)))};reader.onload=()=>{const result=String(reader.result??'');resolve(result.includes(',')?result.slice(result.indexOf(',')+1):result)};reader.readAsDataURL(file)});
}

function renderDocuments(host:HTMLElement,documents:VaultDocument[]){
 const list=host.querySelector<HTMLElement>('[data-vault-doc-list]');if(!list)return;
 if(!documents.length){list.innerHTML='<div class="vault-doc-empty">Nenhum documento ingerido ainda.<br><small>Envie um arquivo acima para começar a construir o acervo local.</small></div>';return}
 list.innerHTML=documents.map(d=>`<article class="vault-document-card"><div class="vault-document-title"><span>◫</span><div><strong>${escapeHtml(d.sourceName)}</strong><small>${escapeHtml(d.engine||'native')} · ${d.chunkCount} chunks</small></div></div><div class="vault-document-meta"><span title="SHA-256">${escapeHtml(shortHash(d.sha256))}</span><span>${escapeHtml(formatDate(d.ingestedAt))}</span></div>${d.warnings?.length?`<div class="vault-document-warning">${escapeHtml(d.warnings.join(' · '))}</div>`:''}</article>`).join('');
}

async function refreshDocuments(host:HTMLElement){
 const status=host.querySelector<HTMLElement>('[data-vault-doc-status]');try{const payload=await api<DocumentList>('/api/mobile/documents');renderDocuments(host,payload.documents??[]);if(status)status.textContent=`${payload.documents?.length??0} documento(s) no Vault`;}catch(e){if(status)status.textContent=e instanceof Error?e.message:String(e)}
}

async function upload(host:HTMLElement,file:File){
 const status=host.querySelector<HTMLElement>('[data-vault-doc-status]');const progress=host.querySelector<HTMLElement>('[data-vault-doc-progress]');const fill=host.querySelector<HTMLElement>('[data-vault-doc-progress-fill]');const button=host.querySelector<HTMLLabelElement>('.vault-upload-button');
 if(file.size>MAX_BYTES){if(status)status.textContent='Arquivo acima de 20 MB. Use a ingestão local no PC.';return}
 button?.classList.add('busy');progress?.classList.add('visible');if(status)status.textContent=`Preparando ${file.name}…`;if(fill)fill.style.width='4%';
 try{
  const dataBase64=await fileToBase64(file,p=>{if(fill)fill.style.width=`${p}%`;if(status)status.textContent=`Lendo ${file.name}… ${p}%`});
  if(fill)fill.style.width='78%';if(status)status.textContent='Enviando ao runtime privado…';
  const result=await api<IngestResult>('/api/mobile/documents/ingest',{method:'POST',body:JSON.stringify({name:file.name,dataBase64})});
  if(fill)fill.style.width='100%';if(status)status.textContent=`${result.sourceFile} pronto · ${result.engine} · ${result.chunkCount} chunks`;
  await refreshDocuments(host);setTimeout(()=>progress?.classList.remove('visible'),900);
 }catch(e){if(status)status.textContent=e instanceof Error?e.message:String(e);progress?.classList.add('failed')}finally{button?.classList.remove('busy')}
}

function mountVaultDocuments(){
 const realmPages=[...document.querySelectorAll<HTMLElement>('.realm-page')];const vault=realmPages.find(p=>p.querySelector('h2')?.textContent?.trim()==='Vault');if(!vault||vault.querySelector('[data-vault-documents]'))return;
 const section=document.createElement('section');section.className='vault-documents';section.dataset.vaultDocuments='true';section.innerHTML=`<div class="vault-doc-head"><div><span class="eyebrow">DOCUMENT INTELLIGENCE</span><h3>Acervo do Vault</h3><p>Envie documentos do iPhone. O processamento e o índice permanecem no runtime privado.</p></div><button class="vault-refresh" type="button" aria-label="Atualizar documentos">↻</button></div><label class="vault-upload-button">＋ Adicionar documento<input data-vault-doc-input type="file" accept="${ACCEPT}" /></label><div class="vault-doc-progress" data-vault-doc-progress><span data-vault-doc-progress-fill></span></div><small class="vault-doc-status" data-vault-doc-status>Carregando acervo…</small><div class="vault-doc-list" data-vault-doc-list></div>`;
 vault.appendChild(section);
 const input=section.querySelector<HTMLInputElement>('[data-vault-doc-input]');input?.addEventListener('change',()=>{const file=input.files?.[0];if(file)void upload(section,file);input.value=''});section.querySelector('.vault-refresh')?.addEventListener('click',()=>void refreshDocuments(section));void refreshDocuments(section);
}

let scheduled=false;function scheduleMount(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mountVaultDocuments()})}
new MutationObserver(scheduleMount).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('load',scheduleMount);document.addEventListener('click',scheduleMount,true);scheduleMount();
