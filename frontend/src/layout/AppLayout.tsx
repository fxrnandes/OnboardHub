import { NavLink, Outlet } from 'react-router';
import { roleLabels, type Role } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  roles?: Role[];
}

export const navItems: NavItem[] = [{ to: '/', label: 'Início' }];

export function AppLayout() {
  const { session, logout } = useAuth();
  if (!session) return null;
  const { user, company } = session;
  const items = navItems.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <p className="sidebar-company">{company.name}</p>
        <nav aria-label="Principal">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <strong>{user.name}</strong>
          <span className="badge">{roleLabels[user.role]}</span>
          <button type="button" className="link-button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
