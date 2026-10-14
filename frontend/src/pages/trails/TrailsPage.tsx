import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { jobRolesApi } from '../../api/team';
import { trailStatusLabels, trailsApi, type TrailSummary } from '../../api/trails';
import { ConfirmButton } from '../../components/ConfirmButton';
import { EmptyState } from '../../components/EmptyState';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { useSubmit } from '../../components/useSubmit';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function TrailsPage() {
  const navigate = useNavigate();
  const trails = useResource(trailsApi.list);
  const jobRoles = useResource(jobRolesApi.list);
  const action = useAction();
  const [title, setTitle] = useState('');

  const create = useSubmit(async () => {
    const trail = await trailsApi.create(title);
    navigate(`/trilhas/${trail.id}`);
  });

  async function duplicate(trail: TrailSummary) {
    await action.run(async () => {
      const copy = await trailsApi.duplicate(trail.id);
      trails.setData((list) => [copy, ...(list ?? [])]);
    });
  }

  async function remove(trail: TrailSummary) {
    await action.run(async () => {
      await trailsApi.remove(trail.id);
      trails.setData((list) => list?.filter((item) => item.id !== trail.id) ?? null);
    });
  }

  const jobRoleNames = (ids: string[]) =>
    ids
      .map((id) => jobRoles.data?.find((jobRole) => jobRole.id === id)?.name)
      .filter(Boolean)
      .join(', ');

  return (
    <section className="page">
      <header className="page-header">
        <h1>Trilhas</h1>
        <p>Monte as trilhas de onboarding em módulos e passos e escolha para quais cargos elas valem.</p>
      </header>

      <div className="stack">
        <form className="card inline-form" onSubmit={create.onSubmit} noValidate>
          <Field
            label="Nova trilha"
            placeholder="Ex.: Boas-vindas ao time de atendimento"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={create.fieldError('title') ?? create.formError ?? undefined}
          />
          <button type="submit" className="button" disabled={create.pending}>
            Criar trilha
          </button>
        </form>

        <FormAlert message={trails.error ?? action.error} />

        {trails.loading && !trails.data ? (
          <p className="page-loading">Carregando trilhas…</p>
        ) : trails.data?.length ? (
          <ul className="trail-grid">
            {trails.data.map((trail) => (
              <li key={trail.id} className="card trail-card">
                <div className="trail-card-head">
                  <span className={`badge status-${trail.status}`}>{trailStatusLabels[trail.status]}</span>
                </div>
                <h2>
                  <Link to={`/trilhas/${trail.id}`}>{trail.title}</Link>
                </h2>
                {trail.description ? <p className="trail-card-description">{trail.description}</p> : null}
                <p className="muted small">
                  {plural(trail.moduleCount, 'módulo', 'módulos')} · {plural(trail.stepCount, 'passo', 'passos')}
                </p>
                <p className="muted small">
                  {trail.jobRoleIds.length ? `Cargos: ${jobRoleNames(trail.jobRoleIds)}` : 'Nenhum cargo atribuído'}
                </p>
                <div className="trail-card-actions">
                  <Link className="button button-secondary" to={`/trilhas/${trail.id}`}>
                    Editar
                  </Link>
                  <button type="button" className="button-ghost" onClick={() => duplicate(trail)} disabled={action.pending}>
                    Duplicar
                  </button>
                  <ConfirmButton
                    label="Excluir"
                    confirmLabel="Confirmar exclusão"
                    disabled={action.pending}
                    onConfirm={() => remove(trail)}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : trails.data ? (
          <EmptyState title="Nenhuma trilha ainda">Crie a primeira trilha acima para começar a montar o onboarding.</EmptyState>
        ) : null}
      </div>
    </section>
  );
}
