import { useLocation } from 'react-router';
import { AppLayout } from '../layout/AppLayout';
import { LandingPage } from '../pages/landing/LandingPage';
import { useAuth } from './AuthContext';
import { RequireAuth } from './guards';

export function AppGate() {
  const { status, notice } = useAuth();
  const { pathname } = useLocation();

  if (status === 'anonymous' && pathname === '/' && !notice) return <LandingPage />;

  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}
