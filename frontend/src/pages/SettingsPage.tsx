import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRightIcon, UserIcon } from '../layout/icons';
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

function SettingsSection({ title, description, children }: Readonly<{ title: string; description: string; children: ReactNode }>) {
  const id = useId();
  return (
    <section className="settings-section" aria-labelledby={id}>
      <header>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

function MiniApp({ tone }: Readonly<{ tone: 'light' | 'dark' }>) {
  return (
    <span className={`mini-app is-${tone}`}>
      <span className="mini-sidebar">
        <span className="mini-logo" />
        <span className="mini-dot is-active" />
        <span className="mini-dot" />
        <span className="mini-dot" />
      </span>
      <span className="mini-main">
        <span className="mini-title" />
        <span className="mini-hero" />
        <span className="mini-cards">
          <span />
          <span />
          <span />
        </span>
      </span>
    </span>
  );
}

function ThemePreview({ theme }: Readonly<{ theme: ThemeChoice }>) {
  return (
    <span className={`theme-preview is-${theme}`} aria-hidden="true">
      {theme === 'dark' ? <MiniApp tone="dark" /> : <MiniApp tone="light" />}
      {theme === 'system' ? <MiniApp tone="dark" /> : null}
    </span>
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
        <p>Preferências deste navegador. Valem só para você.</p>
      </header>

      <div className="settings-panel">
        <SettingsSection title="Aparência" description="Escolha como o OnboardHub aparece para você. A mudança é aplicada na hora.">
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
                <ThemePreview theme={theme.value} />
                <span className="theme-option-text">
                  <strong>{theme.label}</strong>
                  <span>{theme.text}</span>
                </span>
                <span className="theme-check" aria-hidden="true" />
              </label>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="Conta" description="Nome, e-mail e senha ficam no seu perfil.">
          <Link to="/perfil" className="settings-link">
            <span className="settings-link-icon">
              <UserIcon />
            </span>
            <span className="settings-link-text">
              <strong>Meu perfil</strong>
              <span>Altere seu nome ou troque a senha.</span>
            </span>
            <ArrowRightIcon />
          </Link>
        </SettingsSection>
      </div>
    </div>
  );
}
