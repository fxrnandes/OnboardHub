import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { relativeDate } from '../../api/reports';
import { jobRolesApi } from '../../api/team';
import { trailStatusLabels, trailsApi, type TrailStatus, type TrailSummary } from '../../api/trails';
import { ConfirmButton } from '../../components/ConfirmButton';
import { FormAlert } from '../../components/FormAlert';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { useSubmit } from '../../components/useSubmit';
import { CopyIcon, LayersIcon, PencilIcon, PlusIcon } from '../../layout/icons';
import { Bone, Loading, RowBones } from '../../components/Skeleton';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

type Filter = 'all' | TrailStatus;

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'published', label: 'Publicadas' },
  { value: 'draft', label: 'Rascunhos' },
];

export function TrailsPage() {
  const navigate = useNavigate();
  const trails = useResource(trailsApi.list);
  const jobRoles = useResource(jobRolesApi.list);
  const action = useAction();
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

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

  const jobRoleName = (id: string) => jobRoles.data?.find((jobRole) => jobRole.id === id)?.name;
  const all = trails.data ?? [];
  const count = (value: Filter) => (value === 'all' ? all.length : all.filter((trail) => trail.status === value).length);
  const visible = filter === 'all' ? all : all.filter((trail) => trail.status === filter);
  const createError = create.fieldError('title') ?? create.formError ?? undefined;

  return (
    <section className="trails-page">
      <header className="page-head">
        <div className="home-header">
          <h1>Trilhas</h1>
          <p>Monte as trilhas de onboarding em módulos e passos e escolha para quais cargos elas valem.</p>
        </div>
        <form className="quick-create" onSubmit={create.onSubmit} noValidate>
          <label htmlFor="new-trail" className="visually-hidden">
            Nova trilha
          </label>
          <input
            id="new-trail"
            placeholder="Nome da nova trilha"
            value={title}
            aria-invalid={createError ? true : undefined}
            aria-describedby={createError ? 'new-trail-error' : undefined}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button type="submit" className="button" disabled={create.pending}>
            <PlusIcon />
            Criar trilha
          </button>
          {createError ? (
            <span id="new-trail-error" className="quick-create-error" role="alert">
              {createError}
            </span>
          ) : null}
        </form>
      </header>

      <FormAlert message={trails.error ?? action.error} />

      {trails.loading && !trails.data ? (
        <Loading label="Carregando trilhas…">
          <Bone w={320} h={44} r={12} />
          <RowBones rows={5} icon={44} />
        </Loading>
      ) : all.length ? (
        <>
          <div className="segmented" role="group" aria-label="Filtrar trilhas">
            {filters.map((option) => (
              <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
                {option.label}
                <span className="segmented-count">{count(option.value)}</span>
              </button>
            ))}
          </div>
          {visible.length ? (
            <ul className="trail-table">
              {visible.map((trail) => (
                <li key={trail.id} className="trail-row">
                  <span className={`trail-row-icon is-${trail.status}`} aria-hidden="true">
                    <LayersIcon />
                  </span>
                  <div className="trail-row-info">
                    <h2>
                      <Link to={`/trilhas/${trail.id}`}>{trail.title}</Link>
                    </h2>
                    <p>{trail.description || 'Sem descrição'}</p>
                  </div>
                  <div className="trail-row-meta">
                    <span className={`status-chip is-${trail.status}`}>{trailStatusLabels[trail.status]}</span>
                    <span>
                      {plural(trail.moduleCount, 'módulo', 'módulos')} · {plural(trail.stepCount, 'passo', 'passos')}
                    </span>
                  </div>
                  <div className="trail-row-roles">
                    {trail.jobRoleIds.length ? (
                      <>
                        <span className="visually-hidden">Cargos:</span>
                        {trail.jobRoleIds.map((id) => (
                          <span key={id} className="role-tag">
                            {jobRoleName(id) ?? '…'}
                          </span>
                        ))}
                      </>
                    ) : (
                      <span className="trail-row-warning">Nenhum cargo atribuído</span>
                    )}
                  </div>
                  <span className="trail-row-date">Editada {relativeDate(trail.updatedAt).toLowerCase()}</span>
                  <div className="trail-row-actions">
                    <Link className="button button-secondary button-sm" to={`/trilhas/${trail.id}`}>
                      <PencilIcon />
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="icon-action"
                      aria-label="Duplicar"
                      onClick={() => duplicate(trail)}
                      disabled={action.pending}
                    >
                      <CopyIcon />
                    </button>
                    <ConfirmButton
                      icon
                      label="Excluir"
                      confirmLabel="Excluir trilha"
                      title={`Excluir a trilha "${trail.title}"?`}
                      description="Os módulos, os passos e o progresso de quem já começou essa trilha serão apagados."
                      disabled={action.pending}
                      onConfirm={() => remove(trail)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="my-trails-none">Nenhuma trilha nesta situação.</p>
          )}
        </>
      ) : trails.data ? (
        <div className="my-trails-empty">
          <div className="my-trails-empty-art" aria-hidden="true">
            <span />
            <span />
            <span />
            <LayersIcon />
          </div>
          <h2>Nenhuma trilha ainda</h2>
          <p>Dê um nome no campo acima e clique em "Criar trilha" para começar a montar o onboarding.</p>
        </div>
      ) : null}
    </section>
  );
}
