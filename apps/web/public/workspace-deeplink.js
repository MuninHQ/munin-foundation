(() => {
  const requested = new URLSearchParams(location.search).get('section');
  if (!requested) return;
  const allowed = new Set(['Command Center', 'Projects', 'Career', 'Research', 'Runtime']);
  if (!allowed.has(requested)) return;
  let attempts = 0;
  const open = () => {
    const button = [...document.querySelectorAll('.sidebar nav button')].find(el => el.textContent?.trim() === requested);
    if (button) {
      button.click();
      history.replaceState(null, '', '/');
      return;
    }
    if (++attempts < 40) setTimeout(open, 50);
  };
  open();
})();
