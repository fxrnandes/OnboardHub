export type ThemeChoice = 'light' | 'dark' | 'system';

export interface Preferences {
  theme: ThemeChoice;
}

const STORAGE_KEY = 'onboardhub.preferences';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { theme?: unknown };
    return { theme: saved.theme === 'dark' || saved.theme === 'system' ? saved.theme : 'light' };
  } catch {
    return { theme: 'light' };
  }
}

export function savePreferences(preferences: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    return;
  }
}

function systemPrefersDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function applyPreferences(preferences: Preferences) {
  const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && systemPrefersDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function watchSystemTheme(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener?.('change', onChange);
  return () => query.removeEventListener?.('change', onChange);
}
