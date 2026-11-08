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
          <p>{isMaster ? 'Gerencie as pessoas, os cargos e os convites da empresa.' : 'Pessoas da empresa, seus cargos e os convites.'}</p>
        </div>
        {pathname.endsWith('/convites') ? null : (
          <Link to="/equipe/convites" className="button">
            <MailIcon />
            Convidar pessoa
          </Link>
        )}
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
        <NavLink to="/equipe/convites">
          <MailIcon />
          Convites
        </NavLink>
      </nav>
      <Outlet />
    </section>
  );
}
