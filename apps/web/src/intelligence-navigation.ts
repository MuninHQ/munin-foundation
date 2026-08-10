function addIntelligenceNavigation(): void {
  const nav = document.querySelector('.sidebar nav');
  if (!nav) return;

  if (!nav.querySelector('[data-munin-intelligence]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.muninIntelligence = 'true';
    button.textContent = 'Intelligence';
    button.title = 'Abrir Daily Brief, insights, timeline e grafo';
    button.addEventListener('click', () => window.location.assign('/intelligence.html'));
    nav.appendChild(button);
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

  if (!nav.querySelector('[data-munin-editorial-history]')) {
    const history = document.createElement('button');
    history.type = 'button';
    history.dataset.muninEditorialHistory = 'true';
    history.textContent = 'Editorial History';
    history.title = 'Memória temática e territórios visuais já usados';
    history.addEventListener('click', () => window.location.assign('/linkedin-history.html'));
    nav.appendChild(history);
  }
}

const observer = new MutationObserver(() => addIntelligenceNavigation());
observer.observe(document.documentElement, { childList: true, subtree: true });
addIntelligenceNavigation();

window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    window.location.assign('/intelligence.html');
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    window.location.assign('/linkedin.html');
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
    event.preventDefault();
    window.location.assign('/linkedin-history.html');
  }
});
