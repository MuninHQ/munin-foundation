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
  ];
  const tools = [
    ['/email-intelligence.html', 'Email Intelligence'],
    ['/career-inbox.html', 'Career Inbox'],
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
    <a class="munin-bar-brand" href="/" aria-label="Munin Command Center"><span class="munin-mark" aria-hidden="true">M</span><strong>MUNIN</strong></a>
    <nav class="munin-primary" aria-label="Workspace">${sections.map(x => `<a href="${x.href}" class="${active(x.href) ? 'active' : ''}">${x.label}</a>`).join('')}</nav>
    <details class="munin-more"><summary>Tools</summary><div class="munin-menu">${tools.map(([href,label]) => `<a href="${href}" class="${active(href) ? 'active' : ''}">${label}</a>`).join('')}</div></details>
  </div>`;
  document.body.prepend(header);
  const commands = [
    ['/', 'Home', 'Visão geral do workspace'],
    ['/action-inbox.html', 'Action Inbox', 'O que precisa de atenção'],
    ['/operator-hub.html', 'Today · Operator Hub', 'Agenda, follow-ups e aprovações'],
    ['/operator-chat.html', 'Chat operacional', 'Executar comandos e continuar no ChatGPT'],
    ['/flows.html', 'Fluxos', 'Acompanhar rotas e tentativas'],
    ['/radar.html', 'Radar', 'Sinais e fontes confiáveis'],
    ['/executive-briefing.html', 'Briefing', 'Prioridades adaptativas'],
    ['/career-command.html', 'Career', 'Pipeline profissional'],
    ['/context-memory.html', 'Memory', 'Contexto durável'],
  ];
  const commandButton=document.createElement('button');commandButton.className='munin-command-launch';commandButton.innerHTML='<span>⌘</span><b>Comandos</b>';commandButton.setAttribute('aria-label','Abrir paleta de comandos');
  const palette=document.createElement('div');palette.className='munin-command-overlay';palette.innerHTML=`<section class="munin-command-sheet" role="dialog" aria-modal="true" aria-label="Paleta de comandos"><div class="munin-command-head"><strong>IR PARA</strong><button aria-label="Fechar">×</button></div><input class="munin-command-search" placeholder="Buscar módulo ou ação…" autocomplete="off"><div class="munin-command-results"></div></section>`;
  document.body.append(palette,commandButton);const search=palette.querySelector('input'),results=palette.querySelector('.munin-command-results');
  const render=()=>{const q=search.value.toLowerCase().trim();results.innerHTML=commands.filter(x=>!q||`${x[1]} ${x[2]}`.toLowerCase().includes(q)).map(([href,label,detail])=>`<a href="${href}"><b>${label}</b><span>${detail}</span></a>`).join('')||'<p>Nenhum comando encontrado.</p>'};
  const open=()=>{palette.classList.add('open');render();setTimeout(()=>search.focus(),0)},close=()=>palette.classList.remove('open');commandButton.onclick=open;palette.onclick=e=>{if(e.target===palette)close()};palette.querySelector('button').onclick=close;search.oninput=render;
  window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palette.classList.contains('open')?close():open()}if(e.key==='Escape')close()});
})();
