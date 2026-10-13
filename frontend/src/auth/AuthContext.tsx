import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type Session } from '../api/auth';
import { tokenStorage } from '../api/client';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  session: Session | null;
  startSession: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>(() => (tokenStorage.get() ? 'loading' : 'anonymous'));

  const loadSession = useCallback(async () => {
    try {
      setSession(await authApi.me());
      setStatus('authenticated');
    } catch {
      tokenStorage.clear();
      setSession(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    if (tokenStorage.get()) void loadSession();
  }, [loadSession]);

  const startSession = useCallback(
    async (token: string) => {
      tokenStorage.set(token);
      await loadSession();
    },
    [loadSession],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setSession(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({ status, session, startSession, logout }), [status, session, startSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}
