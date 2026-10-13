import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '../api/auth';
import { useAuth } from './AuthContext';

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { status, session } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <p className="page-loading">Carregando…</p>;
  if (status === 'anonymous') return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (roles && session && !roles.includes(session.user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <p className="page-loading">Carregando…</p>;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <>{children}</>;
}
