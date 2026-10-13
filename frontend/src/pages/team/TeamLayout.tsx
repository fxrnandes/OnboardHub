import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../../auth/AuthContext';

export function TeamLayout() {
  const { session } = useAuth();
  const isMaster = session?.user.role === 'master';

  return (
    <section className="page">
      <header className="page-header">
        <h1>Equipe</h1>
        <p>{isMaster ? 'Gerencie as pessoas, os cargos e os convites da empresa.' : 'Pessoas da empresa e seus cargos.'}</p>
      </header>
      <nav className="tabs" aria-label="Seções da equipe">
        <NavLink to="/equipe/membros">Pessoas</NavLink>
        {isMaster ? <NavLink to="/equipe/cargos">Cargos</NavLink> : null}
        {isMaster ? <NavLink to="/equipe/convites">Convites</NavLink> : null}
      </nav>
      <Outlet />
    </section>
  );
}
