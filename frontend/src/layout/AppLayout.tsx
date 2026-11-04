import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { roleLabels, type Role } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { ChartIcon, CloseIcon, HomeIcon, LayersIcon, LogoutIcon, MenuIcon, RouteIcon, SettingsIcon, UserIcon, UsersIcon } from './icons';
import { prefersReducedMotion } from '../preferences/preferences';
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

const OPEN_DELAY = 150;
const LEAVE_DURATION = 420;
const CLOSE_DELAY = 250;

export function AppLayout() {
  const { session, logout, consumeEntrance } = useAuth();
  const [entering, setEntering] = useState(consumeEntrance);
  const [leaving, setLeaving] = useState(false);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  function schedule(next: boolean, delay: number) {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), delay);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!entering) return;
    const done = window.setTimeout(() => setEntering(false), 1100);
    return () => window.clearTimeout(done);
  }, [entering]);

  function leave() {
    if (leaving) return;
    if (prefersReducedMotion()) {
      logout();
      return;
    }
    setLeaving(true);
    window.setTimeout(logout, LEAVE_DURATION);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) schedule(false, CLOSE_DELAY);
  }

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

  const shellClass = ['app-shell', open && 'is-sidebar-open', drawerOpen && 'is-drawer-open', entering && 'is-entering', leaving && 'is-leaving'].filter(Boolean).join(' ');

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

      <div className="sidebar-slot" aria-hidden="true" />

      <aside
        id="app-sidebar"
        className="sidebar"
        onMouseEnter={() => schedule(true, OPEN_DELAY)}
        onMouseLeave={() => schedule(false, CLOSE_DELAY)}
        onFocus={() => schedule(true, 0)}
        onBlur={handleBlur}
      >
        <div className="sidebar-brand">
          <LogoMark />
          <span className="sidebar-text">
            <strong>{company.name}</strong>
            <span>OnboardHub</span>
          </span>
        </div>

        <div className="sidebar-account">
          <NavLink to="/perfil" className="sidebar-link sidebar-user">
            <UserIcon />
            <span className="sidebar-text">
              <strong>{user.name.trim().split(/\s+/)[0]}</strong>
              <span>{roleLabels[user.role]}</span>
            </span>
          </NavLink>
        </div>

        <nav aria-label="Principal" className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.title} className="sidebar-section">
              <p className="sidebar-section-title">{section.title}</p>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className="sidebar-link">
                  {item.icon}
                  <span className="sidebar-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/configuracoes" className="sidebar-link">
            <SettingsIcon />
            <span className="sidebar-label">Configurações</span>
          </NavLink>
          <button type="button" className="sidebar-link sidebar-logout" onClick={leave}>
            <LogoutIcon />
            <span className="sidebar-label">Sair</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
