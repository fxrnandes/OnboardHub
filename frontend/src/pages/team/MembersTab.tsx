import { useState } from 'react';
import { roleLabels, type Role } from '../../api/auth';
import { jobRolesApi, membersApi, type Member } from '../../api/team';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmButton } from '../../components/ConfirmButton';
import { FormAlert } from '../../components/FormAlert';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { SearchIcon, UserIcon } from '../../layout/icons';

const roles: Role[] = ['master', 'gestor', 'colaborador'];

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export function MembersTab() {
  const { session } = useAuth();
  const isMaster = session?.user.role === 'master';
  const members = useResource(membersApi.list);
  const jobRoles = useResource(jobRolesApi.list);
  const action = useAction();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');

  if (members.loading && !members.data) return <p className="page-loading">Carregando pessoas…</p>;
  if (members.error) return <FormAlert message={members.error} />;

  const jobRoleName = (id: string | null) => jobRoles.data?.find((jobRole) => jobRole.id === id)?.name ?? 'Sem cargo';
  const all = members.data ?? [];
  const count = (role: Role | 'all') => (role === 'all' ? all.length : all.filter((member) => member.role === role).length);
  const term = search.trim().toLowerCase();
  const visible = all.filter(
    (member) =>
      (roleFilter === 'all' || member.role === roleFilter) &&
      (!term || member.name.toLowerCase().includes(term) || member.email.toLowerCase().includes(term)),
  );

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
    <div className="team-panel">
      <FormAlert message={action.error} />
      <div className="team-toolbar">
        <div className="segmented" role="group" aria-label="Filtrar por papel">
          {(['all', ...roles] as const).map((role) => (
            <button key={role} type="button" aria-pressed={roleFilter === role} onClick={() => setRoleFilter(role)}>
              {role === 'all' ? 'Todas' : roleLabels[role]}
              <span className="segmented-count">{count(role)}</span>
            </button>
          ))}
        </div>
        <label className="dash-search team-search">
          <SearchIcon />
          <input
            type="search"
            aria-label="Buscar pessoa"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <section className="dash-card team-card">
        {visible.length ? (
          <div className="table-wrap">
            <table className="dash-table team-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Papel</th>
                  <th>Cargo</th>
                  <th>Entrou em</th>
                  {isMaster ? <th aria-label="Ações" /> : null}
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => {
                  const isSelf = member.id === session?.user.id;
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="person">
                          <span className="person-icon" aria-hidden="true">
                            <UserIcon />
                          </span>
                          <span className="person-text">
                            <strong>
                              {member.name}
                              {isSelf ? <span className="you-tag">(você)</span> : null}
                            </strong>
                            <span className="dash-sub">{member.email}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        {isMaster ? (
                          <select
                            className="pill-select"
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
                            className="pill-select"
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
                      <td className="team-date">{member.createdAt ? dateFormat.format(new Date(member.createdAt)) : '—'}</td>
                      {isMaster ? (
                        <td className="team-actions">
                          {isSelf ? null : (
                            <ConfirmButton
                              icon
                              label="Remover"
                              confirmLabel={`Remover ${member.name.split(' ')[0]}`}
                              title={`Remover ${member.name} da empresa?`}
                              description="A pessoa perde o acesso ao OnboardHub e o progresso dela nas trilhas é apagado."
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
        ) : (
          <div className="dash-none">
            <strong>Ninguém encontrado</strong>
            <p>Ajuste a busca ou o filtro de papel.</p>
          </div>
        )}
      </section>
      {isMaster ? <p className="team-note">Para adicionar pessoas, envie um convite na aba Convites.</p> : null}
    </div>
  );
}
