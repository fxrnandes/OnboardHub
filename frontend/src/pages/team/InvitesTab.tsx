import { useState } from 'react';
import { Link } from 'react-router';
import { roleLabels } from '../../api/auth';
import { inviteStatusLabels, invitesApi, jobRolesApi, type Invite, type InviteResult, type NewInvite } from '../../api/team';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmButton } from '../../components/ConfirmButton';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { SelectField } from '../../components/SelectField';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { useSubmit } from '../../components/useSubmit';
import { CheckIcon, CopyIcon, LinkIcon, MailIcon } from '../../layout/icons';
import { Bone, Loading, TableBones } from '../../components/Skeleton';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type ListFilter = 'pending' | 'all';

interface Created {
  link: string;
  email: string | null;
  emailSent: boolean;
  resent: boolean;
}

function submitLabel(withEmail: boolean, pending: boolean) {
  if (withEmail) return pending ? 'Enviando…' : 'Enviar convite por e-mail';
  return pending ? 'Gerando…' : 'Gerar link de convite';
}

function createdMessage({ email, emailSent, resent }: Created) {
  if (emailSent) return `${resent ? 'Convite reenviado' : 'Convite enviado'} para ${email}. Se quiser, copie o link também:`;
  if (email) return 'Não conseguimos enviar o e-mail. Envie este link para a pessoa:';
  return resent ? 'Link novo gerado. O anterior deixou de funcionar:' : 'Convite criado. Envie este link para a pessoa:';
}

function inviteDate(invite: Invite) {
  if (invite.status === 'accepted' && invite.acceptedAt) {
    const when = dateFormat.format(new Date(invite.acceptedAt));
    return invite.acceptedByName ? `Aceito em ${when} por ${invite.acceptedByName}` : `Aceito em ${when}`;
  }
  if (invite.status === 'pending') return `Expira em ${dateFormat.format(new Date(invite.expiresAt))}`;
  if (invite.status === 'expired') return `Expirou em ${dateFormat.format(new Date(invite.expiresAt))}`;
  return 'Cancelado';
}

const canResend = (invite: Invite) => invite.status === 'pending' || invite.status === 'expired';

interface InviteRowProps {
  invite: Invite;
  manageable: boolean;
  busy: boolean;
  onResend: () => void;
  onRevoke: () => Promise<void>;
}

function InviteRow({ invite, manageable, busy, onResend, onRevoke }: Readonly<InviteRowProps>) {
  return (
    <tr>
      <td>
        <div className="person">
          <span className="person-icon" aria-hidden="true">
            {invite.email ? <MailIcon /> : <LinkIcon />}
          </span>
          <span className="person-text">
            <strong>{invite.email ?? 'Link aberto'}</strong>
            <span className="dash-sub">{invite.jobRoleName ?? 'Sem cargo'}</span>
          </span>
        </div>
      </td>
      <td data-label="Papel">{roleLabels[invite.role]}</td>
      <td data-label="Status">
        <span className={`badge status-${invite.status}`}>{inviteStatusLabels[invite.status]}</span>
      </td>
      <td className="team-date" data-label="Situação">
        {inviteDate(invite)}
      </td>
      <td className="team-actions">
        {manageable && canResend(invite) ? (
          <button type="button" className="button-ghost" disabled={busy} onClick={onResend}>
            {invite.email ? 'Reenviar' : 'Gerar link novo'}
          </button>
        ) : null}
        {manageable && invite.status === 'pending' ? (
          <ConfirmButton
            className="button-ghost danger"
            label="Revogar"
            confirmLabel="Revogar convite"
            title="Revogar este convite?"
            description="O link deixa de funcionar na hora. Se precisar, você pode gerar um convite novo depois."
            disabled={busy}
            onConfirm={onRevoke}
          />
        ) : null}
      </td>
    </tr>
  );
}

function CreatedLink({ created }: Readonly<{ created: Created }>) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(created.link);
    setCopied(true);
  }

  return (
    <output className="invite-link">
      <span className="invite-link-icon" aria-hidden="true">
        <CheckIcon />
      </span>
      <div className="invite-link-body">
        <strong>{createdMessage(created)}</strong>
        <div className="invite-link-row">
          <input aria-label="Link do convite" value={created.link} readOnly onFocus={(event) => event.target.select()} />
          <button type="button" className="button button-secondary button-sm" onClick={copy}>
            <CopyIcon />
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
    </output>
  );
}

interface InviteListProps {
  invites: Invite[];
  manageable: (invite: Invite) => boolean;
  busy: boolean;
  onResend: (invite: Invite) => void;
  onRevoke: (invite: Invite) => Promise<void>;
}

