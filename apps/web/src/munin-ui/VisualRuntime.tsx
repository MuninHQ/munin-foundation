import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BootAmbient } from './BootAmbient';
import { DecryptedText, MiniRadar, MuninCore, type MuninState } from './effects';
import { startMotionRuntime } from './motion-runtime';
import { MUNIN_STATE_EVENT, type MuninRuntimeEvent } from './runtime-events';
import {
  applyVisualPreferences,
  loadVisualPreferences,
  saveVisualPreferences,
  type MotionLevel,
  type VisualPreferences,
} from './visual-preferences';

function detectState(): MuninState {
  if (document.querySelector('.sidebar-foot.offline')) return 'warning';
  if (document.querySelector('.loading-dashboard')) return 'thinking';
  if (document.querySelector('.toast')) return 'done';
  if (document.querySelector('.overlay .palette')) return 'listening';
  if (document.querySelector('.overlay .editor-modal,.overlay .report-modal')) return 'executing';
  return 'idle';
}

export function VisualRuntime() {
  const [preferences, setPreferences] = useState<VisualPreferences>(() => loadVisualPreferences());
  const [domState, setDomState] = useState<MuninState>('idle');
  const [runtimeState, setRuntimeState] = useState<MuninState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [bootVisible, setBootVisible] = useState(true);

  const state = runtimeState ?? domState;
  const cinematicBoot = preferences.motion === 'cinematic' && preferences.ambient && preferences.gpu && !preferences.reduceMotion;

  useEffect(() => {
    applyVisualPreferences(preferences);
    saveVisualPreferences(preferences);
    return startMotionRuntime(preferences);
  }, [preferences]);

  useEffect(() => {
    const update = () => setDomState(detectState());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-busy'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let resetTimer: number | undefined;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<MuninRuntimeEvent>).detail;
      if (!detail?.state) return;
      if (resetTimer) window.clearTimeout(resetTimer);
      setRuntimeState(detail.state);
      if (detail.state === 'done' || detail.state === 'warning') {
        resetTimer = window.setTimeout(() => setRuntimeState(null), detail.state === 'done' ? 900 : 1800);
      }
    };
    window.addEventListener(MUNIN_STATE_EVENT, handler);
    return () => { if (resetTimer) window.clearTimeout(resetTimer); window.removeEventListener(MUNIN_STATE_EVENT, handler); };
  }, []);

  useEffect(() => {
    const mount = () => {
      const tools = document.querySelector('main > header .tools');
      if (!(tools instanceof HTMLElement)) return false;
      let host = tools.querySelector<HTMLElement>('[data-munin-visual-host]');
      if (!host) {
        host = document.createElement('div');
        host.dataset.muninVisualHost = 'true';
        host.className = 'visual-host';
        tools.prepend(host);
      }
      setPortalHost(host);
      return true;
    };
    if (mount()) return;
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootVisible(false), cinematicBoot ? 1700 : 450);
    return () => window.clearTimeout(timer);
  }, [cinematicBoot]);

  const statusText = useMemo(() => ({
    idle: 'SYSTEM READY', listening: 'LISTENING', thinking: 'SYNCHRONIZING', searching: 'SEARCHING', executing: 'EXECUTING', warning: 'ATTENTION', done: 'COMPLETE',
  } satisfies Record<MuninState, string>)[state], [state]);

  const patch = (next: Partial<VisualPreferences>) => setPreferences(current => ({ ...current, ...next }));

  return <>
    <div className="munin-ambient" aria-hidden="true"><i /><i /><i /></div>

    {portalHost && createPortal(<div className="visual-status-cluster">
      <MuninCore state={state} compact />
      <button className="visual-status-button" onClick={() => setSettingsOpen(value => !value)} aria-expanded={settingsOpen} title="Visual Experience">
        <span><DecryptedText text={statusText} /></span>
        <small>{preferences.motion.toUpperCase()}</small>
      </button>
    </div>, portalHost)}

    {settingsOpen && <aside className="visual-settings" aria-label="Visual Experience">
      <div className="visual-settings-head">
        <div><p className="eyebrow">MUNIN VISUAL SYSTEM</p><h3>Visual Experience</h3></div>
        <button onClick={() => setSettingsOpen(false)} aria-label="Fechar">×</button>
      </div>
      <div className="visual-preview"><MuninCore state={state} /><MiniRadar active={state === 'warning' ? 2 : 5} /></div>
      <label>Motion
        <select value={preferences.motion} onChange={event => patch({ motion: event.target.value as MotionLevel })} disabled={preferences.reduceMotion}>
          <option value="minimal">Minimal</option><option value="balanced">Balanced</option><option value="cinematic">Cinematic</option>
        </select>
      </label>
      <label className="visual-toggle"><span>Ambient effects<small>Dot field, threads and depth</small></span><input type="checkbox" checked={preferences.ambient} onChange={event => patch({ ambient: event.target.checked })} /></label>
      <label className="visual-toggle"><span>GPU effects<small>Vanta only during cinematic boot</small></span><input type="checkbox" checked={preferences.gpu} onChange={event => patch({ gpu: event.target.checked })} /></label>
      <label className="visual-toggle"><span>Reduce motion<small>Overrides every animation preset</small></span><input type="checkbox" checked={preferences.reduceMotion} onChange={event => patch({ reduceMotion: event.target.checked })} /></label>
      <p className="visual-footnote">Balanced keeps operational motion subtle. Cinematic adds the boot scene and stronger transitions without changing Munin data or runtime behavior.</p>
    </aside>}

    {bootVisible && <div className={`munin-boot ${cinematicBoot ? 'cinematic' : ''}`} aria-hidden="true">
      <BootAmbient enabled={cinematicBoot} />
      <div className="boot-content"><MuninCore state="thinking" /><strong>MUNIN</strong><span>INTELLIGENCE SYSTEM</span></div>
    </div>}
  </>;
}
