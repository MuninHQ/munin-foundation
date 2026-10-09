/* One presentation state for real API operations; never executes actions. */
(() => {
  const active = new Map();
  const labels = { idle:'Pronto para o próximo passo', thinking:'Atualizando contexto', searching:'Buscando informações', executing:'Executando solicitação', warning:'Requer atenção', done:'Solicitação concluída', listening:'Comandos abertos' };
  let terminal = 'idle', timer;
  const snapshot = () => {
    const operations = [...active.values()];
    const state = operations.length ? ['executing','searching','thinking'].find(value => operations.includes(value)) || 'thinking' : terminal;
    return { state, label:labels[state], pending:operations.length };
  };
  const publish = () => {
    const detail = snapshot();
    document.documentElement.dataset.muninState = detail.state;
    window.dispatchEvent(new CustomEvent('munin:presence', { detail }));
  };
  window.MuninPresence = Object.freeze({ snapshot });
  window.addEventListener('munin:state', event => {
    const detail = event.detail;
    if (!detail?.id || !Object.hasOwn(labels, detail.state)) return;
    clearTimeout(timer);
    if (detail.state === 'done' || detail.state === 'warning') {
      active.delete(detail.id);
      // Keep an error visible even if a parallel request subsequently succeeds.
      if (detail.state === 'warning' || terminal !== 'warning') terminal = detail.state;
      if (!active.size) timer = setTimeout(() => { terminal = 'idle'; publish(); }, terminal === 'warning' ? 5000 : 1800);
    } else {
      if (!active.size) terminal = 'idle';
      active.set(detail.id, detail.state);
    }
    publish();
  });
  publish();
})();
