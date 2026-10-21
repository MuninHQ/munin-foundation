/* Shared Munin workspace shell for standalone module pages. */
(() => {
  const sections = [
    { label: 'Home', href: '/' },
    { label: 'Inbox', href: '/action-inbox.html' },
    { label: 'Today', href: '/operator-hub.html' },
    { label: 'Radar', href: '/radar.html' },
    { label: 'Manus', href: '/manus.html' },
    { label: 'Flows', href: '/flows.html' },
    { label: 'Chat', href: '/operator-chat.html' },
    { label: 'Portfolio', href: '/portfolio.html' },
    { label: 'Briefing', href: '/executive-briefing.html' },
    { label: 'Intelligence', href: '/intelligence.html' },
    { label: 'Council', href: '/council.html' },
    { label: 'Career', href: '/career-command.html' },
    { label: 'Memory', href: '/context-memory.html' },
    { label: 'LinkedIn', href: '/linkedin.html' },
    { label: 'Viral', href: '/viral-engine.html' },
    { label: 'Offers', href: '/offer-architect.html' },
    { label: 'Efficiency', href: '/token-efficiency.html' },
  ];
  const tools = [
    ['/email-intelligence.html', 'Email Intelligence'],
    ['/career-inbox.html', 'Career Inbox'],
    ['/career-intake.html', 'Analisar vaga'],
    ['/content-studio.html', 'Content Studio'],
    ['/linkedin-brand.html', 'Authority Engine'],
    ['/linkedin-publisher.html', 'Publisher'],
    ['/hud.html', 'HUD'],
    ['/hud-mobile.html', 'HUD Mobile'],
    ['/mobile.html', 'Mobile'],
    ['/linkedin-compose.html', 'Composer'],
    ['/linkedin-history.html', 'Editorial History'],
    ['/linkedin-assets.html', 'Visual Assets'],
    ['/settings.html', 'Settings'],
    ['/image-settings.html', 'Image AI'],
  ];
  const path = window.location.pathname;
  const active = href => href === '/' ? path === '/' || path.endsWith('/index.html') : path.endsWith(href);
  const header = document.createElement('header');
  header.className = 'munin-bar';
  header.innerHTML = `<div class="munin-bar-inner">
    <a class="munin-bar-brand" href="/" aria-label="Munin Command Center"><span class="munin-mark" aria-hidden="true"><img src="/brand/munin-raven-icon.svg" alt="" width="28" height="28"></span><strong>MUNIN</strong></a>
    <nav class="munin-primary" aria-label="Workspace">${sections.map(x => `<a href="${x.href}" class="${active(x.href) ? 'active' : ''}">${x.label}</a>`).join('')}</nav>
    <button type="button" class="munin-motion-toggle" aria-pressed="false">Animações</button>
    <details class="munin-more"><summary>Tools</summary><div class="munin-menu">${tools.map(([href,label]) => `<a href="${href}" class="${active(href) ? 'active' : ''}">${label}</a>`).join('')}</div></details>
  </div>`;
  document.body.prepend(header);
  const mobileNav = document.createElement('nav');
  mobileNav.className = 'munin-mobile-nav';
  mobileNav.setAttribute('aria-label', 'Navegação principal mobile');
  mobileNav.innerHTML = [
    ['/', '⌂', 'Hoje'],
    ['/action-inbox.html', '◎', 'Inbox'],
    ['/career-command.html', '◇', 'Carreira'],
    ['/linkedin.html', '◫', 'LinkedIn'],
    ['/operator-hub.html', '⋯', 'Mais'],
  ].map(([href, icon, label]) => `<a href="${href}" class="${active(href) ? 'active' : ''}"><span aria-hidden="true">${icon}</span><b>${label}</b></a>`).join('');
  document.body.appendChild(mobileNav);
  const commands = [
    ['/', 'Home', 'Visão geral do workspace'],
    ['/action-inbox.html', 'Action Inbox', 'O que precisa de atenção'],
    ['/operator-hub.html', 'Today · Operator Hub', 'Agenda, follow-ups e aprovações'],
    ['/operator-chat.html', 'Chat operacional', 'Executar comandos e perguntar ao Claude'],
    ['/flows.html', 'Fluxos', 'Acompanhar rotas e tentativas'],
    ['/radar.html', 'Radar', 'Sinais e fontes confiáveis'],
    ['/executive-briefing.html', 'Briefing', 'Prioridades adaptativas'],
    ['/career-command.html', 'Career', 'Pipeline profissional'],
    ['/context-memory.html', 'Memory', 'Contexto durável'],
    ['/viral-engine.html', 'Viral Engine', 'Descobrir, produzir e aprender com conteúdo'],
    ['/offer-architect.html', 'Offer Architect', 'Construir e validar ofertas com Evidence Gate'],
    ...sections.filter(x=>!['/','/action-inbox.html','/operator-hub.html','/operator-chat.html','/flows.html','/radar.html','/executive-briefing.html','/career-command.html','/context-memory.html','/viral-engine.html','/offer-architect.html'].includes(x.href)).map(x=>[x.href,x.label,'Abrir módulo']),
    ...tools.map(([href,label])=>[href,label,'Ferramentas e configuração']),
  ];
  // Local, reversible actions only. Anything consequential stays behind its screen's approval flow.
  const actions = [
    { id: 'motion', label: 'Alternar animações', detail: 'Pausar ou retomar movimento do workspace', run: () => document.querySelector('.munin-motion-toggle')?.click() },
    { id: 'copy-link', label: 'Copiar link desta tela', detail: 'Copia o endereço atual para a área de transferência', run: () => navigator.clipboard?.writeText(window.location.href)?.catch(() => {}) },
    { id: 'reload', label: 'Recarregar tela', detail: 'Buscar o estado mais recente', run: () => window.location.reload() },
  ];
  const recentKey='munin.command.recent';
  const readRecent=()=>{try{const value=JSON.parse(localStorage.getItem(recentKey)||'[]');return Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,5):[]}catch{return[]}};
  const remember=key=>{try{localStorage.setItem(recentKey,JSON.stringify([key,...readRecent().filter(x=>x!==key)].slice(0,5)))}catch{}};
  const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const entries=[...commands.map(([href,label,detail])=>({key:href,href,label,detail})),...actions.map(x=>({...x,key:`action:${x.id}`,kind:'Ação'}))].filter((x,i,all)=>all.findIndex(y=>y.key===x.key)===i);
  const commandButton=document.createElement('button');commandButton.className='munin-command-launch';commandButton.innerHTML='<span>＋</span><b>Ação rápida</b>';commandButton.setAttribute('aria-label','Abrir ações rápidas e comandos');commandButton.setAttribute('aria-keyshortcuts','Control+K Meta+K');
  const palette=document.createElement('dialog');palette.className='munin-command-overlay';palette.innerHTML=`<section class="munin-command-sheet" aria-label="Paleta de comandos"><div class="munin-command-head"><strong>IR PARA</strong><button aria-label="Fechar">×</button></div><input class="munin-command-search" role="combobox" aria-expanded="true" aria-controls="munin-command-list" aria-autocomplete="list" aria-label="Buscar módulo ou ação" placeholder="Buscar módulo ou ação…" autocomplete="off"><div class="munin-command-results" id="munin-command-list" role="listbox"></div><footer class="munin-command-hints" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></footer></section>`;
  document.body.append(palette,commandButton);const search=palette.querySelector('input'),results=palette.querySelector('.munin-command-results');
  let visible=[],selected=0;
  const select=index=>{const items=[...results.querySelectorAll('[role="option"]')];if(!items.length){search.removeAttribute('aria-activedescendant');return}selected=(index+items.length)%items.length;items.forEach((item,i)=>item.setAttribute('aria-selected',String(i===selected)));search.setAttribute('aria-activedescendant',items[selected].id);items[selected].scrollIntoView({block:'nearest'})};
  const render=()=>{const q=search.value.toLowerCase().trim();const recent=q?[]:readRecent().map(key=>entries.find(x=>x.key===key)).filter(Boolean);visible=[...recent,...entries.filter(x=>!recent.includes(x)&&(!q||`${x.label} ${x.detail}`.toLowerCase().includes(q)))];results.innerHTML=visible.map((x,i)=>`<a id="munin-command-${i}" role="option" aria-selected="false" href="${x.href||'#'}" data-index="${i}"><b>${escapeHtml(x.label)}${i<recent.length?'<em>Recente</em>':x.kind?`<em>${x.kind}</em>`:''}</b><span>${escapeHtml(x.detail)}</span></a>`).join('')||'<p>Nenhum comando encontrado.</p>';select(0)};
  const open=()=>{palette.classList.add('open');search.value='';render();palette.showModal();search.focus()},close=()=>{palette.classList.remove('open');palette.close()};
  const activate=index=>{const entry=visible[index];if(!entry)return;remember(entry.key);if(entry.run){close();entry.run()}else window.location.href=entry.href};
  palette.setAttribute('aria-label','Buscar telas do Munin');palette.addEventListener('cancel',()=>palette.classList.remove('open'));commandButton.onclick=open;palette.onclick=e=>{if(e.target===palette)close()};palette.querySelector('button').onclick=close;search.oninput=render;
  results.addEventListener('click',e=>{const item=e.target.closest('[role="option"]');if(!item)return;e.preventDefault();activate(Number(item.dataset.index))});
  results.addEventListener('mousemove',e=>{const item=e.target.closest('[role="option"]');if(item&&Number(item.dataset.index)!==selected)select(Number(item.dataset.index))});
  search.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();select(selected+1)}else if(e.key==='ArrowUp'){e.preventDefault();select(selected-1)}else if(e.key==='Enter'){e.preventDefault();activate(selected)}});
  window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palette.classList.contains('open')?close():open()}if(e.key==='Escape')close()});
})();
