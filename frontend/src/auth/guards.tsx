import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { AuthLayout } from '../layout/AuthLayout';
import type { Role } from '../api/auth';
import { useAuth } from './AuthContext';
import { AppSplash } from '../components/Skeleton';

export function RequireAuth({ children, roles }: Readonly<{ children: ReactNode; roles?: Role[] }>) {
  const { status, session } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <AppSplash />;
  if (status === 'anonymous') return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (roles && session && !roles.includes(session.user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export function GuestOnly({ children }: Readonly<{ children: ReactNode }>) {
  const { status } = useAuth();
  if (status === 'loading') return <AppSplash />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function SignedOutFor({ purpose, children }: Readonly<{ purpose: string; children: ReactNode }>) {
  const { status, session, logout } = useAuth();
  if (status === 'loading') return <AppSplash />;
  if (status === 'anonymous' || !session) return <>{children}</>;

  return (
    <AuthLayout title="Você já está conectado">
      <p className="auth-text">
        Você entrou como <strong>{session.user.name}</strong> ({session.user.email}), em {session.company.name}. Para {purpose}, saia
        desta conta primeiro.
      </p>
      <div className="auth-actions">
        <button type="button" className="button" onClick={() => logout()}>
          Sair e continuar
        </button>
        <Link to="/" className="button button-secondary">
          Voltar ao início
        </Link>
      </div>
    </AuthLayout>
  );
}
