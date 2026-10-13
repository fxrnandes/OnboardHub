import { useState } from 'react';
import { jobRolesApi, type JobRole } from '../../api/team';
import { ConfirmButton } from '../../components/ConfirmButton';
import { EmptyState } from '../../components/EmptyState';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { useSubmit } from '../../components/useSubmit';

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

  return (
    <div className="stack">
      <form className="card inline-form" onSubmit={create.onSubmit} noValidate>
        <Field
          label="Novo cargo"
          placeholder="Ex.: Atendimento, Financeiro"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={create.fieldError('name') ?? create.formError ?? undefined}
        />
        <button type="submit" className="button" disabled={create.pending}>
          Adicionar
        </button>
      </form>

      <FormAlert message={action.error} />

      {jobRoles.data?.length ? (
        <ul className="list">
          {jobRoles.data.map((jobRole) => (
            <li key={jobRole.id} className="list-item">
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
                    autoFocus
                  />
                  <button type="submit" className="button" disabled={action.pending}>
                    Salvar
                  </button>
                  <button type="button" className="button-ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <div>
                    <strong>{jobRole.name}</strong>
                    <div className="muted small">
                      {jobRole.memberCount === 1 ? '1 pessoa' : `${jobRole.memberCount} pessoas`}
                    </div>
                  </div>
                  <div className="cell-actions">
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => setEditing({ id: jobRole.id, name: jobRole.name })}
                    >
                      Renomear
                    </button>
                    <ConfirmButton
                      label="Excluir"
                      confirmLabel="Confirmar exclusão"
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
        <EmptyState title="Nenhum cargo ainda">
          Crie cargos para direcionar as trilhas de onboarding para as pessoas certas.
        </EmptyState>
      )}
    </div>
  );
}
