import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { jobRolesApi } from '../../api/team';
import { moveItem, trailStatusLabels, trailsApi, type TrailTree } from '../../api/trails';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { TextAreaField } from '../../components/TextAreaField';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { useSubmit } from '../../components/useSubmit';
import { AlertIcon, ArrowLeftIcon, CheckIcon, FlowIcon, ListIcon, PlusIcon } from '../../layout/icons';
import { FlowView } from './flow/FlowView';
import { ModuleCard } from './ModuleCard';
import { Bone, HeaderBones, Loading } from '../../components/Skeleton';
import { LiveTrailNotice } from './LiveTrailNotice';

type EditorView = 'list' | 'flow';

const viewKey = (trailId: string) => `onboardhub.editorView.${trailId}`;

function readView(trailId: string): EditorView {
  try {
    return localStorage.getItem(viewKey(trailId)) === 'flow' ? 'flow' : 'list';
  } catch {
    return 'list';
  }
}

function saveView(trailId: string, view: EditorView) {
  try {
    localStorage.setItem(viewKey(trailId), view);
  } catch {
    return;
  }
}

function EditorLoading() {
  return (
    <Loading label="Carregando trilha…" className="editor">
      <Bone w={70} h={12} />
      <HeaderBones action />
      <div className="editor-grid">
        <div className="module-stack">
          {[4, 3].map((count, moduleIndex) => (
            <div key={moduleIndex} className="sk-card sk-module">
              <div className="sk-person sk-module-head">
                <Bone w={34} h={34} r={10} />
                <div className="sk-row-text">
                  <Bone w={90} h={10} />
                  <Bone w="40%" h={15} />
                </div>
              </div>
              {Array.from({ length: count }, (_, item) => (
                <div key={item} className="sk-person sk-step">
                  <Bone w={36} h={36} r={10} />
                  <div className="sk-row-text">
                    <Bone w={`${55 - item * 7}%`} h={13} />
                    <Bone w="35%" h={10} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="editor-side">
          {[150, 190, 130].map((height, index) => (
            <div key={index} className="sk-card sk-pad" style={{ minHeight: height }}>
              <Bone w={110} h={15} />
              <Bone h={40} r={10} />
              <Bone w="70%" h={11} />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

function summaryOf(modules: number, steps: number, roleNames: string[]) {
  const moduleText = modules === 1 ? '1 módulo' : `${modules} módulos`;
  const stepText = steps === 1 ? '1 passo' : `${steps} passos`;
  const roleText = roleNames.length ? `para ${roleNames.join(', ')}` : 'sem cargo definido';
  return `${moduleText} · ${stepText} · ${roleText}`;
}

const withRole = (ids: string[], id: string) => [...ids, id];

const withoutRole = (ids: string[], id: string) => ids.filter((existing) => existing !== id);

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
  const [view, setView] = useState<EditorView>(() => readView(id));

  function changeView(next: EditorView) {
    setView(next);
    saveView(id, next);
  }

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

  if (trail.loading && !trail.data) {
    return <EditorLoading />;
  }
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

  async function toggleJobRole(jobRoleId: string) {
    const ids = current.jobRoleIds;
    const next = ids.includes(jobRoleId) ? withoutRole(ids, jobRoleId) : withRole(ids, jobRoleId);
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

  const stepTotal = current.modules.reduce((sum, module) => sum + module.steps.length, 0);
  const roleNames = current.jobRoleIds
    .map((roleId) => jobRoles.data?.find((jobRole) => jobRole.id === roleId)?.name)
    .filter(Boolean) as string[];
  const checklist = [
    { done: stepTotal > 0, label: 'Tem pelo menos um passo' },
    { done: current.jobRoleIds.length > 0, label: 'Tem pelo menos um cargo' },
    { done: Boolean(current.description.trim()), label: 'Tem uma descrição' },
  ];

  return (
    <section className="editor">
      <Link to="/trilhas" className="player-back">
        <ArrowLeftIcon />
        Trilhas
      </Link>
      <header className="editor-head">
        <div className="editor-head-text">
          <span className={`status-chip is-${current.status}`}>{trailStatusLabels[current.status]}</span>
          <h1>{current.title}</h1>
          <p>{summaryOf(current.modules.length, stepTotal, roleNames)}</p>
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

      <FormAlert message={action.error} />
      {published ? <LiveTrailNotice key={current.jobRoleIds.join()} trailId={id} /> : null}
      {warnings.map((warning) => (
        <output key={warning} className="form-warning">
          <AlertIcon />
          {warning}
        </output>
      ))}

      <div className={view === 'flow' ? 'editor-grid is-flow' : 'editor-grid'}>
        <section aria-labelledby="modulos-title" className="editor-content">
          <div className="editor-content-head">
            <h2 id="modulos-title">Módulos e passos</h2>
            <fieldset className="segmented" aria-label="Modo de edição">
              <button type="button" aria-pressed={view === 'list'} onClick={() => changeView('list')}>
                <ListIcon />
                Lista
              </button>
              <button type="button" aria-pressed={view === 'flow'} onClick={() => changeView('flow')}>
                <FlowIcon />
                Fluxo
              </button>
            </fieldset>
          </div>
          {view === 'flow' ? (
            <FlowView trail={current} busy={action.pending} run={run} />
          ) : (
            <div className="module-stack">
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
                <div className="editor-empty">
                  <strong>Nenhum módulo ainda</strong>
                  <p>Divida a trilha em módulos (ex.: "Primeiros passos", "Ferramentas") e adicione os passos dentro de cada um.</p>
                </div>
              )}

              <form className="add-module" onSubmit={addModule.onSubmit} noValidate>
                <span className="add-module-icon" aria-hidden="true">
                  <PlusIcon />
                </span>
                <Field
                  label="Novo módulo"
                  placeholder="Nome do módulo, ex.: Primeiros passos"
                  value={moduleTitle}
                  onChange={(event) => setModuleTitle(event.target.value)}
                  error={addModule.fieldError('title') ?? addModule.formError ?? undefined}
                />
                <button type="submit" className="button" disabled={addModule.pending}>
                  Adicionar módulo
                </button>
              </form>
            </div>
          )}
        </section>

        <aside className="editor-side" aria-label="Configurações da trilha">
          <form className="side-card" onSubmit={saveDetails.onSubmit} noValidate>
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
              rows={4}
              placeholder="O que a pessoa vai aprender nesta trilha?"
              value={details.description}
              onChange={(event) => {
                setDetails({ ...details, description: event.target.value });
                setSaved(false);
              }}
              error={saveDetails.fieldError('description')}
            />
            <div className="form-actions">
              {saved && !dirty ? (
                <span className="saved-note">
                  <CheckIcon />
                  Salvo
                </span>
              ) : null}
              <button type="submit" className="button button-sm" disabled={!dirty || saveDetails.pending}>
                Salvar informações
              </button>
            </div>
          </form>

          <section className="side-card" aria-labelledby="cargos-title">
            <h2 id="cargos-title">Cargos</h2>
            <p className="side-card-intro">Quem tem esses cargos vê a trilha quando ela estiver publicada.</p>
            {jobRoles.data?.length ? (
              <div className="role-options">
                {jobRoles.data.map((jobRole) => {
                  const checked = current.jobRoleIds.includes(jobRole.id);
                  return (
                    <label key={jobRole.id} className={checked ? 'role-option is-checked' : 'role-option'}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={action.pending}
                        onChange={() => toggleJobRole(jobRole.id)}
                      />
                      <span className="role-option-box" aria-hidden="true">
                        <CheckIcon />
                      </span>
                      {jobRole.name}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="side-card-intro">
                Nenhum cargo cadastrado. <Link to="/equipe/cargos">Criar cargos</Link>
              </p>
            )}
          </section>

          <section className="side-card" aria-labelledby="publicacao-title">
            <h2 id="publicacao-title">Publicação</h2>
            <p className="side-card-intro">
              {published ? 'A trilha está no ar para os cargos marcados.' : 'Rascunho: ninguém vê a trilha ainda.'}
            </p>
            <ul className="checklist">
              {checklist.map((item) => (
                <li key={item.label} className={item.done ? 'is-done' : undefined}>
                  <span className="checklist-mark" aria-hidden="true">
                    {item.done ? <CheckIcon /> : null}
                  </span>
                  {item.label}
                  <span className="visually-hidden">{item.done ? ' (feito)' : ' (pendente)'}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
