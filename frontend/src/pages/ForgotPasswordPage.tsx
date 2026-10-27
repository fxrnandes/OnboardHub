import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { authApi } from '../api/auth';
import { Field } from '../components/Field';
import { FormAlert } from '../components/FormAlert';
import { useSubmit } from '../components/useSubmit';
import { AuthLayout } from '../layout/AuthLayout';

export function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '');
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { pending, onSubmit, fieldError, formError } = useSubmit(async () => {
    const normalized = email.trim();
    await authApi.requestPasswordReset(normalized);
    setSentTo(normalized);
  });

  if (sentTo) {
    return (
      <AuthLayout title="Confira seu e-mail">
        <p className="auth-text">
          Se existir uma conta com <strong>{sentTo}</strong>, você vai receber um link para criar uma nova senha. O
          link vale por 1 hora.
        </p>
        <p className="auth-text auth-text-muted">Não chegou? Veja a caixa de spam ou peça outro link em alguns minutos.</p>
        <p className="auth-switch">
          <Link to="/entrar">Voltar para o login</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueci a senha" subtitle="Informe seu e-mail e enviaremos um link para criar uma nova senha.">
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
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar link'}
        </button>
      </form>
      <p className="auth-switch">
        Lembrou a senha? <Link to="/entrar">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
