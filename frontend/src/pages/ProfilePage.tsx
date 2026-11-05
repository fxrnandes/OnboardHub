import { useState } from 'react';
import { authApi, roleLabels } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Field';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { useSubmit } from '../components/useSubmit';
import { DeleteAccountSection } from './DeleteAccountSection';
import { CheckIcon, UserIcon } from '../layout/icons';

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
    <div className="settings profile">
      <header className="profile-head">
        <span className="profile-avatar" aria-hidden="true">
          <UserIcon />
        </span>
        <div className="home-header">
          <h1>Meu perfil</h1>
          <p>
            {roleLabels[user.role]} em <strong>{company.name}</strong>
          </p>
        </div>
      </header>

      <div className="settings-panel">
        <section className="settings-section" aria-labelledby="perfil-dados">
          <header>
            <h2 id="perfil-dados">Dados pessoais</h2>
            <p>Seu nome aparece para os gestores no painel e na lista da equipe.</p>
          </header>
          <form className="settings-section-body profile-form" onSubmit={saveName.onSubmit} noValidate>
            <FormAlert message={saveName.formError} />
            <div className="profile-fields">
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
            </div>
            <div className="form-actions">
              {nameSaved && name.trim() === user.name ? (
                <span className="saved-note">
                  <CheckIcon />
                  Salvo
                </span>
              ) : null}
              <button type="submit" className="button" disabled={saveName.pending || name.trim() === user.name}>
                Salvar nome
              </button>
            </div>
          </form>
        </section>

        <section className="settings-section" aria-labelledby="perfil-senha">
          <header>
            <h2 id="perfil-senha">Senha</h2>
            <p>Ao trocar a senha, você continua conectado aqui e as outras sessões são encerradas.</p>
          </header>
          <form className="settings-section-body profile-form" onSubmit={savePassword.onSubmit} noValidate>
            <FormAlert message={passwordFormError} />
            {passwordChanged ? (
              <output className="form-success">
                <CheckIcon />
                Senha alterada. As outras sessões foram encerradas.
              </output>
            ) : null}
            <div className="profile-fields">
              <PasswordField
                label="Senha atual"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                error={passwordFieldError('currentPassword')}
              />
              <span className="profile-spacer" aria-hidden="true" />
              <PasswordField
                label="Nova senha"
                autoComplete="new-password"
                hint="Mínimo de 8 caracteres."
                value={passwords.newPassword}
                onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                error={passwordFieldError('newPassword')}
              />
              <PasswordField
                label="Confirme a nova senha"
                autoComplete="new-password"
                value={passwords.confirmPassword}
                onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })}
                error={confirmError ?? undefined}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="button" disabled={savePassword.pending}>
                {savePassword.pending ? 'Salvando…' : 'Trocar senha'}
              </button>
            </div>
          </form>
        </section>

        <DeleteAccountSection companyName={company.name} />
      </div>
    </div>
  );
}
