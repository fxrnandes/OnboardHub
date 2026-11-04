import { Link } from 'react-router';
import { Logo } from '../layout/Logo';
import { ArrowLeftIcon } from '../layout/icons';

export function NotFoundPage() {
  return (
    <section className="not-found">
      <Link to="/" className="not-found-brand" aria-label="OnboardHub, início">
        <Logo />
      </Link>
      <div className="not-found-card">
        <svg className="not-found-art" viewBox="0 0 320 120" aria-hidden="true">
          <path className="not-found-path" d="M40 84 C 90 84, 90 36, 140 36 S 170 60, 186 60" />
          <path className="not-found-path is-lost" d="M214 60 C 236 60, 250 40, 280 36" />
          <circle className="not-found-dot" cx="40" cy="84" r="12" />
          <circle className="not-found-end" cx="280" cy="36" r="12" />
          <text x="200" y="68" className="not-found-q">?</text>
        </svg>
        <span className="not-found-code">Erro 404</span>
        <h1>Página não encontrada</h1>
        <p>O endereço pode ter mudado ou a página não existe mais. Volte para o início e siga a trilha de lá.</p>
        <Link to="/" className="button">
          <ArrowLeftIcon />
          Voltar ao início
        </Link>
      </div>
    </section>
  );
}
