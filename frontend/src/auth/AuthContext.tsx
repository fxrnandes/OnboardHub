import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authApi, type Session } from '../api/auth';
import { tokenStorage } from '../api/client';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  session: Session | null;
  startSession: (token: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: (notice?: string) => void;
  notice: string | null;
  consumeEntrance: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(() => (tokenStorage.get() ? 'loading' : 'anonymous'));
  const entrance = useRef(false);

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
      setNotice(null);
      entrance.current = true;
      await loadSession();
    },
    [loadSession],
  );

  const logout = useCallback((message?: string) => {
    tokenStorage.clear();
    setNotice(message ?? null);
    setSession(null);
    setStatus('anonymous');
  }, []);

  const consumeEntrance = useCallback(() => {
    const pending = entrance.current;
    entrance.current = false;
    return pending;
  }, []);

  const value = useMemo(
    () => ({ status, session, startSession, refresh: loadSession, logout, notice, consumeEntrance }),
    [status, session, startSession, loadSession, logout, notice, consumeEntrance],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}
