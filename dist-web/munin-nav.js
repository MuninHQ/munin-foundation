/*
 * Shared product navigation for the standalone Munin module pages.
 *
 * Injects one consistent product bar at the top of every page so the modules
 * feel like a single operating system instead of disconnected tools. The
 * React Command Center renders its own sidebar with the same destinations.
 */
(() => {
  const groups = [
    [
      ['/', 'Command Center'],
      ['/executive-briefing.html', 'Briefing'],
      ['/intelligence.html', 'Intelligence'],
    ],
    [
      ['/career-inbox.html', 'Career Inbox'],
      ['/context-memory.html', 'Context Memory'],
    ],
    [
      ['/linkedin.html', 'LinkedIn Studio'],
      ['/linkedin-compose.html', 'Composer'],
      ['/linkedin-history.html', 'Editorial History'],
      ['/linkedin-assets.html', 'Visual Assets'],
    ],
    [
      ['/settings.html', 'Settings'],
      ['/image-settings.html', 'Image AI'],
    ],
  ];

  const path = window.location.pathname;
  const bar = document.createElement('header');
  bar.className = 'munin-bar';
  const nav = groups
    .map(group =>
      group
        .map(([href, label]) => {
          const active = href === '/' ? path === '/' || path.endsWith('/index.html') : path.endsWith(href);
          return `<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
        })
        .join(''),
    )
    .join('<span class="sep"></span>');
  bar.innerHTML = `<div class="munin-bar-inner"><a class="munin-bar-brand" href="/"><span><i>ᛗ</i></span><strong>MUNIN</strong></a><nav>${nav}</nav></div>`;
  document.body.prepend(bar);
})();
