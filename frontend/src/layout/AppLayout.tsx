import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { roleLabels, type Role } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { ChartIcon, CloseIcon, HomeIcon, LayersIcon, LogoutIcon, MenuIcon, PanelIcon, RouteIcon, UserIcon, UsersIcon } from './icons';
import { Logo, LogoMark } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles?: Role[];
}

const managers: Role[] = ['master', 'gestor'];

export const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Menu',
    items: [
      { to: '/', label: 'Início', icon: <HomeIcon /> },
      { to: '/minhas-trilhas', label: 'Minhas trilhas', icon: <RouteIcon /> },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { to: '/painel', label: 'Painel', icon: <ChartIcon />, roles: managers },
      { to: '/trilhas', label: 'Trilhas', icon: <LayersIcon />, roles: managers },
      { to: '/equipe', label: 'Equipe', icon: <UsersIcon />, roles: managers },
    ],
  },
];

const STORAGE_KEY = 'onboardhub.sidebar';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
  } catch {
    return;
  }
}

export function AppLayout() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [drawerOpen]);

  if (!session) return null;
  const { user, company } = session;

  const sections = navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.roles || item.roles.includes(user.role)) }))
    .filter((section) => section.items.length > 0);

  function toggleCollapsed() {
    setCollapsed((current) => {
      saveCollapsed(!current);
      return !current;
    });
  }

  const shellClass = ['app-shell', collapsed && 'is-collapsed', drawerOpen && 'is-drawer-open'].filter(Boolean).join(' ');
  const toggleLabel = collapsed ? 'Expandir menu' : 'Recolher menu';

  return (
    <div className={shellClass}>
      <header className="mobile-bar">
        <button
          type="button"
          className="icon-button"
          aria-label="Abrir menu"
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar"
          onClick={() => setDrawerOpen((current) => !current)}
        >
          {drawerOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <Logo />
      </header>

      <button type="button" className="sidebar-backdrop" aria-label="Fechar menu" tabIndex={-1} onClick={() => setDrawerOpen(false)} />

      <aside id="app-sidebar" className="sidebar">
        <div className="sidebar-brand" title={company.name}>
          <LogoMark />
          <span className="sidebar-text">
            <strong>{company.name}</strong>
            <span>OnboardHub</span>
          </span>
        </div>

        <nav aria-label="Principal" className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.title} className="sidebar-section">
              <p className="sidebar-section-title">{section.title}</p>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className="sidebar-link" title={item.label}>
                  {item.icon}
                  <span className="sidebar-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-link sidebar-toggle"
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            title={toggleLabel}
            onClick={toggleCollapsed}
          >
            <PanelIcon />
            <span className="sidebar-label" aria-hidden="true">
              Recolher
            </span>
          </button>
          <button type="button" className="sidebar-link" title="Sair" onClick={logout}>
            <LogoutIcon />
            <span className="sidebar-label">Sair</span>
          </button>
          <NavLink to="/perfil" className="sidebar-link sidebar-user" title="Meu perfil">
            <UserIcon />
            <span className="sidebar-text">
              <strong>{user.name.trim().split(/\s+/)[0]}</strong>
              <span>{roleLabels[user.role]}</span>
            </span>
          </NavLink>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
