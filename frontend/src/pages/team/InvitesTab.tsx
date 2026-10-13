import { useState } from 'react';
import { roleLabels } from '../../api/auth';
import { inviteStatusLabels, invitesApi, jobRolesApi, type Invite, type NewInvite } from '../../api/team';
import { ConfirmButton } from '../../components/ConfirmButton';
import { EmptyState } from '../../components/EmptyState';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { SelectField } from '../../components/SelectField';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { useSubmit } from '../../components/useSubmit';

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

  if (invites.loading && !invites.data) return <p className="page-loading">Carregando convites…</p>;
  if (invites.error) return <FormAlert message={invites.error} />;

  return (
    <div className="stack">
      <form className="card" onSubmit={create.onSubmit} noValidate>
        <h2>Convidar pessoa</h2>
        <FormAlert message={create.formError} />
        <div className="form-grid">
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
        </div>
        <button type="submit" className="button" disabled={create.pending}>
          {create.pending ? 'Gerando…' : 'Gerar link de convite'}
        </button>

        {link ? (
          <div className="invite-link" role="status">
            <span>Envie este link para a pessoa:</span>
            <div className="invite-link-row">
              <input aria-label="Link do convite" value={link} readOnly onFocus={(event) => event.target.select()} />
              <button type="button" className="button button-secondary" onClick={copy}>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        ) : null}
      </form>

      <FormAlert message={action.error} />

      {invites.data?.length ? (
        <div className="table-wrap">
          <table className="table">
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
              {invites.data.map((invite) => (
                <tr key={invite.id}>
                  <td>
                    {invite.email ?? <span className="muted">Link aberto</span>}
                    {invite.jobRoleName ? <div className="muted small">{invite.jobRoleName}</div> : null}
                  </td>
                  <td>{roleLabels[invite.role]}</td>
                  <td>
                    <span className={`badge status-${invite.status}`}>{inviteStatusLabels[invite.status]}</span>
                  </td>
                  <td>{dateFormat.format(new Date(invite.expiresAt))}</td>
                  <td className="cell-actions">
                    {invite.status === 'pending' ? (
                      <ConfirmButton
                        label="Revogar"
                        confirmLabel="Confirmar"
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
      ) : (
        <EmptyState title="Nenhum convite enviado">Gere um link acima e envie para a pessoa entrar na empresa.</EmptyState>
      )}
    </div>
  );
}
