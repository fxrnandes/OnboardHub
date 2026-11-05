import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { learningApi, type LearnerStep, type LearnerTrail } from '../../api/learning';
import { stepKindLabels } from '../../api/trails';
import { FormAlert } from '../../components/FormAlert';
import { ProgressBar } from '../../components/ProgressBar';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, TrophyIcon } from '../../layout/icons';
import { KindIcon } from '../trails/stepKinds';
import { StepContent } from './StepContent';
import { Bone, Loading } from '../../components/Skeleton';

function PlayerLoading() {
  return (
    <Loading label="Abrindo a trilha…" className="player">
      <div className="sk-card sk-pad sk-outline">
        <Bone w={110} h={11} />
        <Bone w="80%" h={20} r={6} />
        <Bone h={8} r={4} />
        {[0, 1].map((group) => (
          <div key={group} className="sk-outline-group">
            <Bone w={70} h={10} />
            <Bone w="60%" h={13} />
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="sk-outline-item">
                <Bone w={20} h={20} r={10} />
                <Bone w={`${70 - item * 8}%`} h={12} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="sk-player-main">
        <Bone w={240} h={12} />
        <Bone w="55%" h={34} r={8} />
        <Bone h={14} />
        <Bone w="92%" h={14} />
        <Bone w="74%" h={14} />
        <Bone h={220} r={16} />
      </div>
    </Loading>
  );
}

function withStepProgress(
  state: LearnerTrail,
  stepId: string,
  completedAt: string | null,
  progress: LearnerTrail['progress'],
): LearnerTrail {
  return {
    ...state,
    progress,
    trail: {
      ...state.trail,
      modules: state.trail.modules.map((module) => ({
        ...module,
        steps: module.steps.map((step) => (step.id === stepId ? { ...step, completedAt } : step)),
      })),
    },
  };
}

function OutlineStep({ step, current, onSelect }: Readonly<{ step: LearnerStep; current: boolean; onSelect: () => void }>) {
  return (
    <button
      type="button"
      className={current ? 'outline-step current' : 'outline-step'}
      aria-current={current ? 'step' : undefined}
      onClick={onSelect}
    >
      <span className={step.completedAt ? 'check done' : 'check'} aria-hidden="true">
        {step.completedAt ? <CheckIcon /> : null}
      </span>
      <span className="outline-step-title">
        {step.title}
        <span className="sr-only">{step.completedAt ? ' (concluído)' : ''}</span>
      </span>
      <span className="outline-step-kind" aria-hidden="true">
        <KindIcon kind={step.kind} />
      </span>
    </button>
  );
}

function FinishBanner({ title }: Readonly<{ title: string }>) {
  return (
    <output className="finish-banner">
      <span className="finish-banner-icon" aria-hidden="true">
        <TrophyIcon />
      </span>
      <div>
        <strong>Trilha concluída!</strong>
        <span>Você completou todos os passos de "{title}".</span>
      </div>
      <Link to="/minhas-trilhas" className="button button-on-brand">
        Ver minhas trilhas
      </Link>
    </output>
  );
}

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

  if (data.loading && !data.data) {
    return <PlayerLoading />;
  }
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
    data.setData((state) => (state ? withStepProgress(state, stepId, completedAt, nextProgress) : state));
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

  const currentModule = trail.modules.find((module) => module.steps.some((step) => step.id === currentId));
  const currentModuleIndex = currentModule ? trail.modules.indexOf(currentModule) : -1;

  return (
    <section className="player">
      <aside className="player-outline" aria-label="Conteúdo da trilha">
        <Link to="/minhas-trilhas" className="player-back">
          <ArrowLeftIcon />
          Minhas trilhas
        </Link>
        <h1 className="player-title">{trail.title}</h1>
        <div className="player-progress">
          <ProgressBar percent={progress.percent} label="Progresso da trilha" />
          <p>
            {progress.completedSteps} de {progress.totalSteps} passos · {progress.percent}%
          </p>
        </div>
        <nav className="player-nav">
          {trail.modules.map((module, moduleIndex) => (
            <div key={module.id} className="outline-module">
              <span className="outline-module-title">
                <span>Módulo {moduleIndex + 1}</span>
                {module.title}
              </span>
              <ol>
                {module.steps.map((step) => (
                  <li key={step.id}>
                    <OutlineStep step={step} current={step.id === currentId} onSelect={() => goTo(step.id)} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </nav>
      </aside>

      <article className="player-main">
        {justFinished || (progress.completed && !current) ? (
          <FinishBanner title={trail.title} />
        ) : null}

        <FormAlert message={action.error} />

        {current ? (
          <>
            <header className="step-header">
              <span className={`step-kind kind-${current.kind}`}>
                <KindIcon kind={current.kind} />
                {stepKindLabels[current.kind]}
              </span>
              {currentModule ? (
                <span className="step-module">
                  Módulo {currentModuleIndex + 1} · {currentModule.title}
                </span>
              ) : null}
              <span className="step-count">
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
                <ArrowLeftIcon />
                Anterior
              </button>
              <div className="player-footer-main">
                {current.completedAt ? (
                  <>
                    <span className="done-note">
                      <CheckIcon />
                      Concluído
                    </span>
                    <button type="button" className="button-ghost" onClick={undo} disabled={action.pending}>
                      Desmarcar
                    </button>
                    {next ? (
                      <button type="button" className="button" onClick={() => goTo(next.id)}>
                        Próximo
                        <ArrowRightIcon />
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button type="button" className="button" onClick={completeAndAdvance} disabled={action.pending}>
                    {next ? 'Concluir e avançar' : 'Concluir trilha'}
                    {next ? <ArrowRightIcon /> : <CheckIcon />}
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
