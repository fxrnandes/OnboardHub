import { useState } from 'react';
import { roleLabels } from '../../api/auth';
import { inviteStatusLabels, invitesApi, jobRolesApi, type Invite, type NewInvite } from '../../api/team';
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

export function InvitesTab() {
  const invites = useResource(invitesApi.list);
  const jobRoles = useResource(jobRolesApi.list);
  const action = useAction();
  const [form, setForm] = useState<{ email: string; role: NewInvite['role']; jobRoleId: string }>({
    email: '',
    role: 'colaborador',
    jobRoleId: '',
  });
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = useSubmit(async () => {
    const result = await invitesApi.create({
      email: form.email.trim() || null,
      role: form.role,
      jobRoleId: form.jobRoleId || null,
    });
    invites.setData((list) => [result.invite, ...(list ?? [])]);
    setLink(result.link);
    setCopied(false);
    setForm((current) => ({ ...current, email: '' }));
  });

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  async function revoke(invite: Invite) {
    await action.run(async () => {
      await invitesApi.revoke(invite.id);
      invites.setData((list) => list?.map((item) => (item.id === invite.id ? { ...item, status: 'revoked' } : item)) ?? null);
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
  const pending = list.filter((invite) => invite.status === 'pending').length;

  return (
    <div className="team-panel">
      <form className="dash-card invite-card" onSubmit={create.onSubmit} noValidate>
        <header className="dash-card-head">
          <h2>Convidar pessoa</h2>
          <span>O link vale por 7 dias e pode ser usado uma vez</span>
        </header>
        <FormAlert message={create.formError} />
        <div className="invite-grid">
          <Field
            label="E-mail (opcional)"
            type="email"
            placeholder="pessoa@empresa.com"
            hint="Sem e-mail, qualquer pessoa com o link pode usar o convite uma vez."
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={create.fieldError('email')}
          />
          <SelectField
            label="Papel"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as NewInvite['role'] })}
            options={[
              { value: 'colaborador', label: roleLabels.colaborador },
              { value: 'gestor', label: roleLabels.gestor },
            ]}
          />
          <SelectField
            label="Cargo"
            value={form.jobRoleId}
            onChange={(event) => setForm({ ...form, jobRoleId: event.target.value })}
            options={[
              { value: '', label: 'Sem cargo' },
              ...(jobRoles.data ?? []).map((jobRole) => ({ value: jobRole.id, label: jobRole.name })),
            ]}
          />
          <button type="submit" className="button invite-submit" disabled={create.pending}>
            <LinkIcon />
            {create.pending ? 'Gerando…' : 'Gerar link de convite'}
          </button>
        </div>

        {link ? (
          <div className="invite-link" role="status">
            <span className="invite-link-icon" aria-hidden="true">
              <CheckIcon />
            </span>
            <div className="invite-link-body">
              <strong>Convite criado. Envie este link para a pessoa:</strong>
              <div className="invite-link-row">
                <input aria-label="Link do convite" value={link} readOnly onFocus={(event) => event.target.select()} />
                <button type="button" className="button button-secondary button-sm" onClick={copy}>
                  <CopyIcon />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>

      <FormAlert message={action.error} />

      {list.length ? (
        <section className="dash-card team-card" aria-labelledby="convites-title">
          <header className="dash-card-head">
            <h2 id="convites-title">Convites enviados</h2>
            <span>{pending === 1 ? '1 pendente' : `${pending} pendentes`}</span>
          </header>
          <div className="table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Convidado</th>
                  <th>Papel</th>
                  <th>Status</th>
                  <th>Expira em</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {list.map((invite) => (
                  <tr key={invite.id}>
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
                    <td>{roleLabels[invite.role]}</td>
                    <td>
                      <span className={`badge status-${invite.status}`}>{inviteStatusLabels[invite.status]}</span>
                    </td>
                    <td className="team-date">{dateFormat.format(new Date(invite.expiresAt))}</td>
                    <td className="team-actions">
                      {invite.status === 'pending' ? (
                        <ConfirmButton
                          className="button-ghost danger"
                          label="Revogar"
                          confirmLabel="Revogar convite"
                          title="Revogar este convite?"
                          description="O link deixa de funcionar na hora. Se precisar, você pode gerar um convite novo depois."
                          disabled={action.pending}
                          onConfirm={() => revoke(invite)}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
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
      )}
    </div>
  );
}
