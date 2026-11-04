import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { MailIcon, TagIcon, UsersIcon } from '../../layout/icons';

export function TeamLayout() {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const isMaster = session?.user.role === 'master';

  return (
    <section className="team">
      <header className="page-head">
        <div className="home-header">
          <h1>Equipe</h1>
          <p>{isMaster ? 'Gerencie as pessoas, os cargos e os convites da empresa.' : 'Pessoas da empresa e seus cargos.'}</p>
        </div>
        {isMaster && !pathname.endsWith('/convites') ? (
          <Link to="/equipe/convites" className="button">
            <MailIcon />
            Convidar pessoa
          </Link>
        ) : null}
      </header>
      <nav className="team-tabs" aria-label="Seções da equipe">
        <NavLink to="/equipe/membros">
          <UsersIcon />
          Pessoas
        </NavLink>
        {isMaster ? (
          <NavLink to="/equipe/cargos">
            <TagIcon />
            Cargos
          </NavLink>
        ) : null}
        {isMaster ? (
          <NavLink to="/equipe/convites">
            <MailIcon />
            Convites
          </NavLink>
        ) : null}
      </nav>
      <Outlet />
    </section>
  );
}
