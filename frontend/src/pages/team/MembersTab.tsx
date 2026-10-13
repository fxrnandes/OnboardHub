import { roleLabels, type Role } from '../../api/auth';
import { jobRolesApi, membersApi, type Member } from '../../api/team';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmButton } from '../../components/ConfirmButton';
import { FormAlert } from '../../components/FormAlert';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';

const roles: Role[] = ['master', 'gestor', 'colaborador'];

export function MembersTab() {
  const { session } = useAuth();
  const isMaster = session?.user.role === 'master';
  const members = useResource(membersApi.list);
  const jobRoles = useResource(jobRolesApi.list);
  const action = useAction();

  if (members.loading && !members.data) return <p className="page-loading">Carregando pessoas…</p>;
  if (members.error) return <FormAlert message={members.error} />;

  const jobRoleName = (id: string | null) => jobRoles.data?.find((jobRole) => jobRole.id === id)?.name ?? 'Sem cargo';

  async function update(member: Member, changes: { role?: Role; jobRoleId?: string | null }) {
    await action.run(async () => {
      const updated = await membersApi.update(member.id, changes);
      members.setData((list) => list?.map((item) => (item.id === updated.id ? updated : item)) ?? null);
    });
  }

  async function remove(member: Member) {
    await action.run(async () => {
      await membersApi.remove(member.id);
      members.setData((list) => list?.filter((item) => item.id !== member.id) ?? null);
    });
  }

  return (
    <div>
      <FormAlert message={action.error} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Papel</th>
              <th>Cargo</th>
              {isMaster ? <th aria-label="Ações" /> : null}
            </tr>
          </thead>
          <tbody>
            {members.data?.map((member) => {
              const isSelf = member.id === session?.user.id;
              return (
                <tr key={member.id}>
                  <td>
                    <strong>{member.name}</strong>
                    {isSelf ? <span className="muted"> (você)</span> : null}
                    <div className="muted small">{member.email}</div>
                  </td>
                  <td>
                    {isMaster ? (
                      <select
                        aria-label={`Papel de ${member.name}`}
                        value={member.role}
                        disabled={action.pending}
                        onChange={(event) => update(member, { role: event.target.value as Role })}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      roleLabels[member.role]
                    )}
                  </td>
                  <td>
                    {isMaster ? (
                      <select
                        aria-label={`Cargo de ${member.name}`}
                        value={member.jobRoleId ?? ''}
                        disabled={action.pending}
                        onChange={(event) => update(member, { jobRoleId: event.target.value || null })}
                      >
                        <option value="">Sem cargo</option>
                        {jobRoles.data?.map((jobRole) => (
                          <option key={jobRole.id} value={jobRole.id}>
                            {jobRole.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      jobRoleName(member.jobRoleId)
                    )}
                  </td>
                  {isMaster ? (
                    <td className="cell-actions">
                      {isSelf ? null : (
                        <ConfirmButton
                          label="Remover"
                          confirmLabel={`Remover ${member.name.split(' ')[0]}`}
                          disabled={action.pending}
                          onConfirm={() => remove(member)}
                        />
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isMaster ? (
        <p className="muted small">Para adicionar pessoas, envie um convite na aba Convites.</p>
      ) : null}
    </div>
  );
}
