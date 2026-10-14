import { Link } from 'react-router';
import { roleLabels } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

interface Shortcut {
  to: string;
  title: string;
  text: string;
  tint: string;
}

export function HomePage() {
  const { session } = useAuth();
  if (!session) return null;
  const { user, company } = session;
  const firstName = user.name.split(' ')[0];
  const manages = user.role !== 'colaborador';

  const shortcuts: Shortcut[] = [
    { to: '/minhas-trilhas', title: 'Minhas trilhas', text: 'Continue o seu onboarding de onde parou.', tint: 'sky' },
    ...(manages
      ? [
          { to: '/trilhas', title: 'Gerenciar trilhas', text: 'Monte módulos e passos e publique para os cargos.', tint: 'lavender' },
          { to: '/equipe', title: 'Equipe', text: 'Convide pessoas e organize os cargos.', tint: 'mint' },
        ]
      : []),
  ];

  return (
    <section className="page">
      <header className="page-header">
        <h1>Olá, {firstName}</h1>
        <p>
          Você está em <strong>{company.name}</strong> como {roleLabels[user.role].toLowerCase()}.
        </p>
      </header>
      <ul className="shortcut-grid">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.to}>
            <Link to={shortcut.to} className={`shortcut tint-${shortcut.tint}`}>
              <strong>{shortcut.title}</strong>
              <span>{shortcut.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
