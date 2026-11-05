import { useState } from 'react';
import { MoonIcon, SunIcon } from '../layout/icons';
import { applyPreferences, savePreferences } from '../preferences/preferences';

const currentTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
  const [theme, setTheme] = useState(currentTheme);
  const dark = theme === 'dark';

  function toggle() {
    const next = dark ? 'light' : 'dark';
    const preferences = { theme: next } as const;
    applyPreferences(preferences);
    savePreferences(preferences);
    setTheme(next);
  }

  return (
    <button
      type="button"
      className={className ? `theme-toggle ${className}` : 'theme-toggle'}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      onClick={toggle}
    >
      <span className={dark ? 'theme-toggle-icon' : 'theme-toggle-icon is-shown'}>
        <MoonIcon />
      </span>
      <span className={dark ? 'theme-toggle-icon is-shown' : 'theme-toggle-icon'}>
        <SunIcon />
      </span>
    </button>
  );
}
