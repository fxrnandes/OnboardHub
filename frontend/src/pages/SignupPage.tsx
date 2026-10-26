import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { authApi } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Field';
import { SocialSignIn } from '../components/SocialSignIn';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { useSubmit } from '../components/useSubmit';
import { AuthLayout } from '../layout/AuthLayout';

export function SignupPage() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '' });

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const { pending, onSubmit, fieldError, formError } = useSubmit(async () => {
    const { token } = await authApi.signup(form);
    await startSession(token);
    navigate('/', { replace: true });
  });

  return (
    <AuthLayout title="Cadastre sua empresa" subtitle="Você será o administrador da conta.">
      <SocialSignIn />
      <form onSubmit={onSubmit} noValidate>
        <FormAlert message={formError} />
        <Field
          label="Nome da empresa"
          autoComplete="organization"
          value={form.companyName}
          onChange={update('companyName')}
          error={fieldError('companyName')}
          required
        />
        <Field label="Seu nome" autoComplete="name" value={form.name} onChange={update('name')} error={fieldError('name')} required />
        <Field
          label="E-mail"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={fieldError('email')}
          required
        />
        <PasswordField
          label="Senha"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          value={form.password}
          onChange={update('password')}
          error={fieldError('password')}
          required
        />
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
      <p className="auth-switch">
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
