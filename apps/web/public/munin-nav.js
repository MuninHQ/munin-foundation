/* Shared Munin workspace shell for standalone module pages. */
(() => {
  const sections = [
    { label: 'Home', href: '/' },
    { label: 'Briefing', href: '/executive-briefing.html' },
    { label: 'Intelligence', href: '/intelligence.html' },
    { label: 'Council', href: '/council.html' },
    { label: 'Career', href: '/career-command.html' },
    { label: 'Memory', href: '/context-memory.html' },
    { label: 'LinkedIn', href: '/linkedin.html' },
  ];
  const tools = [
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
})();
