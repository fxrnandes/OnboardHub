import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { authApi } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { isValidCnpj, maskCnpj } from '../components/cnpj';
import { Field } from '../components/Field';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { SocialSignIn } from '../components/SocialSignIn';
import { useSubmit } from '../components/useSubmit';
import { AuthLayout } from '../layout/AuthLayout';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const personFields = ['name', 'email', 'password'];

type Form = { name: string; email: string; password: string; companyName: string; cnpj: string };
type StepOneErrors = Partial<Record<'name' | 'email' | 'password', string>>;
type StepTwoErrors = Partial<Record<'companyName' | 'cnpj', string>>;

function validateStepOne(form: Form): StepOneErrors {
  const errors: StepOneErrors = {};
  if (form.name.trim().length < 2) errors.name = 'Informe seu nome completo.';
  if (!emailPattern.test(form.email.trim())) errors.email = 'Informe um e-mail válido.';
  if (form.password.length < 8) errors.password = 'A senha precisa ter pelo menos 8 caracteres.';
  return errors;
}

function validateStepTwo(form: Form): StepTwoErrors {
  const errors: StepTwoErrors = {};
  if (form.companyName.trim().length < 2) errors.companyName = 'Informe o nome da empresa.';
  if (!form.cnpj.trim()) errors.cnpj = 'Informe o CNPJ da empresa.';
  else if (!isValidCnpj(form.cnpj)) errors.cnpj = 'CNPJ inválido.';
  return errors;
}

function focusFirstInvalid(container: HTMLElement | null) {
  container?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus();
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="auth-steps">
      <span className="auth-steps-label">Etapa {step} de 2</span>
      <span className="auth-steps-bars" aria-hidden="true">
        <span className="is-active" />
        <span className={step === 2 ? 'is-active' : undefined} />
      </span>
    </div>
  );
}

export function SignupPage() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Form>({ name: '', email: '', password: '', companyName: '', cnpj: '' });
  const [stepOneErrors, setStepOneErrors] = useState<StepOneErrors>({});
  const [stepTwoErrors, setStepTwoErrors] = useState<StepTwoErrors>({});
  const [attempt, setAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const update = (field: keyof Form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'cnpj' ? maskCnpj(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setStepOneErrors(({ [field as keyof StepOneErrors]: _, ...rest }) => rest);
    setStepTwoErrors(({ [field as keyof StepTwoErrors]: _, ...rest }) => rest);
  };

  const { pending, error, onSubmit, fieldError, formError } = useSubmit(async () => {
    const { token } = await authApi.signup(form);
    await startSession(token);
    navigate('/', { replace: true });
  });

  const emailTaken = error?.code === 'email_already_registered' ? error.message : undefined;
  const cnpjTaken = error?.code === 'cnpj_already_registered' ? error.message : undefined;

  useEffect(() => {
    if (emailTaken || personFields.some((field) => error?.fieldMessage(field))) setStep(1);
  }, [error, emailTaken]);

  useEffect(() => {
    focusFirstInvalid(formRef.current);
  }, [attempt, error, step]);

  function continueToCompany(event: FormEvent) {
    event.preventDefault();
    const errors = validateStepOne(form);
    setStepOneErrors(errors);
    setAttempt((current) => current + 1);
    if (Object.keys(errors).length === 0) setStep(2);
  }

  function createAccount(event: FormEvent) {
    const errors = validateStepTwo(form);
    setStepTwoErrors(errors);
    setAttempt((current) => current + 1);
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      return;
    }
    void onSubmit(event);
  }

  const personError = (field: 'name' | 'email' | 'password') =>
    stepOneErrors[field] ?? fieldError(field) ?? (field === 'email' ? emailTaken : undefined);

  if (step === 1) {
    return (
      <AuthLayout title="Crie sua conta">
        <StepIndicator step={1} />
        <SocialSignIn />
        <form ref={formRef} onSubmit={continueToCompany} noValidate>
          <Field
            label="Nome completo"
            autoComplete="name"
            value={form.name}
            onChange={update('name')}
            error={personError('name')}
          />
          <Field
            label="E-mail"
            type="email"
            placeholder="voce@empresa.com"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={personError('email')}
          />
          <PasswordField
            label="Senha"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres."
            value={form.password}
            onChange={update('password')}
            error={personError('password')}
          />
          <button type="submit" className="button">
            Continuar
          </button>
        </form>
        <p className="auth-switch">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sua empresa" subtitle="Você será o administrador da conta.">
      <StepIndicator step={2} />
      <form ref={formRef} onSubmit={createAccount} noValidate>
        <FormAlert message={emailTaken || cnpjTaken ? null : formError} />
        <Field
          label="Nome da empresa"
          autoComplete="organization"
          value={form.companyName}
          onChange={update('companyName')}
          error={stepTwoErrors.companyName ?? fieldError('companyName')}
        />
        <Field
          label="CNPJ"
          inputMode="text"
          placeholder="00.000.000/0000-00"
          autoComplete="off"
          value={form.cnpj}
          onChange={update('cnpj')}
          error={stepTwoErrors.cnpj ?? fieldError('cnpj') ?? cnpjTaken}
        />
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Criando conta…' : 'Criar conta'}
        </button>
        <button type="button" className="auth-back" onClick={() => setStep(1)}>
          Voltar
        </button>
      </form>
    </AuthLayout>
  );
}
