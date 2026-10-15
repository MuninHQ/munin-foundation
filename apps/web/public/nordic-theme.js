/* Shared reversible theme switch for Munin dashboard and adaptive HUD.
   No animation loop, remote resource, dependency, canvas or additional API call. */
(function () {
  'use strict';
  var KEY = 'munin.ui.theme.v1';
  var root = document.documentElement;
  var theme = 'nordic';
  try {
    var saved = window.localStorage.getItem(KEY);
    if (saved === 'classic' || saved === 'nordic') theme = saved;
  } catch (_) {
    // Private browsing or restricted storage: keep a session-only choice.
  }

  function applyTheme(value) {
    theme = value;
    root.setAttribute('data-munin-theme', theme);
    document.querySelectorAll('[data-munin-theme-toggle]').forEach(function (button) {
      var enabled = theme === 'nordic';
      button.textContent = enabled ? 'NORDIC ON' : 'NORDIC OFF';
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('title', enabled ? 'Voltar ao tema clássico' : 'Ativar tema nórdico');
    });
  }

  function toggleTheme() {
    var next = theme === 'nordic' ? 'classic' : 'nordic';
    applyTheme(next);
    try { window.localStorage.setItem(KEY, next); } catch (_) {}
  }

  function mountToggle() {
    var host = document.querySelector('.hud-top-actions') ||
      document.querySelector('.shell main > header .tools');
    if (!host) return false;
    if (!host.querySelector('[data-munin-theme-toggle]')) {
      var button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-munin-theme-toggle', '');
      button.setAttribute('aria-label', 'Alternar tema Nordic Intelligence');
      button.addEventListener('click', toggleTheme);
      host.appendChild(button);
    }
    applyTheme(theme);
    return true;
  }

  applyTheme(theme);
  function start() {
    if (mountToggle()) return;
    var observer = new MutationObserver(function () {
      if (mountToggle()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(function () { observer.disconnect(); }, 10000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
