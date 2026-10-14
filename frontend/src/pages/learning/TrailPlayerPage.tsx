import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { learningApi, type LearnerTrail } from '../../api/learning';
import { stepKindLabels } from '../../api/trails';
import { FormAlert } from '../../components/FormAlert';
import { ProgressBar } from '../../components/ProgressBar';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { StepContent } from './StepContent';

export function TrailPlayerPage() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const load = useCallback(() => learningApi.open(id), [id]);
  const data = useResource(load);
  const action = useAction();
  const [justFinished, setJustFinished] = useState(false);

  const steps = data.data?.trail.modules.flatMap((module) => module.steps) ?? [];
  const requested = searchParams.get('passo');
  const currentId = steps.some((step) => step.id === requested) ? requested : data.data?.resumeStepId ?? steps[0]?.id;
  const index = steps.findIndex((step) => step.id === currentId);
  const current = steps[index];

  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [currentId]);

  if (data.loading && !data.data) return <p className="page-loading">Abrindo a trilha…</p>;
  if (!data.data) {
    return (
      <section className="page">
        <FormAlert message={data.error} />
        <Link to="/minhas-trilhas">Voltar para minhas trilhas</Link>
      </section>
    );
  }

  const { trail, progress } = data.data;
  const goTo = (stepId: string) => setSearchParams({ passo: stepId });
  const previous = steps[index - 1];
  const next = steps[index + 1];

  function applyProgress(stepId: string, completedAt: string | null, nextProgress: LearnerTrail['progress']) {
    data.setData((state) =>
      state
        ? {
            ...state,
            progress: nextProgress,
            trail: {
              ...state.trail,
              modules: state.trail.modules.map((module) => ({
                ...module,
                steps: module.steps.map((step) => (step.id === stepId ? { ...step, completedAt } : step)),
              })),
            },
          }
        : state,
    );
  }

  async function completeAndAdvance() {
    if (!current) return;
    const stepId = current.id;
    await action.run(async () => {
      const nextProgress = await learningApi.complete(stepId);
      applyProgress(stepId, new Date().toISOString(), nextProgress);
      if (nextProgress.completed) setJustFinished(true);
      else if (next) goTo(next.id);
    });
  }

  async function undo() {
    if (!current) return;
    const stepId = current.id;
    await action.run(async () => {
      applyProgress(stepId, null, await learningApi.uncomplete(stepId));
      setJustFinished(false);
    });
  }

  return (
    <section className="player">
      <aside className="player-outline" aria-label="Conteúdo da trilha">
        <Link to="/minhas-trilhas" className="back-link">
          ← Minhas trilhas
        </Link>
        <h1 className="player-title">{trail.title}</h1>
        <ProgressBar percent={progress.percent} label="Progresso da trilha" />
        <p className="muted small">
          {progress.completedSteps} de {progress.totalSteps} passos · {progress.percent}%
        </p>
        <nav>
          {trail.modules.map((module, moduleIndex) => (
            <div key={module.id} className="outline-module">
              <span className="outline-module-title">
                {moduleIndex + 1}. {module.title}
              </span>
              <ol>
                {module.steps.map((step) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      className={step.id === currentId ? 'outline-step current' : 'outline-step'}
                      aria-current={step.id === currentId ? 'step' : undefined}
                      onClick={() => goTo(step.id)}
                    >
                      <span className={step.completedAt ? 'check done' : 'check'} aria-hidden="true">
                        {step.completedAt ? '✓' : ''}
                      </span>
                      <span>
                        {step.title}
                        <span className="sr-only">{step.completedAt ? ' (concluído)' : ''}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </nav>
      </aside>

      <article className="player-main">
        {justFinished || (progress.completed && !current) ? (
          <div className="finish-banner" role="status">
            <strong>Trilha concluída!</strong>
            <span>Você completou todos os passos de "{trail.title}".</span>
            <Link to="/minhas-trilhas">Ver minhas trilhas</Link>
          </div>
        ) : null}

        <FormAlert message={action.error} />

        {current ? (
          <>
            <header className="step-header">
              <span className={`step-kind kind-${current.kind}`}>{stepKindLabels[current.kind]}</span>
              <span className="muted small">
                Passo {index + 1} de {steps.length}
              </span>
            </header>
            <h2 className="step-heading">{current.title}</h2>
            <StepContent step={current} />

            <footer className="player-footer">
              <button
                type="button"
                className="button button-secondary"
                disabled={!previous}
                onClick={() => previous && goTo(previous.id)}
              >
                ← Anterior
              </button>
              <div className="player-footer-main">
                {current.completedAt ? (
                  <>
                    <span className="done-note">✓ Concluído</span>
                    <button type="button" className="button-ghost" onClick={undo} disabled={action.pending}>
                      Desmarcar
                    </button>
                    {next ? (
                      <button type="button" className="button" onClick={() => goTo(next.id)}>
                        Próximo →
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button type="button" className="button" onClick={completeAndAdvance} disabled={action.pending}>
                    {next ? 'Concluir e avançar →' : 'Concluir trilha'}
                  </button>
                )}
              </div>
            </footer>
          </>
        ) : (
          <p className="muted">Esta trilha ainda não tem passos.</p>
        )}
      </article>
    </section>
  );
}
