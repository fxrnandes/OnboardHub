import { useEffect, useState } from 'react';

export const showcaseSteps = [
  'Conheça a empresa e a cultura',
  'Configure seu e-mail e acessos',
  'Conheça as ferramentas do time',
  'Converse com seu gestor',
  'Faça sua primeira entrega',
];

const startDelayMs = 900;
const stepMs = 900;
const lastTick = showcaseSteps.length + 1;

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function AuthShowcase() {
  const [tick, setTick] = useState(() => (prefersReducedMotion() ? lastTick : 0));

  useEffect(() => {
    if (tick >= lastTick) return;
    const timer = window.setTimeout(() => setTick((current) => current + 1), tick === 0 ? startDelayMs : stepMs);
    return () => window.clearTimeout(timer);
  }, [tick]);

  const total = showcaseSteps.length;
  const done = Math.min(tick, total);
  const finished = done === total;
  const notified = tick >= lastTick;

  return (
    <aside className="auth-visual" aria-hidden="true">
      <div className="showcase">
        <div className="auth-glass">
          <div className="showcase-header">
            <span className="showcase-avatar">AS</span>
            <div>
              <strong>Boas-vindas à empresa</strong>
              <span>Ana Souza · {finished ? 'Trilha concluída' : `${done} de ${total} passos`}</span>
            </div>
            <span className={finished ? 'showcase-badge is-finished' : 'showcase-badge'}>
              {Math.round((done / total) * 100)}%
            </span>
          </div>
          <div className="showcase-track">
            <span style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <ul className="showcase-steps">
            {showcaseSteps.map((step, index) => {
              const state = index < done ? ' is-done' : index === done ? ' is-current' : '';
              return (
                <li key={step} className={`showcase-step${state}`}>
                  <span className="showcase-check">
                    <CheckIcon />
                  </span>
                  {step}
                </li>
              );
            })}
          </ul>
        </div>
        {notified ? (
          <div className="showcase-toast">
            <span className="showcase-toast-icon">
              <BellIcon />
            </span>
            <div>
              <strong>Gestor avisado</strong>
              <span>Ana concluiu a trilha em 3 dias.</span>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
