import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { authApi } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Field';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { SocialSignIn } from '../components/SocialSignIn';
import { useSubmit } from '../components/useSubmit';
import { AuthLayout } from '../layout/AuthLayout';

export function LoginPage() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { pending, onSubmit, fieldError, formError } = useSubmit(async () => {
    const { token } = await authApi.login({ email: email.trim(), password });
    await startSession(token);
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? '/', { replace: true });
  });

  return (
    <AuthLayout title="Entrar">
      <SocialSignIn />
      <form onSubmit={onSubmit} noValidate>
        <FormAlert message={formError} />
        <Field
          label="E-mail"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError('email')}
        />
        <PasswordField
          label="Senha"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError('password')}
        />
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="auth-switch">
        Não tem uma conta? <Link to="/cadastro">Cadastre sua empresa</Link>
      </p>
    </AuthLayout>
  );
}