function InviteList({ invites, manageable, busy, onResend, onRevoke }: Readonly<InviteListProps>) {
  const [filter, setFilter] = useState<ListFilter>('pending');
  const pending = invites.filter((invite) => invite.status === 'pending');
  const visible = filter === 'pending' ? pending : invites;
  const pendingCount = pending.length;

  if (!invites.length) {
    return (
      <div className="my-trails-empty">
        <div className="my-trails-empty-art" aria-hidden="true">
          <span />
          <span />
          <span />
          <MailIcon />
        </div>
        <h2>Nenhum convite enviado</h2>
        <p>Gere um link acima e envie para a pessoa entrar na empresa.</p>
      </div>
    );
  }

  return (
    <section className="dash-card team-card" aria-labelledby="convites-title">
      <header className="dash-card-head">
        <h2 id="convites-title">Convites enviados</h2>
        <fieldset className="segmented segmented-sm" aria-label="Filtrar convites">
          <button type="button" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>
            Pendentes
            <span className="segmented-count">{pendingCount}</span>
          </button>
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            Todos
            <span className="segmented-count">{invites.length}</span>
          </button>
        </fieldset>
      </header>
      {visible.length ? (
        <div className="table-wrap">
          <table className="dash-table stack-table">
            <thead>
              <tr>
                <th>Convidado</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Situação</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {visible.map((invite) => (
                <InviteRow
                  key={invite.id}
                  invite={invite}
                  manageable={manageable(invite)}
                  busy={busy}
                  onResend={() => onResend(invite)}
                  onRevoke={() => onRevoke(invite)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="dash-none-text">Nenhum convite pendente. Veja os aceitos e expirados em "Todos".</p>
      )}
    </section>
  );
}

export function InvitesTab() {
  const { session } = useAuth();
  const isMaster = session?.user.role === 'master';
  const invites = useResource(invitesApi.list);
  const jobRoles = useResource(jobRolesApi.list);
  const action = useAction();
  const [form, setForm] = useState<{ email: string; role: NewInvite['role']; jobRoleId: string }>({
    email: '',
    role: 'colaborador',
    jobRoleId: '',
  });
  const [created, setCreated] = useState<Created | null>(null);
  const [missingJobRole, setMissingJobRole] = useState(false);

  function show(result: InviteResult, resent: boolean) {
    setCreated({ link: result.link, email: result.invite.email, emailSent: result.emailSent, resent });
  }

  const create = useSubmit(async () => {
    if (form.role === 'colaborador' && !form.jobRoleId) {
      setMissingJobRole(true);
      return;
    }
    const result = await invitesApi.create({
      email: form.email.trim() || null,
      role: form.role,
      jobRoleId: form.jobRoleId || null,
    });
    invites.setData((list) => [result.invite, ...(list ?? [])]);
    show(result, false);
    setForm((current) => ({ ...current, email: '' }));
  });

  const replace = (invite: Invite) => invites.setData((list) => list?.map((item) => (item.id === invite.id ? invite : item)) ?? null);

  async function resend(invite: Invite) {
    await action.run(async () => {
      const result = await invitesApi.resend(invite.id);
      replace(result.invite);
      show(result, true);
    });
  }

  async function revoke(invite: Invite) {
    await action.run(async () => {
      await invitesApi.revoke(invite.id);
      replace({ ...invite, status: 'revoked' });
    });
  }

  if (invites.loading && !invites.data) {
    return (
      <Loading label="Carregando convites…" className="team-panel">
        <div className="sk-card sk-pad sk-invite">
          <Bone w={150} h={16} />
          <div className="sk-invite-row">
            <Bone h={44} r={11} />
            <Bone h={44} r={11} />
            <Bone h={44} r={11} />
            <Bone w={200} h={44} r={12} />
          </div>
        </div>
        <TableBones rows={3} />
      </Loading>
    );
  }
  if (invites.error) return <FormAlert message={invites.error} />;

  const list = invites.data ?? [];
  const withEmail = form.email.trim().length > 0;
  const manageable = (invite: Invite) => isMaster || invite.role === 'colaborador';
  const noJobRoles = jobRoles.data?.length === 0;
  const jobRoleError = missingJobRole ? 'Escolha o cargo: é por ele que a pessoa vê as trilhas.' : create.fieldError('jobRoleId');

  return (
    <div className="team-panel">
      <form className="dash-card invite-card" onSubmit={create.onSubmit} noValidate>
        <header className="dash-card-head">
          <h2>Convidar pessoa</h2>
          <span>O convite vale por 7 dias e pode ser usado uma vez</span>
        </header>
        <FormAlert message={create.formError} />
        {noJobRoles && form.role === 'colaborador' ? (
          <p className="invite-hint">
            Colaboradores precisam de um cargo para ver as trilhas.{' '}
            {isMaster ? <Link to="/equipe/cargos">Crie o primeiro cargo</Link> : 'Peça ao administrador para criar um cargo.'}
          </p>
        ) : null}
        <div className="invite-grid">
          <Field
            label="E-mail (opcional)"
            type="email"
            placeholder="pessoa@empresa.com"
            hint="Com e-mail, o convite chega direto para a pessoa. Sem e-mail, você copia o link e envia por onde preferir."
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={create.fieldError('email')}
          />
          {isMaster ? (
            <SelectField
              label="Papel"
              value={form.role}
              onChange={(event) => {
                setForm({ ...form, role: event.target.value as NewInvite['role'] });
                setMissingJobRole(false);
              }}
              options={[
                { value: 'colaborador', label: roleLabels.colaborador },
                { value: 'gestor', label: roleLabels.gestor },
              ]}
            />
          ) : null}
          <SelectField
            label="Cargo"
            value={form.jobRoleId}
            onChange={(event) => {
              setForm({ ...form, jobRoleId: event.target.value });
              setMissingJobRole(false);
            }}
            error={jobRoleError}
            options={[
              { value: '', label: form.role === 'colaborador' ? 'Escolha o cargo' : 'Sem cargo' },
              ...(jobRoles.data ?? []).map((jobRole) => ({ value: jobRole.id, label: jobRole.name })),
            ]}
          />
          <button type="submit" className="button invite-submit" disabled={create.pending}>
            {withEmail ? <MailIcon /> : <LinkIcon />}
            {submitLabel(withEmail, create.pending)}
          </button>
        </div>
        {isMaster ? null : (
          <p className="invite-hint">Gestores convidam colaboradores. Para convidar outro gestor, fale com o administrador.</p>
        )}

        {created ? <CreatedLink key={created.link} created={created} /> : null}
      </form>

      <FormAlert message={action.error} />

      <InviteList invites={list} manageable={manageable} busy={action.pending} onResend={resend} onRevoke={revoke} />
    </div>
  );
}
