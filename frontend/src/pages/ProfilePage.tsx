import { useState } from 'react';
import { authApi, roleLabels } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Field';
import { FormAlert } from '../components/FormAlert';
import { useSubmit } from '../components/useSubmit';

const passwordErrors: Record<string, string> = {
  wrong_password: 'currentPassword',
  same_password: 'newPassword',
};

export function ProfilePage() {
  const { session, refresh, startSession } = useAuth();
  const [name, setName] = useState(session?.user.name ?? '');
  const [nameSaved, setNameSaved] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const saveName = useSubmit(async () => {
    await authApi.updateProfile(name);
    await refresh();
    setNameSaved(true);
  });

  const savePassword = useSubmit(async () => {
    setPasswordChanged(false);
    if (passwords.newPassword !== passwords.confirmPassword) {
      setConfirmError('As senhas não conferem.');
      return;
    }
    setConfirmError(null);
    const token = await authApi.changePassword(passwords.currentPassword, passwords.newPassword);
    await startSession(token);
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordChanged(true);
  });

  if (!session) return null;
  const { user, company } = session;
  const passwordError = savePassword.error;
  const passwordFieldError = (field: string) =>
    savePassword.fieldError(field) ??
    (passwordError instanceof ApiError && passwordErrors[passwordError.code] === field ? passwordError.message : undefined);
  const passwordFormError =
    passwordError && !passwordErrors[passwordError.code] && passwordError.details.length === 0 ? passwordError.message : null;

  return (
    <section className="page page-narrow">
      <header className="page-header">
        <h1>Meu perfil</h1>
        <p>
          {roleLabels[user.role]} em <strong>{company.name}</strong>
        </p>
      </header>

      <div className="stack">
        <form className="card" onSubmit={saveName.onSubmit} noValidate>
          <h2>Dados pessoais</h2>
          <FormAlert message={saveName.formError} />
          <Field
            label="Nome"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameSaved(false);
            }}
            error={saveName.fieldError('name')}
          />
          <Field label="E-mail" type="email" value={user.email} readOnly hint="O e-mail é usado para entrar e não pode ser alterado." />
          <div className="form-actions">
            <button type="submit" className="button" disabled={saveName.pending || name.trim() === user.name}>
              Salvar nome
            </button>
            {nameSaved && name.trim() === user.name ? <span className="saved-note">Salvo</span> : null}
          </div>
        </form>

        <form className="card" onSubmit={savePassword.onSubmit} noValidate>
          <h2>Trocar senha</h2>
          <p className="muted small card-intro">Ao trocar a senha, você continua conectado aqui e as outras sessões são encerradas.</p>
          <FormAlert message={passwordFormError} />
          {passwordChanged ? (
            <div className="form-success" role="status">
              Senha alterada. As outras sessões foram encerradas.
            </div>
          ) : null}
          <Field
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
            error={passwordFieldError('currentPassword')}
          />
          <Field
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres."
            value={passwords.newPassword}
            onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
            error={passwordFieldError('newPassword')}
          />
          <Field
            label="Confirme a nova senha"
            type="password"
            autoComplete="new-password"
            value={passwords.confirmPassword}
            onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })}
            error={confirmError ?? undefined}
          />
          <button type="submit" className="button" disabled={savePassword.pending}>
            {savePassword.pending ? 'Salvando…' : 'Trocar senha'}
          </button>
        </form>
      </div>
    </section>
  );
}
