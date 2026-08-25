(() => {
  const request = window.MuninClient?.request ?? (async path => {
    const response = await fetch(path);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha');
    return data;
  });

  const pct = value => `${Math.round(Number(value || 0) * 100)}%`;
  const ms = value => Number(value || 0) >= 1000 ? `${(Number(value) / 1000).toFixed(1)}s` : `${Math.round(Number(value || 0))}ms`;

  async function refresh() {
    try {
      const [tracesPayload, metricsPayload, securityPayload] = await Promise.all([
        request('/api/orchestration/traces?limit=20'),
        request('/api/orchestration/metrics'),
        request('/api/orchestration/security-bench'),
      ]);
      const traces = tracesPayload.traces || [];
      const metrics = metricsPayload.metrics || {};
      const report = securityPayload.report || {};
      const latest = traces[0];
      const predictive = document.getElementById('hud-predictive');
      const panel = document.getElementById('hud-usage');
      if (predictive) predictive.textContent = metrics.runs
        ? `Autonomia 24h · ${pct(metrics.completionRate)} concluído · ${pct(metrics.retryRate)} fallback/retry · security ${report.score ?? '—'}%.`
        : `Orquestração pronta · security baseline ${report.score ?? '—'}%.`;
      if (panel) {
        const attempts = latest?.attempts || [];
        const lastProvider = latest?.selectedProviderId || attempts.at(-1)?.providerId || '—';
        const state = report.failed > 0 ? 'SECURITY HOLD' : latest ? (attempts.some(attempt => !attempt.ok) ? 'RECUPERADO' : 'NOMINAL') : 'IDLE';
        panel.innerHTML = `<div class="hud-stat"><span>Runs 24h</span><b>${metrics.runs ?? 0}</b></div><div class="hud-stat"><span>Completion</span><b>${pct(metrics.completionRate)}</b></div><div class="hud-stat"><span>Retry / fallback</span><b>${pct(metrics.retryRate)}</b></div><div class="hud-stat"><span>Median</span><b>${ms(metrics.medianDurationMs)}</b></div><div class="hud-stat"><span>Security bench</span><b>${report.passed ?? 0}/${report.total ?? 0}</b></div><div class="hud-stat"><span>Último provider</span><b>${lastProvider}</b></div><div class="hud-stat"><span>Estado</span><b>${state}</b></div>`;
      }
      const adaptive = document.getElementById('hud-adaptive');
      if (adaptive) adaptive.textContent = report.failed > 0 ? 'ADAPTIVE · SECURITY HOLD' : latest ? `ADAPTIVE · ${latest.route.toUpperCase()} · ${latest.selectedProviderId || 'LOCAL'}` : 'ADAPTIVE · READY';
    } catch {
      const predictive = document.getElementById('hud-predictive');
      if (predictive) predictive.textContent = 'Observabilidade da orquestração indisponível.';
    }
  }

  refresh();
  setInterval(refresh, 30000);
})();
