import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { authApi, roleLabels, type InvitePreview } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Field';
import { FormAlert } from '../components/FormAlert';
import { useSubmit } from '../components/useSubmit';
import { AuthLayout } from '../layout/AuthLayout';

export function AcceptInvitePage() {
  const { token = '' } = useParams();
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    authApi
      .previewInvite(token)
      .then(({ invite }) => setInvite(invite))
      .catch((error: unknown) =>
        setLoadError(error instanceof ApiError ? error.message : 'Não foi possível carregar o convite.'),
      );
  }, [token]);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const { pending, onSubmit, fieldError, formError } = useSubmit(async () => {
    const { token: sessionToken } = await authApi.acceptInvite(token, {
      name: form.name,
      password: form.password,
      ...(invite?.email ? {} : { email: form.email }),
    });
    await startSession(sessionToken);
    navigate('/', { replace: true });
  });

  if (loadError) {
    return (
      <AuthLayout title="Convite indisponível">
        <FormAlert message={loadError} />
        <p className="auth-switch">
          <Link to="/entrar">Ir para o login</Link>
        </p>
      </AuthLayout>
    );
  }

  if (!invite) return <p className="page-loading">Carregando convite…</p>;

  const subtitle = `${invite.companyName} convidou você como ${roleLabels[invite.role].toLowerCase()}${
    invite.jobRoleName ? ` (${invite.jobRoleName})` : ''
  }.`;

  return (
    <AuthLayout title="Aceitar convite" subtitle={subtitle}>
      <form onSubmit={onSubmit} noValidate>
        <FormAlert message={formError} />
        <Field label="Seu nome" autoComplete="name" value={form.name} onChange={update('name')} error={fieldError('name')} required />
        {invite.email ? (
          <Field label="E-mail" type="email" value={invite.email} readOnly />
        ) : (
          <Field
            label="E-mail"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={fieldError('email')}
            required
          />
        )}
        <Field
          label="Crie uma senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          value={form.password}
          onChange={update('password')}
          error={fieldError('password')}
          required
        />
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Entrando…' : 'Aceitar e entrar'}
        </button>
      </form>
    </AuthLayout>
  );
}
