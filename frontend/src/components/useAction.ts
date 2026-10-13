import { useState } from 'react';
import { ApiError } from '../api/client';

export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Algo deu errado. Tente novamente.');
      return false;
    } finally {
      setPending(false);
    }
  }

  return { pending, error, run, clearError: () => setError(null) };
}
