import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Career Intelligence v2 now lives in the dedicated Career Command surface.
// Keep the legacy React section available internally, but make the primary
// sidebar entry open the current Career experience instead of the stale view.
document.addEventListener('click', event => {
  const target = event.target as HTMLElement | null;
  const button = target?.closest('aside.sidebar nav > button');
  if (button?.textContent?.trim() === 'Career') {
    event.preventDefault();
    event.stopPropagation();
    window.location.assign('/career-command.html');
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
