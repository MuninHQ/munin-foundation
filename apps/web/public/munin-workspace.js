/* Shared presentation only: no API calls or operational state changes. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  try { paused = localStorage.getItem('munin.workspace.motion') === 'off'; } catch {}
  const apply = () => {
    root.dataset.workspaceMotion = paused || reduced.matches ? 'off' : 'on';
    window.dispatchEvent(new CustomEvent('munin:workspace-motion', { detail: { paused: paused || reduced.matches } }));
    document.querySelectorAll('.munin-motion-toggle').forEach(button => {
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = reduced.matches ? 'Movimento reduzido' : paused ? 'Animações pausadas' : 'Animações ativas';
      button.disabled = reduced.matches;
    });
    // Reuse the HUD's renderer control instead of hiding a running canvas.
    const toggle = document.getElementById('hud-fx-toggle');
    if (toggle && /AMBIENT ON/.test(toggle.textContent) && (paused || reduced.matches)) toggle.click();
  };
  const boot = () => {
    document.body.classList.add('munin-workspace');
    document.querySelectorAll('.munin-bar a.active,.munin-mobile-nav a.active').forEach(link => link.setAttribute('aria-current', 'page'));
    if (!document.querySelector('.munin-motion-toggle')) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'munin-motion-toggle workspace-motion-floating';
      document.body.append(button);
    }
    document.querySelectorAll('.munin-motion-toggle').forEach(button => button.addEventListener('click', () => {
      paused = !paused;
      try { localStorage.setItem('munin.workspace.motion', paused ? 'off' : 'on'); } catch {}
      apply();
    }));
    const main = document.querySelector('main');
    if (main && !main.id) main.id = 'workspace-content';
    if (main && !document.querySelector('.hud-skip-link')) {
      const skip = document.createElement('a'); skip.className = 'workspace-skip';
      const hud = document.body.classList.contains('hud-body');
      skip.href = hud ? '#hud-command-input' : `#${main.id}`;
      skip.textContent = hud ? 'Pular para o comando' : 'Pular para o conteúdo'; document.body.prepend(skip);
    }
    if (document.body.classList.contains('hud-body')) {
      const link = document.createElement('a'); link.className = 'workspace-hud-home';
      link.href = '/'; link.textContent = '← Workspace'; document.body.append(link);
    }
    apply();
  };
  reduced.addEventListener('change', apply);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
