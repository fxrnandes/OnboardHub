import { useState } from 'react';
import { jobRolesApi, type JobRole } from '../../api/team';
import { ConfirmButton } from '../../components/ConfirmButton';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { useSubmit } from '../../components/useSubmit';
import { PencilIcon, PlusIcon, TagIcon } from '../../layout/icons';

const byName = (a: JobRole, b: JobRole) => a.name.localeCompare(b.name, 'pt-BR');

export function JobRolesTab() {
  const jobRoles = useResource(jobRolesApi.list);
  const action = useAction();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const create = useSubmit(async () => {
    const created = await jobRolesApi.create(name);
    jobRoles.setData((list) => [...(list ?? []), created].sort(byName));
    setName('');
  });

  async function saveRename() {
    if (!editing) return;
    const ok = await action.run(async () => {
      const renamed = await jobRolesApi.rename(editing.id, editing.name);
      jobRoles.setData((list) => list?.map((item) => (item.id === renamed.id ? renamed : item)).sort(byName) ?? null);
    });
    if (ok) setEditing(null);
  }

  async function remove(jobRole: JobRole) {
    await action.run(async () => {
      await jobRolesApi.remove(jobRole.id);
      jobRoles.setData((list) => list?.filter((item) => item.id !== jobRole.id) ?? null);
    });
  }

  if (jobRoles.loading && !jobRoles.data) return <p className="page-loading">Carregando cargos…</p>;
  if (jobRoles.error) return <FormAlert message={jobRoles.error} />;

  const list = jobRoles.data ?? [];

  return (
    <div className="team-split">
      <div className="team-panel">
        <FormAlert message={action.error} />
        {list.length ? (
          <ul className="role-grid">
            {list.map((jobRole) => (
              <li key={jobRole.id} className={editing?.id === jobRole.id ? 'role-card is-editing' : 'role-card'}>
                {editing?.id === jobRole.id ? (
                  <form
                    className="inline-edit"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveRename();
                    }}
                  >
                    <input
                      aria-label="Nome do cargo"
                      value={editing.name}
                      onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                      onKeyDown={(event) => event.key === 'Escape' && setEditing(null)}
                      autoFocus
                    />
                    <div className="role-card-edit-actions">
                      <button type="button" className="button button-secondary button-sm" onClick={() => setEditing(null)}>
                        Cancelar
                      </button>
                      <button type="submit" className="button button-sm" disabled={action.pending}>
                        Salvar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="role-card-icon" aria-hidden="true">
                      <TagIcon />
                    </span>
                    <div className="role-card-text">
                      <strong>{jobRole.name}</strong>
                      <span>{jobRole.memberCount === 1 ? '1 pessoa' : `${jobRole.memberCount} pessoas`}</span>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-action"
                        aria-label="Renomear"
                        onClick={() => setEditing({ id: jobRole.id, name: jobRole.name })}
                      >
                        <PencilIcon />
                      </button>
                      <ConfirmButton
                        icon
                        label="Excluir"
                        confirmLabel="Excluir cargo"
                        title={`Excluir o cargo "${jobRole.name}"?`}
                        description="As pessoas desse cargo ficam sem cargo e deixam de ver as trilhas atribuídas a ele."
                        disabled={action.pending}
                        onConfirm={() => remove(jobRole)}
                      />
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="my-trails-empty">
            <div className="my-trails-empty-art" aria-hidden="true">
              <span />
              <span />
              <span />
              <TagIcon />
            </div>
            <h2>Nenhum cargo ainda</h2>
            <p>Crie cargos para direcionar as trilhas de onboarding para as pessoas certas.</p>
          </div>
        )}
      </div>

      <aside className="side-card team-side">
        <h2>Criar cargo</h2>
        <p className="side-card-intro">Cada trilha vale para um ou mais cargos. Quem tem o cargo vê as trilhas dele.</p>
        <form onSubmit={create.onSubmit} noValidate>
          <Field
            label="Novo cargo"
            placeholder="Ex.: Atendimento, Financeiro"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={create.fieldError('name') ?? create.formError ?? undefined}
          />
          <button type="submit" className="button team-side-button" disabled={create.pending}>
            <PlusIcon />
            Adicionar
          </button>
        </form>
      </aside>
    </div>
  );
}
