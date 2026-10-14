import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { jobRolesApi } from '../../api/team';
import { moveItem, trailStatusLabels, trailsApi, type TrailTree } from '../../api/trails';
import { EmptyState } from '../../components/EmptyState';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { TextAreaField } from '../../components/TextAreaField';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { useSubmit } from '../../components/useSubmit';
import { ModuleCard } from './ModuleCard';

export function TrailEditorPage() {
  const { id = '' } = useParams();
  const loadTrail = useCallback(() => trailsApi.get(id), [id]);
  const trail = useResource(loadTrail);
  const jobRoles = useResource(jobRolesApi.list);
  const action = useAction();
  const [draft, setDraft] = useState<{ title: string; description: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');

  const run = (task: () => Promise<unknown>) =>
    action.run(async () => {
      await task();
      trail.setData(await trailsApi.get(id));
    });

  const saveDetails = useSubmit(async () => {
    if (!draft) return;
    const updated = await trailsApi.update(id, draft);
    trail.setData(updated);
    setDraft(null);
    setSaved(true);
  });

  const addModule = useSubmit(async () => {
    await trailsApi.addModule(id, moduleTitle);
    setModuleTitle('');
    trail.setData(await trailsApi.get(id));
  });

  if (trail.loading && !trail.data) return <p className="page-loading">Carregando trilha…</p>;
  if (!trail.data) {
    return (
      <section className="page">
        <FormAlert message={trail.error} />
        <Link to="/trilhas">Voltar para as trilhas</Link>
      </section>
    );
  }

  const current: TrailTree = trail.data;
  const published = current.status === 'published';
  const details = draft ?? { title: current.title, description: current.description };
  const setDetails = (next: { title: string; description: string }) => setDraft(next);
  const dirty = details.title !== current.title || details.description !== current.description;

  async function togglePublish() {
    setWarnings([]);
    await run(async () => {
      if (published) {
        await trailsApi.unpublish(id);
      } else {
        const result = await trailsApi.publish(id);
        setWarnings(result.warnings);
      }
    });
  }

  async function toggleJobRole(jobRoleId: string, checked: boolean) {
    const next = checked
      ? [...current.jobRoleIds, jobRoleId]
      : current.jobRoleIds.filter((existing) => existing !== jobRoleId);
    trail.setData({ ...current, jobRoleIds: next });
    const ok = await run(() => trailsApi.setJobRoles(id, next));
    if (!ok) trail.setData(current);
    if (ok && next.length) setWarnings([]);
  }

  function moveModule(index: number, offset: -1 | 1) {
    const ids = moveItem(
      current.modules.map((module) => module.id),
      index,
      offset,
    );
    void run(() => trailsApi.reorderModules(id, ids));
  }

  return (
    <section className="page">
      <Link to="/trilhas" className="back-link">
        ← Trilhas
      </Link>
      <header className="page-header editor-header">
        <div>
          <span className={`badge status-${current.status}`}>{trailStatusLabels[current.status]}</span>
          <h1>{current.title}</h1>
        </div>
        <button
          type="button"
          className={published ? 'button button-secondary' : 'button'}
          onClick={togglePublish}
          disabled={action.pending}
        >
          {published ? 'Voltar para rascunho' : 'Publicar trilha'}
        </button>
      </header>

      <div className="stack">
        <FormAlert message={action.error} />
        {warnings.map((warning) => (
          <div key={warning} className="form-warning" role="status">
            {warning}
          </div>
        ))}

        <form className="card" onSubmit={saveDetails.onSubmit} noValidate>
          <h2>Informações</h2>
          <FormAlert message={saveDetails.formError} />
          <Field
            label="Título"
            value={details.title}
            onChange={(event) => {
              setDetails({ ...details, title: event.target.value });
              setSaved(false);
            }}
            error={saveDetails.fieldError('title')}
          />
          <TextAreaField
            label="Descrição"
            rows={3}
            placeholder="O que a pessoa vai aprender nesta trilha?"
            value={details.description}
            onChange={(event) => {
              setDetails({ ...details, description: event.target.value });
              setSaved(false);
            }}
            error={saveDetails.fieldError('description')}
          />
          <div className="form-actions">
            <button type="submit" className="button" disabled={!dirty || saveDetails.pending}>
              Salvar informações
            </button>
            {saved && !dirty ? <span className="saved-note">Salvo</span> : null}
          </div>
        </form>

        <section className="card" aria-labelledby="cargos-title">
          <h2 id="cargos-title">Cargos</h2>
          <p className="muted small card-intro">Colaboradores desses cargos vão ver a trilha quando ela estiver publicada.</p>
          {jobRoles.data?.length ? (
            <div className="chip-list">
              {jobRoles.data.map((jobRole) => {
                const checked = current.jobRoleIds.includes(jobRole.id);
                return (
                  <label key={jobRole.id} className={checked ? 'chip checked' : 'chip'}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={action.pending}
                      onChange={(event) => toggleJobRole(jobRole.id, event.target.checked)}
                    />
                    {jobRole.name}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="muted small">
              Nenhum cargo cadastrado. <Link to="/equipe/cargos">Criar cargos</Link>
            </p>
          )}
        </section>

        <section aria-labelledby="modulos-title" className="stack">
          <h2 id="modulos-title">Módulos e passos</h2>
          {current.modules.length ? (
            current.modules.map((module, index) => (
              <ModuleCard
                key={module.id}
                module={module}
                index={index}
                total={current.modules.length}
                busy={action.pending}
                run={run}
                onMove={(offset) => moveModule(index, offset)}
              />
            ))
          ) : (
            <EmptyState title="Nenhum módulo ainda">
              Divida a trilha em módulos (ex.: "Primeiros passos", "Ferramentas") e adicione os passos dentro de cada um.
            </EmptyState>
          )}

          <form className="card inline-form" onSubmit={addModule.onSubmit} noValidate>
            <Field
              label="Novo módulo"
              placeholder="Ex.: Primeiros passos"
              value={moduleTitle}
              onChange={(event) => setModuleTitle(event.target.value)}
              error={addModule.fieldError('title') ?? addModule.formError ?? undefined}
            />
            <button type="submit" className="button" disabled={addModule.pending}>
              Adicionar módulo
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
