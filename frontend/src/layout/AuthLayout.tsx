import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { AuthShowcase } from './AuthShowcase';
import { LogoMark } from './Logo';

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="auth-screen">
      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="auth-logo" aria-label="OnboardHub, voltar ao início">
            <LogoMark />
          </Link>
          <h1>{title}</h1>
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
          {children}
          <p className="auth-footnote">
            <LockIcon />
            Seus dados ficam isolados por empresa.
          </p>
        </div>
      </main>
      <AuthShowcase />
    </div>
  );
}
