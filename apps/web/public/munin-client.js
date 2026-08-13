/* Shared browser client for standalone Munin pages. */
(() => {
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body != null && !headers.has('content-type') && !(options.body instanceof FormData)) {
      headers.set('content-type', 'application/json');
    }
    const response = await fetch(path, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = payload && typeof payload === 'object' && 'error' in payload
        ? payload.error
        : `Request failed (${response.status})`;
      throw new Error(String(message));
    }
    return payload;
  }

  function toast(message, tone = 'ok', timeout = 4200) {
    const region = document.getElementById('munin-toast-region') || (() => {
      const node = document.createElement('div');
      node.id = 'munin-toast-region';
      node.className = 'munin-toast-region';
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
      return node;
    })();
    const item = document.createElement('div');
    item.className = `munin-toast munin-toast-${tone}`;
    item.textContent = String(message);
    region.appendChild(item);
    requestAnimationFrame(() => item.classList.add('visible'));
    setTimeout(() => {
      item.classList.remove('visible');
      setTimeout(() => item.remove(), 180);
    }, timeout);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function setBusy(element, busy, label) {
    if (!element) return;
    if (busy) {
      element.dataset.muninLabel = element.textContent || '';
      element.disabled = true;
      element.setAttribute('aria-busy', 'true');
      if (label) element.textContent = label;
      return;
    }
    element.disabled = false;
    element.removeAttribute('aria-busy');
    if (element.dataset.muninLabel != null) element.textContent = element.dataset.muninLabel;
  }

  window.Munin = Object.freeze({ request, toast, escapeHtml, setBusy });

  if (location.pathname.endsWith('/hud.html') || location.pathname === '/hud') {
    const script = document.createElement('script');
    script.src = '/hud-orchestration.js';
    script.defer = true;
    document.head.appendChild(script);
  }
})();
