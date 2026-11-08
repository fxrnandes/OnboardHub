import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { authApi } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Field';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { useSubmit } from '../components/useSubmit';
import { CheckIcon, MailIcon } from '../layout/icons';
import { AuthLayout } from '../layout/AuthLayout';
import { isEmail } from '../components/email';


type Errors = Partial<Record<'email' | 'password', string>>;

export function LoginPage() {
  const { startSession, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [attempt, setAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const { pending, error, onSubmit, fieldError, formError } = useSubmit(async () => {
    const { token } = await authApi.login({ email: email.trim(), password });
    await startSession(token);
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? '/', { replace: true });
  });

  const wrongCredentials = error?.code === 'invalid_credentials';

  useEffect(() => {
    if (wrongCredentials) {
      formRef.current?.querySelector<HTMLInputElement>('input[autocomplete="current-password"]')?.focus();
      return;
    }
    formRef.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus();
  }, [attempt, error, wrongCredentials]);

  function submit(event: FormEvent) {
    const found: Errors = {};
    if (!isEmail(email.trim())) found.email = 'Informe um e-mail válido.';
    if (!password) found.password = 'Informe a senha.';
    setErrors(found);
    setAttempt((current) => current + 1);
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      return;
    }
    void onSubmit(event);
  }

  function edit(field: keyof Errors, setter: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      setErrors(({ [field]: _, ...rest }) => rest);
    };
  }

  const credentialsMessage = wrongCredentials && !errors.email && !errors.password ? error.message : undefined;

  return (
    <AuthLayout title="Entrar">
      <form ref={formRef} onSubmit={submit} noValidate>
        {notice ? (
          <output className="form-success">
            <CheckIcon />
            {notice}
          </output>
        ) : null}
        <FormAlert message={wrongCredentials ? null : formError} />
        <Field
          label="E-mail"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          value={email}
          onChange={edit('email', setEmail)}
          error={errors.email ?? fieldError('email')}
          aria-invalid={credentialsMessage ? true : undefined}
        />
        <PasswordField
          label="Senha"
          action={
            <Link to="/esqueci-senha" state={{ email: email.trim() }} className="field-action">
              Esqueci a senha
            </Link>
          }
          autoComplete="current-password"
          value={password}
          onChange={edit('password', setPassword)}
          error={errors.password ?? fieldError('password') ?? credentialsMessage}
        />
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="auth-switch">
        Não tem uma conta? <Link to="/cadastro">Cadastre sua empresa</Link>
      </p>
      <p className="auth-invite-note">
        <MailIcon />
        <span>Recebeu um convite? Use o link do convite para criar sua conta.</span>
      </p>
    </AuthLayout>
  );
}
