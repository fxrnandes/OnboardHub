import { roleLabels } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { session } = useAuth();
  if (!session) return null;
  const firstName = session.user.name.split(' ')[0];

  return (
    <section className="page">
      <header className="page-header">
        <h1>Olá, {firstName}</h1>
        <p>
          Você está em <strong>{session.company.name}</strong> como {roleLabels[session.user.role].toLowerCase()}.
        </p>
      </header>
    </section>
  );
}
