import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  applyPreferences,
  readPreferences,
  savePreferences,
  watchSystemTheme,
  type Preferences,
  type ThemeChoice,
} from '../preferences/preferences';

const themes: { value: ThemeChoice; label: string; text: string }[] = [
  { value: 'light', label: 'Claro', text: 'Fundo claro, ideal para ambientes iluminados.' },
  { value: 'dark', label: 'Escuro', text: 'Menos brilho, confortável à noite.' },
  { value: 'system', label: 'Sistema', text: 'Acompanha a configuração do seu computador.' },
];

function SettingsCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="settings-card" aria-labelledby={id}>
      <header>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);

  useEffect(() => {
    applyPreferences(preferences);
    savePreferences(preferences);
    if (preferences.theme !== 'system') return;
    return watchSystemTheme(() => applyPreferences(preferences));
  }, [preferences]);


  return (
    <div className="settings">
      <header className="home-header">
        <h1>Configurações</h1>
        <p>
          Preferências deste navegador. Seus dados de conta ficam em <Link to="/perfil">Meu perfil</Link>.
        </p>
      </header>

      <SettingsCard title="Aparência" description="Escolha como o OnboardHub aparece para você.">
        <div role="radiogroup" aria-label="Tema" className="theme-options">
          {themes.map((theme) => (
            <label key={theme.value} className={preferences.theme === theme.value ? 'theme-option is-selected' : 'theme-option'}>
              <input
                type="radio"
                name="theme"
                value={theme.value}
                checked={preferences.theme === theme.value}
                onChange={() => setPreferences({ theme: theme.value })}
              />
              <span className={`theme-preview is-${theme.value}`} aria-hidden="true">
                <span />
                <span />
              </span>
              <strong>{theme.label}</strong>
              <span>{theme.text}</span>
            </label>
          ))}
        </div>
      </SettingsCard>

    </div>
  );
}
