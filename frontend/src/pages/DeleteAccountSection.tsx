import { useState } from 'react';
import { Link } from 'react-router';
import { authApi, type AccountDeletion } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmButton';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { TrashIcon } from '../layout/icons';

const people = (count: number) => (count === 1 ? '1 outra pessoa' : `${count} outras pessoas`);

function confirmLabelOf(plan: AccountDeletion, pending: boolean) {
  if (pending) return 'Excluindo…';
  return plan.deletesCompany ? 'Excluir conta e empresa' : 'Excluir conta';
}

function Consequences({ plan, companyName }: Readonly<{ plan: AccountDeletion; companyName: string }>) {
  if (!plan.deletesCompany) {
    return <>Seu nome, e-mail e progresso nas trilhas serão apagados. As trilhas e o restante da empresa continuam como estão.</>;
  }
  return (
    <>
      Você é o único administrador de <strong>{companyName}</strong>. Excluir a sua conta exclui também a empresa
      {plan.otherMembers ? <>, {people(plan.otherMembers)},</> : null} as trilhas, os arquivos enviados e todo o
      progresso registrado.
    </>
  );
}

function isPasswordProblem(requestError: unknown): requestError is ApiError {
  return (
    requestError instanceof ApiError &&
    (requestError.code === 'wrong_password' || requestError.details.some((detail) => detail.field === 'password'))
  );
}

export function DeleteAccountSection({ companyName }: Readonly<{ companyName: string }>) {
  const { logout } = useAuth();
  const [plan, setPlan] = useState<AccountDeletion | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | undefined>();

  async function start() {
    setError(null);
    setLoading(true);
    try {
      setPlan(await authApi.accountDeletion());
      setPassword('');
      setPasswordError(undefined);
      setOpen(true);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível continuar.');
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!plan) return;
    setPending(true);
    setError(null);
    setPasswordError(undefined);
    try {
      await authApi.deleteAccount(password, plan.deletesCompany);
      logout(plan.deletesCompany ? 'Sua conta e a empresa foram excluídas.' : 'Sua conta foi excluída.');
    } catch (requestError) {
      if (isPasswordProblem(requestError)) {
        setPasswordError(requestError.code === 'wrong_password' ? requestError.message : 'Informe a sua senha.');
      } else {
        setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível excluir a conta.');
      }
      setPending(false);
    }
  }

  return (
    <section className="settings-section danger-zone" aria-labelledby="perfil-excluir">
      <header>
        <h2 id="perfil-excluir">Excluir conta</h2>
        <p>Apaga os seus dados pessoais do OnboardHub, como prevê a LGPD. Não dá para desfazer.</p>
      </header>
      <div className="settings-section-body">
        <FormAlert message={open ? null : error} />
        <div className="danger-zone-row">
          <p>Depois de excluída, a conta não pode ser recuperada e você perde o acesso na hora.</p>
          <button type="button" className="button button-danger-outline" onClick={start} disabled={loading} aria-haspopup="dialog">
            <TrashIcon />
            Excluir minha conta
          </button>
        </div>
      </div>
      {open && plan ? (
        <ConfirmDialog
          title={plan.deletesCompany ? 'Excluir sua conta e a empresa?' : 'Excluir sua conta?'}
          description={<Consequences plan={plan} companyName={companyName} />}
          confirmLabel={confirmLabelOf(plan, pending)}
          onConfirm={confirm}
          onClose={() => setOpen(false)}
          ready={password.length > 0}
          pending={pending}
          closeOnConfirm={false}
        >
          {plan.deletesCompany && plan.otherMembers ? (
            <p className="dialog-note">
              Quer manter a empresa? Torne outra pessoa administradora em <Link to="/equipe/membros">Equipe</Link> antes de
              excluir a sua conta.
            </p>
          ) : null}
          <div className="dialog-field">
            <FormAlert message={error} />
            <PasswordField
              label="Confirme com a sua senha"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError(undefined);
              }}
              error={passwordError}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
