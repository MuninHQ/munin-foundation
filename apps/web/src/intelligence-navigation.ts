function addIntelligenceNavigation(): void {
  const nav = document.querySelector('.sidebar nav');
  if (!nav || nav.querySelector('[data-munin-intelligence]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.muninIntelligence = 'true';
  button.textContent = 'Intelligence';
  button.title = 'Abrir Daily Brief, insights, timeline e grafo';
  button.addEventListener('click', () => {
    window.location.assign('/intelligence.html');
  });
  nav.appendChild(button);
}

const observer = new MutationObserver(() => addIntelligenceNavigation());
observer.observe(document.documentElement, { childList: true, subtree: true });
addIntelligenceNavigation();

window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    window.location.assign('/intelligence.html');
  }
});
