(() => {
  const { request, escapeHtml: esc } = window.Munin;
  const $ = id => document.getElementById(id);
  let loading = false;
  const rank = { P0:0, P1:1, P2:2 };
  const empty = text => `<p class="muted">${esc(text)}</p>`;
  // Navigation stays within known Munin surfaces; API-provided URLs cannot execute code.
  const destinations = new Set(['/', '/action-inbox.html', '/career-inbox.html', '/manus.html', '/radar.html']);
  function priorities(data) {
    if (!Array.isArray(data?.items)) throw Error('Invalid action inbox');
    const items = data.items.filter(item => ['now','review','executing'].includes(item.lane))
      .sort((a,b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3)).slice(0,5);
    return items.length ? items.map(item => {
      const href = destinations.has(item.action?.href ?? item.href) ? item.action?.href ?? item.href : '/action-inbox.html';
      return `<div class="card"><span class="tag">${esc(item.priority)}</span><span class="tag">${esc(item.lane === 'review' ? 'Revisar' : item.lane === 'executing' ? 'Em execução' : 'Agora')}</span><h3>${esc(item.title)}</h3><p>${esc(item.recommendation ?? 'Revisar a próxima etapa na Action Inbox.')}</p><a href="${esc(href)}">Abrir ação →</a></div>`;
    }).join('') : empty('Nenhuma ação aberta na Action Inbox.');
  }
  function checkpoints(data) {
    if (!data?.executive) throw Error('Invalid executive snapshot');
    const items = [...(data.executive.blocked ?? []), ...(data.executive.active ?? []), ...(data.executive.recentlyCompleted ?? [])].slice(0,5);
    const labels = {running:'Em execução',done:'Concluído',blocked:'Bloqueado',failed:'Falhou'};
    return items.length ? items.map(item => `<div class="card"><span class="tag">${esc(labels[item.status] ?? 'Estado desconhecido')}</span><h3>${esc(item.objective)}</h3><p>${esc(item.blocker ?? item.summary ?? item.phase)}</p>${item.updatedAt ? `<small>${esc(new Date(item.updatedAt).toLocaleString())}</small>` : ''}</div>`).join('') : empty('Nenhum checkpoint executivo registrado.');
  }
  function runtime(data) {
    if (!data?.engineering || !data?.controlRoom) throw Error('Invalid runtime snapshot');
    const rows = [
      ['Control Room', data.controlRoom.ready ? 'Pronto' : 'Requer atenção'],
      ['Trabalhos ativos', data.engineering.active],
      ['Aguardando você', data.engineering.needsUser],
      ['Trabalhos com falha', data.engineering.failed],
      ['Worker de email', data.email?.workerStatus ?? 'Desconhecido'],
    ];
    return rows.map(([label,value]) => `<div class="active-row"><span>${esc(label)}</span><strong>${esc(value ?? 'Desconhecido')}</strong></div>`).join('')
      + (data.attention ?? []).slice(0,4).map(item => `<p class="warning">${esc(item)}</p>`).join('');
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    $('coreRefresh').disabled = true;
    $('coreFreshness').textContent = 'Atualizando fontes locais…';
    const sources = [
      ['corePriorities','/api/action-inbox',priorities],
      ['coreCheckpoints','/api/second-brain/daily',checkpoints],
      ['coreRuntime','/api/orchestrate/status',runtime],
    ];
    const results = await Promise.all(sources.map(async ([id,path,render]) => {
      try { $(id).innerHTML = render(await request(path, {signal:AbortSignal.timeout(15000)})); return true; }
      catch { $(id).innerHTML = empty('Fonte indisponível. Atualize para tentar novamente.'); return false; }
    }));
    $('coreFreshness').textContent = `${results.every(Boolean) ? 'Atualizado' : 'Atualização parcial'} às ${new Date().toLocaleTimeString()}`;
    $('coreRefresh').disabled = false;
    loading = false;
  }
  window.muninCore = Object.freeze({refresh});
  $('coreRefresh').addEventListener('click', () => void refresh());
  void refresh();
})();
