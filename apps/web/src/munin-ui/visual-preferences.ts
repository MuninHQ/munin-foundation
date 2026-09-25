export const MUNIN_VISUAL_SYSTEM_VERSION = '1.0.0';

export type MotionLevel = 'minimal' | 'balanced' | 'cinematic';

export type VisualPreferences = {
  motion: MotionLevel;
  ambient: boolean;
  gpu: boolean;
  reduceMotion: boolean;
};

const STORAGE_KEY = 'munin.visual.preferences.v1';

export const defaultVisualPreferences: VisualPreferences = {
  motion: 'balanced',
  ambient: true,
  gpu: true,
  reduceMotion: false,
};

function systemPrefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function loadVisualPreferences(): VisualPreferences {
  if (typeof window === 'undefined') return defaultVisualPreferences;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<VisualPreferences>;
    return {
      ...defaultVisualPreferences,
      ...stored,
      reduceMotion: stored.reduceMotion ?? systemPrefersReducedMotion(),
    };
  } catch {
    return { ...defaultVisualPreferences, reduceMotion: systemPrefersReducedMotion() };
  }
}

export function saveVisualPreferences(preferences: VisualPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent('munin:visual-preferences', { detail: preferences }));
}

export function applyVisualPreferences(preferences: VisualPreferences) {
  const root = document.documentElement;
  root.dataset.motion = preferences.reduceMotion ? 'minimal' : preferences.motion;
  root.dataset.ambient = preferences.ambient ? 'on' : 'off';
  root.dataset.gpu = preferences.gpu ? 'on' : 'off';
  root.dataset.reduceMotion = preferences.reduceMotion ? 'on' : 'off';
}
