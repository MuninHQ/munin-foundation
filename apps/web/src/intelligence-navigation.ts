function addIntelligenceNavigation(): void {
  const nav = document.querySelector('.sidebar nav');
  if (nav) {
    if (!nav.querySelector('[data-munin-intelligence]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.muninIntelligence = 'true';
      button.textContent = 'Intelligence';
      button.title = 'Abrir Daily Brief, insights, timeline e grafo';
      button.addEventListener('click', () => window.location.assign('/intelligence.html'));
      nav.appendChild(button);
    }
    if (!nav.querySelector('[data-munin-context-memory]')) {
      const memory = document.createElement('button');
      memory.type = 'button';
      memory.dataset.muninContextMemory = 'true';
      memory.textContent = 'Context Memory';
      memory.title = 'Bootstrap, privacidade, freshness e governança da memória do Munin';
      memory.addEventListener('click', () => window.location.assign('/context-memory.html'));
      nav.appendChild(memory);
    }
    if (!nav.querySelector('[data-munin-linkedin]')) {
      const linkedin = document.createElement('button');
      linkedin.type = 'button';
      linkedin.dataset.muninLinkedin = 'true';
      linkedin.textContent = 'LinkedIn Studio';
      linkedin.title = 'Histórico, temas, drafts e identidade visual do LinkedIn';
      linkedin.addEventListener('click', () => window.location.assign('/linkedin.html'));
      nav.appendChild(linkedin);
    }
    if (!nav.querySelector('[data-munin-linkedin-composer]')) {
      const composer = document.createElement('button');
      composer.type = 'button';
      composer.dataset.muninLinkedinComposer = 'true';
      composer.textContent = 'Post Composer';
      composer.title = 'Compor texto + visual do próximo post em uma operação';
      composer.addEventListener('click', () => window.location.assign('/linkedin-compose.html'));
      nav.appendChild(composer);
    }
    if (!nav.querySelector('[data-munin-editorial-history]')) {
      const history = document.createElement('button');
      history.type = 'button';
      history.dataset.muninEditorialHistory = 'true';
      history.textContent = 'Editorial History';
      history.title = 'Memória temática e territórios visuais já usados';
      history.addEventListener('click', () => window.location.assign('/linkedin-history.html'));
      nav.appendChild(history);
    }
    if (!nav.querySelector('[data-munin-visual-assets]')) {
      const assets = document.createElement('button');
      assets.type = 'button';
      assets.dataset.muninVisualAssets = 'true';
      assets.textContent = 'Visual Assets';
      assets.title = 'Galeria de imagens e referências visuais do LinkedIn';
      assets.addEventListener('click', () => window.location.assign('/linkedin-assets.html'));
      nav.appendChild(assets);
    }
  }
  if (window.location.pathname.endsWith('/linkedin.html') && !document.querySelector('[data-munin-compose-now]')) {
    const actions = document.querySelector('.top .buttons');
    if (actions) {
      const compose = document.createElement('a');
      compose.dataset.muninComposeNow = 'true';
      compose.className = 'btn';
      compose.href = '/linkedin-compose.html';
      compose.textContent = '✦ Compor próximo post';
      compose.title = 'Abrir Content + Visual Composer';
      actions.prepend(compose);
    }
  }
}
const observer = new MutationObserver(() => addIntelligenceNavigation());
observer.observe(document.documentElement, { childList: true, subtree: true });
addIntelligenceNavigation();
window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'i') { event.preventDefault(); window.location.assign('/intelligence.html'); }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm') { event.preventDefault(); window.location.assign('/context-memory.html'); }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'l') { event.preventDefault(); window.location.assign('/linkedin.html'); }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); window.location.assign('/linkedin-compose.html'); }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'h') { event.preventDefault(); window.location.assign('/linkedin-history.html'); }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a') { event.preventDefault(); window.location.assign('/linkedin-assets.html'); }
});
