import type { ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="auth-screen">
      <aside className="auth-aside">
        <div className="auth-dots" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <Logo />
        <div>
          <p className="auth-pitch">Do primeiro dia à autonomia, com trilhas feitas para cada cargo.</p>
          <p className="auth-pitch-note">Organize o onboarding da sua equipe e acompanhe o progresso de cada pessoa.</p>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
