import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';

export function useSubmit(action: () => Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'unknown_error', 'Algo deu errado. Tente novamente.'));
    } finally {
      setPending(false);
    }
  }

  return {
    pending,
    error,
    onSubmit,
    fieldError: (field: string) => error?.fieldMessage(field),
    formError: error && error.details.length === 0 ? error.message : null,
  };
}
