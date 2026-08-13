(() => {
  const request = window.MuninClient?.request ?? (async path => {
    const response = await fetch(path);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha');
    return data;
  });

  function summarize(traces) {
    const recent = traces.slice(0, 20);
    const failedAttempts = recent.flatMap(trace => trace.attempts || []).filter(attempt => !attempt.ok).length;
    const fallbacks = recent.filter(trace => (trace.attempts || []).length > 1).length;
    const councils = recent.filter(trace => trace.route === 'council').length;
    const direct = recent.filter(trace => trace.route === 'direct').length;
    return { recent, failedAttempts, fallbacks, councils, direct, latest: recent[0] };
  }

  async function refresh() {
    try {
      const payload = await request('/api/orchestration/traces');
      const { recent, failedAttempts, fallbacks, councils, direct, latest } = summarize(payload.traces || []);
      const predictive = document.getElementById('hud-predictive');
      const panel = document.getElementById('hud-usage');
      if (predictive) predictive.textContent = recent.length
        ? `Orquestração nominal · ${fallbacks} fallback(s) · ${failedAttempts} tentativa(s) falharam.`
        : 'Orquestração pronta; aguardando execuções.';
      if (panel) {
        const attempts = latest?.attempts || [];
        const lastProvider = latest?.selectedProviderId || attempts.at(-1)?.providerId || '—';
        const state = latest ? (attempts.some(attempt => !attempt.ok) ? 'RECUPERADO' : 'NOMINAL') : 'IDLE';
        panel.innerHTML = `<div class="hud-stat"><span>Orchestrations</span><b>${recent.length}</b></div><div class="hud-stat"><span>Direct / Council</span><b>${direct} / ${councils}</b></div><div class="hud-stat"><span>Fallbacks</span><b>${fallbacks}</b></div><div class="hud-stat"><span>Último provider</span><b>${lastProvider}</b></div><div class="hud-stat"><span>Estado</span><b>${state}</b></div>`;
      }
      const adaptive = document.getElementById('hud-adaptive');
      if (adaptive && latest) adaptive.textContent = `ADAPTIVE · ${latest.route.toUpperCase()} · ${latest.selectedProviderId || 'LOCAL'}`;
    } catch {
      const predictive = document.getElementById('hud-predictive');
      if (predictive) predictive.textContent = 'Observabilidade da orquestração indisponível.';
    }
  }

  refresh();
  setInterval(refresh, 30000);
})();
