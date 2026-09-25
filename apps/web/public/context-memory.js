(() => {
  const { request, toast, escapeHtml: esc, setBusy } = window.Munin;
  let state = null;
  let seed = null;
  let coreState = null;

  const $ = id => document.getElementById(id);
  const scopeClass = scope => scope === 'public-professional' ? 'public' : scope === 'sensitive-private' ? 'sensitive' : 'private';
  const clean = value => String(value ?? '').trim();
  const firstUsefulLine = text => clean(text).split(/\r?\n/).map(x => x.trim()).find(x => x && !x.startsWith('#')) || 'Sem informação registrada';

  function renderTimeline(items) {
    $('timeline').innerHTML = items?.length
      ? items.slice(0,10).map(item => `<div class="event"><span class="event-dot"></span><div><b>${esc(item.title)}</b><div class="meta">${esc(new Date(item.at).toLocaleString())}</div><div class="summary">${esc(item.summary)}</div></div></div>`).join('')
      : '<p class="muted">A timeline será preenchida automaticamente conforme tarefas usarem PRE-TASK / POST-TASK.</p>';
  }

  function renderCore(core, data) {
    coreState = core;
    $('coreOnline').textContent = core.online ? 'MEMORY ONLINE' : 'MEMORY OFFLINE';
    const vault = core.vault ?? {};
    $('coreMeta').textContent = vault.exists
      ? `Local-first · Vault ativo em ${vault.root}`
      : 'Local-first · Vault ainda não inicializado';

    const timeline = core.controlRoom?.timeline ?? [];
    const decisions = timeline.filter(x => /decision|decis[aã]o/i.test(`${x.title} ${x.summary}`)).length;
    const metrics = [
      ['Contextos', data.summary.sections],
      ['Notas Vault', vault.markdownFiles ?? 0],
      ['Eventos', timeline.length],
      ['Decisões', decisions],
    ];
    $('coreMetrics').innerHTML = metrics.map(([label,value]) => `<div class="metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join('');

    const currentState = core.controlRoom?.currentState ?? '';
    const backlog = core.controlRoom?.backlog ?? '';
    const latest = timeline[0];
    const next = firstUsefulLine(backlog);
    $('activeContext').innerHTML = [
      ['Projeto atual', 'Munin Core'],
      ['Estado atual', firstUsefulLine(currentState)],
      ['Último evento', latest ? latest.title : 'Sem eventos recentes'],
      ['Próximo passo', next],
    ].map(([label,value]) => `<div class="active-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');

    $('knowledgeMap').innerHTML = [
      ['Context Memory', data.summary.sections],
      ['Vault', vault.markdownFiles ?? 0],
      ['Timeline', timeline.length],
      ['Imports', data.summary.imports ?? data.state.imports.length],
    ].map(([label,value]) => `<div class="node"><div class="value">${esc(value)}</div><div class="label">${esc(label)}</div></div>`).join('');
    renderTimeline(timeline);
  }

  async function loadCore(data) {
    try {
      const core = await request('/api/second-brain/status');
      if (data) renderCore(core, data);
      return core;
    } catch (error) {
      $('coreOnline').textContent = 'MEMORY STATUS INDISPONÍVEL';
      $('coreMeta').textContent = error.message;
      renderTimeline([]);
      throw error;
    }
  }

  async function initVault() {
    try {
      const result = await request('/api/second-brain/vault/init', { method:'POST', body:'{}' });
      toast(`Vault inicializado · ${result.createdFolders} pastas`);
      await load();
    } catch (error) { toast(error.message, 'danger'); }
  }

  async function syncVault() {
    try {
      const result = await request('/api/second-brain/vault/sync', { method:'POST', body:'{}' });
      toast(`${result.exported.length} seções espelhadas no Obsidian`);
      await load();
    } catch (error) { toast(error.message, 'danger'); }
  }

  function renderRecall(result) {
    const contextMatches = result.context?.matches ?? [];
    const vaultMatches = result.vault?.matches ?? [];
    const timeline = result.controlRoom?.timeline ?? [];
    const current = result.controlRoom?.currentState ?? '';
    const backlog = result.controlRoom?.backlog ?? '';
    $('recallOutput').innerHTML = [
      ['Estado atual', current || 'Sem estado operacional registrado.'],
      ['Backlog', backlog || 'Sem backlog registrado.'],
      ['Context Memory', contextMatches.length ? contextMatches.map(x => `${x.section?.key ?? 'contexto'}: ${JSON.stringify(x.section?.value ?? {})}`).join('\n\n') : 'Nenhum match governado encontrado.'],
      ['Vault', vaultMatches.length ? vaultMatches.map(x => `${x.path ?? x.file ?? 'nota'}${x.excerpt ? ` — ${x.excerpt}` : ''}`).join('\n') : 'Nenhum match no Vault.'],
      ['Timeline recente', timeline.length ? timeline.slice(0,5).map(x => `${new Date(x.at).toLocaleString()} · ${x.title}`).join('\n') : 'Sem eventos recentes.'],
    ].map(([title,body]) => `<div class="recall-section"><b>${esc(title)}</b><pre>${esc(body)}</pre></div>`).join('');
  }

  async function recall() {
    const input = $('recallQuery');
    const task = input.value.trim();
    if (!task) return;
    $('recallOutput').textContent = 'Recuperando contexto…';
    try {
      const result = await request('/api/second-brain/recall', { method:'POST', body:JSON.stringify({ task, project:'munin', consumer:'assistant' }) });
      renderRecall(result);
      if (state) await loadCore({ state, summary:{ sections:Object.keys(state.sections).length, imports:state.imports.length } }).catch(() => {});
    } catch (error) {
      $('recallOutput').textContent = error.message;
      toast(error.message, 'danger');
    }
  }

  function useRecall(text) { $('recallQuery').value = text; void recall(); }

  async function load() {
    try {
      const data = await request('/api/context-memory');
      state = data.state;
      $('stats').innerHTML = [
        ['SEÇÕES', data.summary.sections],
        ['PÚBLICO', data.summary.scopes['public-professional'] || 0],
        ['OPERACIONAL', data.summary.scopes['private-operational'] || 0],
        ['SENSÍVEL', data.summary.scopes['sensitive-private'] || 0],
      ].map(([label,value]) => `<div class="metric"><b>${value}</b><span>${label}</span></div>`).join('');
      $('updated').textContent = state.updatedAt && state.updatedAt.startsWith('1970') ? 'ainda não inicializada' : `Atualizada ${new Date(state.updatedAt).toLocaleString()}`;
      const values = Object.values(state.sections);
      $('sections').innerHTML = values.length
        ? values.map(section => `<div class="card"><div class="row"><div><span class="tag ${scopeClass(section.scope)}">${esc(section.scope)}</span><span class="tag">${esc(section.confidence)}</span><span class="tag">${esc(section.freshness)}</span></div><span class="meta">v${section.version}</span></div><h3>${esc(section.key)}</h3><div class="meta">Fonte: ${esc(section.source)} · ${new Date(section.updatedAt).toLocaleString()}</div></div>`).join('')
        : '<p class="muted">Nenhuma memória bootstrap importada ainda.</p>';
      $('imports').innerHTML = state.imports.length
        ? state.imports.slice(0,8).map(item => `<div class="card"><b>${esc(item.source)}</b><div class="meta">${new Date(item.at).toLocaleString()} · ${item.keys.length} seções</div><div>${item.keys.map(key => `<span class="tag">${esc(key)}</span>`).join('')}</div></div>`).join('')
        : '<p class="muted">Sem imports.</p>';
      await loadCore(data);
    } catch (error) { toast(error.message, 'danger'); }
  }

  async function previewSeed(value) {
    seed = value;
    try {
      const preview = await request('/api/context-memory/preview', { method:'POST', body:JSON.stringify({ seed:value }) });
      $('preview').innerHTML = `<div class="ok">${preview.keys.length} seções detectadas · ${preview.newKeys.length} novas · ${preview.conflicts.length} conflitos</div>${preview.warnings.map(w => `<div class="warning">${esc(w)}</div>`).join('')}<div>${preview.keys.map(key => `<span class="tag">${esc(key)}</span>`).join('')}</div>`;
      $('importBtn').disabled = false;
    } catch (error) { seed = null; $('importBtn').disabled = true; toast(error.message, 'danger'); }
  }

  async function handleFile(file) { try { await previewSeed(JSON.parse(await file.text())); } catch (error) { toast(`JSON inválido: ${error.message}`, 'danger'); } }

  async function doImport() {
    if (!seed) return;
    const button = $('importBtn'); setBusy(button, true, 'IMPORTANDO…');
    try {
      const result = await request('/api/context-memory/import', { method:'POST', body:JSON.stringify({ seed, source:'Munin Context Seed Pack v1', replaceConflicts:$('replace').checked }) });
      toast(`${result.imported.length} seções importadas · ${result.skipped.length} preservadas`); await load();
    } catch (error) { toast(error.message, 'danger'); } finally { setBusy(button, false); }
  }

  async function searchMemory(includeSensitive) {
    const query = $('query').value.trim(); if (!query) return;
    try {
      const scopes = includeSensitive ? 'public-professional,private-operational,sensitive-private' : 'public-professional,private-operational';
      const result = await request(`/api/context-memory/query?q=${encodeURIComponent(query)}&scopes=${scopes}`);
      $('queryResults').innerHTML = result.results.length ? result.results.map(item => `<div class="card"><b>${esc(item.section.key)}</b> <span class="tag ${scopeClass(item.section.scope)}">${esc(item.section.scope)}</span><pre class="results">${esc(JSON.stringify(item.section.value,null,2))}</pre></div>`).join('') : 'Nenhum contexto encontrado.';
    } catch (error) { toast(error.message, 'danger'); }
  }

  window.contextMemory = Object.freeze({ load, doImport, searchMemory, initVault, syncVault, recall, useRecall });
  $('file').addEventListener('change', () => $('file').files[0] && handleFile($('file').files[0]));
  ['dragenter','dragover'].forEach(name => $('drop').addEventListener(name, event => { event.preventDefault(); $('drop').classList.add('over'); }));
  ['dragleave','drop'].forEach(name => $('drop').addEventListener(name, event => { event.preventDefault(); $('drop').classList.remove('over'); }));
  $('drop').addEventListener('drop', event => event.dataTransfer.files[0] && handleFile(event.dataTransfer.files[0]));
  void load();
})();
