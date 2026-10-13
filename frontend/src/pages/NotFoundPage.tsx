import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="page page-centered">
      <h1>Página não encontrada</h1>
      <p>
        <Link to="/">Voltar ao início</Link>
      </p>
    </section>
  );
}
