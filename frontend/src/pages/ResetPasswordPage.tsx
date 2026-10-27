import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { useSubmit } from '../components/useSubmit';
import { AuthLayout } from '../layout/AuthLayout';

export function ResetPasswordPage() {
  const { token = '' } = useParams();
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [mismatch, setMismatch] = useState(false);

  useEffect(() => {
    authApi
      .previewPasswordReset(token)
      .then((preview) => setEmail(preview.email))
      .catch((error: unknown) =>
        setLoadError(error instanceof ApiError ? error.message : 'Não foi possível abrir este link.'),
      );
  }, [token]);

  const { pending, onSubmit, fieldError, formError } = useSubmit(async () => {
    const { token: sessionToken } = await authApi.resetPassword(token, password);
    await startSession(sessionToken);
    navigate('/', { replace: true });
  });

  if (loadError) {
    return (
      <AuthLayout title="Link indisponível">
        <FormAlert message={loadError} />
        <p className="auth-switch">
          <Link to="/esqueci-senha">Pedir um novo link</Link>
        </p>
      </AuthLayout>
    );
  }

  if (!email) {
    return (
      <AuthLayout title="Criar nova senha">
        <p className="auth-loading">Carregando…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Criar nova senha" subtitle={`Para a conta ${email}.`}>
      <form
        onSubmit={(event) => {
          if (password !== confirmation) {
            event.preventDefault();
            setMismatch(true);
            return;
          }
          setMismatch(false);
          void onSubmit(event);
        }}
        noValidate
      >
        <FormAlert message={formError} />
        <PasswordField
          label="Nova senha"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError('password')}
        />
        <PasswordField
          label="Confirme a nova senha"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={mismatch ? 'As senhas não conferem.' : undefined}
        />
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar e entrar'}
        </button>
      </form>
    </AuthLayout>
  );
}
