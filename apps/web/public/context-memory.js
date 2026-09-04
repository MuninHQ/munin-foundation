(() => {
  const { request, toast, escapeHtml: esc, setBusy } = window.Munin;
  let state = null;
  let seed = null;

  const $ = id => document.getElementById(id);
  const scopeClass = scope => scope === 'public-professional' ? 'public' : scope === 'sensitive-private' ? 'sensitive' : 'private';

  function renderTimeline(items) {
    $('timeline').innerHTML = items?.length
      ? items.map(item => `<div class="event"><span class="event-dot"></span><div><b>${esc(item.title)}</b><div class="meta">${esc(new Date(item.at).toLocaleString())}</div><div class="muted" style="margin-top:4px">${esc(item.summary).replace(/\n/g,'<br>')}</div></div></div>`).join('')
      : '<p class="muted">A timeline será preenchida automaticamente conforme tarefas usarem o protocolo PRE-TASK / POST-TASK.</p>';
  }

  async function loadCore() {
    try {
      const core = await request('/api/second-brain/status');
      $('coreOnline').textContent = core.online ? 'MEMORY ONLINE' : 'MEMORY OFFLINE';
      const vault = core.vault;
      $('coreMeta').textContent = vault.exists
        ? `Local-first · R$ 0 obrigatório · Vault ${vault.markdownFiles} notas / ${vault.folders} pastas · ${vault.root}`
        : 'Local-first · R$ 0 obrigatório · Vault ainda não inicializado';
      renderTimeline(core.controlRoom.timeline);
    } catch (error) {
      $('coreOnline').textContent = 'MEMORY STATUS INDISPONÍVEL';
      $('coreMeta').textContent = error.message;
      renderTimeline([]);
    }
  }

  async function initVault() {
    try {
      const result = await request('/api/second-brain/vault/init', { method:'POST', body:'{}' });
      toast(`Vault inicializado · ${result.createdFolders} pastas`);
      await loadCore();
    } catch (error) { toast(error.message, 'danger'); }
  }

  async function syncVault() {
    try {
      const result = await request('/api/second-brain/vault/sync', { method:'POST', body:'{}' });
      toast(`${result.exported.length} seções espelhadas no Obsidian`);
      await loadCore();
    } catch (error) { toast(error.message, 'danger'); }
  }

  async function load() {
    try {
      const [data] = await Promise.all([request('/api/context-memory'), loadCore()]);
      state = data.state;
      $('stats').innerHTML = [
        ['SEÇÕES', data.summary.sections],
        ['PÚBLICO', data.summary.scopes['public-professional'] || 0],
        ['OPERACIONAL', data.summary.scopes['private-operational'] || 0],
        ['SENSÍVEL', data.summary.scopes['sensitive-private'] || 0],
      ].map(([label,value]) => `<div class="stat"><div class="eyebrow">${label}</div><div class="num">${value}</div></div>`).join('');
      $('updated').textContent = state.updatedAt && state.updatedAt.startsWith('1970')
        ? 'ainda não inicializada'
        : `Atualizada ${new Date(state.updatedAt).toLocaleString()}`;
      const values = Object.values(state.sections);
      $('sections').innerHTML = values.length
        ? values.map(section => `<div class="card"><div class="row"><div><span class="tag ${scopeClass(section.scope)}">${esc(section.scope)}</span><span class="tag">${esc(section.confidence)}</span><span class="tag">${esc(section.freshness)}</span></div><span class="meta">v${section.version}</span></div><h3>${esc(section.key)}</h3><div class="meta">Fonte: ${esc(section.source)} · ${new Date(section.updatedAt).toLocaleString()}</div></div>`).join('')
        : '<p class="muted">Nenhuma memória bootstrap importada ainda.</p>';
      $('imports').innerHTML = state.imports.length
        ? state.imports.slice(0,8).map(item => `<div class="card"><b>${esc(item.source)}</b><div class="meta">${new Date(item.at).toLocaleString()} · ${item.keys.length} seções</div><div>${item.keys.map(key => `<span class="tag">${esc(key)}</span>`).join('')}</div></div>`).join('')
        : '<p class="muted">Sem imports.</p>';
    } catch (error) {
      toast(error.message, 'danger');
    }
  }

  async function previewSeed(value) {
    seed = value;
    try {
      const preview = await request('/api/context-memory/preview', { method:'POST', body:JSON.stringify({ seed:value }) });
      $('preview').innerHTML = `<div class="ok">${preview.keys.length} seções detectadas · ${preview.newKeys.length} novas · ${preview.conflicts.length} conflitos</div>${preview.warnings.map(w => `<div class="warning">${esc(w)}</div>`).join('')}<div>${preview.keys.map(key => `<span class="tag">${esc(key)}</span>`).join('')}</div>${preview.conflicts.length ? `<p class="muted">Conflitos preservados por padrão: ${preview.conflicts.map(x => esc(x.key)).join(', ')}</p>` : ''}`;
      $('importBtn').disabled = false;
    } catch (error) {
      seed = null;
      $('importBtn').disabled = true;
      toast(error.message, 'danger');
    }
  }

  async function handleFile(file) {
    try { await previewSeed(JSON.parse(await file.text())); }
    catch (error) { toast(`JSON inválido: ${error.message}`, 'danger'); }
  }

  async function doImport() {
    if (!seed) return;
    const button = $('importBtn');
    setBusy(button, true, 'IMPORTANDO…');
    try {
      const result = await request('/api/context-memory/import', {
        method:'POST',
        body:JSON.stringify({ seed, source:'Munin Context Seed Pack v1', replaceConflicts:$('replace').checked }),
      });
      toast(`${result.imported.length} seções importadas · ${result.skipped.length} preservadas`);
      await load();
    } catch (error) { toast(error.message, 'danger'); }
    finally { setBusy(button, false); }
  }

  async function searchMemory(includeSensitive) {
    const query = $('query').value.trim();
    if (!query) return;
    try {
      const scopes = includeSensitive
        ? 'public-professional,private-operational,sensitive-private'
        : 'public-professional,private-operational';
      const result = await request(`/api/context-memory/query?q=${encodeURIComponent(query)}&scopes=${scopes}`);
      $('queryResults').innerHTML = result.results.length
        ? result.results.map(item => `<div class="card"><b>${esc(item.section.key)}</b> <span class="tag ${scopeClass(item.section.scope)}">${esc(item.section.scope)}</span><pre class="results">${esc(JSON.stringify(item.section.value,null,2))}</pre></div>`).join('')
        : 'Nenhum contexto encontrado.';
    } catch (error) { toast(error.message, 'danger'); }
  }

  window.contextMemory = Object.freeze({ load, doImport, searchMemory, initVault, syncVault });
  $('file').addEventListener('change', () => $('file').files[0] && handleFile($('file').files[0]));
  ['dragenter','dragover'].forEach(name => $('drop').addEventListener(name, event => { event.preventDefault(); $('drop').classList.add('over'); }));
  ['dragleave','drop'].forEach(name => $('drop').addEventListener(name, event => { event.preventDefault(); $('drop').classList.remove('over'); }));
  $('drop').addEventListener('drop', event => event.dataTransfer.files[0] && handleFile(event.dataTransfer.files[0]));
  load();
})();
