(() => {
  const token = () => localStorage.getItem('munin-mobile-token') || '';
  const headers = () => ({ 'content-type': 'application/json', authorization: `Bearer ${token()}` });
  const escape = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function mount() {
    if (document.getElementById('approval-panel')) return document.getElementById('approval-panel');
    const panel = document.createElement('section');
    panel.id = 'approval-panel';
    panel.className = 'hud-panel hud-approval-panel';
    panel.innerHTML = '<span class="hud-label">APROVAÇÕES</span><div id="hud-approvals">Carregando…</div>';
    const career = document.getElementById('career-panel');
    (career?.parentElement || document.body).insertBefore(panel, career || null);
    const style = document.createElement('style');
    style.textContent = '.hud-approval-panel{order:3!important}.hud-approval-item{border-top:1px solid rgba(92,146,170,.18);padding:10px 0}.hud-approval-item:first-child{border-top:0;padding-top:0}.hud-approval-item b{display:block;font-size:13px;line-height:1.35;color:#d9f6ff}.hud-approval-item small{display:block;color:#7294a4;font-size:10px;line-height:1.35;margin:4px 0 8px}.hud-approval-actions{display:flex;gap:7px}.hud-approval-actions button,.hud-approval-link{border:1px solid #234554;border-radius:8px;padding:8px 10px;background:rgba(4,18,27,.9);color:#9ed8e8;font-size:10px;text-decoration:none}.hud-approval-actions .approve{background:#67d7af;border-color:#67d7af;color:#03110d}.hud-approval-actions .reject{border-color:#73404b;color:#ff9cab}.hud-approval-empty{font-size:11px;color:#7294a4}';
    document.head.appendChild(style);
    return panel;
  }

  async function request(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  }
  async function resolve(id, action, button) {
    const verb = action === 'approve' ? 'aprovar' : 'rejeitar';
    if (!confirm(`Deseja ${verb} esta ação?`)) return;
    button.disabled = true;
    try {
      await request(`/api/mobile/approvals/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: '{}' });
      await load();
    } catch (error) {
      button.disabled = false;
      const toast = document.getElementById('hud-toast');
      if (toast) { toast.textContent = error.message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); }
    }
  }

  async function load() {
    const panel = mount();
    const root = panel.querySelector('#hud-approvals');
    if (!token()) {
      root.innerHTML = '<div class="hud-approval-empty">Token mobile não configurado neste navegador.</div><a class="hud-approval-link" href="/action-inbox.html">Abrir Action Inbox</a>';
      return;
    }
    try {
      const payload = await request('/api/mobile/approvals');
      const items = (payload.items || []).filter(item => item.status === 'pending').slice(0, 3);
      root.innerHTML = items.length ? items.map(item => `<div class="hud-approval-item"><b>${escape(item.decision?.request?.tool || 'Ação externa')}</b><small>${escape(item.decision?.request?.target || item.decision?.rule || 'Revisão humana necessária')}</small><div class="hud-approval-actions"><button class="approve" data-action="approve" data-id="${escape(item.id)}">APROVAR</button><button class="reject" data-action="reject" data-id="${escape(item.id)}">REJEITAR</button></div></div>`).join('') : '<div class="hud-approval-empty">Nenhuma aprovação pendente.</div>';
      root.querySelectorAll('button[data-id]').forEach(button => button.onclick = () => resolve(button.dataset.id, button.dataset.action, button));
    } catch (error) {
      root.innerHTML = `<div class="hud-approval-empty">${escape(error.message)}</div><a class="hud-approval-link" href="/action-inbox.html">Abrir Action Inbox</a>`;
    }
  }

  window.addEventListener('DOMContentLoaded', load, { once: true });
  window.addEventListener('focus', load);
})();
