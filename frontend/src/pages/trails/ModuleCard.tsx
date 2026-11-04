import { useState } from 'react';
import { moveItem, stepKindLabels, trailsApi, type Step, type StepInput, type TrailModule } from '../../api/trails';
import { ConfirmButton } from '../../components/ConfirmButton';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon } from '../../layout/icons';
import { StepForm } from './StepForm';
import { KindIcon, stepDetail } from './stepKinds';

interface ModuleCardProps {
  module: TrailModule;
  index: number;
  total: number;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
  onMove: (offset: -1 | 1) => void;
}

export function ModuleCard({ module, index, total, busy, run, onMove }: ModuleCardProps) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | 'new' | null>(null);

  async function rename() {
    if (renaming === null) return;
    if (await run(() => trailsApi.renameModule(module.id, renaming))) setRenaming(null);
  }

  async function saveStep(input: StepInput, step?: Step) {
    await (step ? trailsApi.updateStep(step.id, input) : trailsApi.addStep(module.id, input));
    setEditingStep(null);
    await run(async () => undefined);
  }

  function moveStep(stepIndex: number, offset: -1 | 1) {
    const ids = moveItem(
      module.steps.map((step) => step.id),
      stepIndex,
      offset,
    );
    void run(() => trailsApi.reorderSteps(module.id, ids));
  }

  const stepCount = module.steps.length;

  return (
    <section className="module-card" aria-label={`Módulo ${index + 1}: ${module.title}`}>
      <header className="module-head">
        <span className="module-index">{index + 1}</span>
        {renaming !== null ? (
          <form
            className="inline-edit"
            onSubmit={(event) => {
              event.preventDefault();
              void rename();
            }}
          >
            <input aria-label="Nome do módulo" value={renaming} onChange={(event) => setRenaming(event.target.value)} autoFocus />
            <button type="button" className="button button-secondary button-sm" onClick={() => setRenaming(null)}>
              Cancelar
            </button>
            <button type="submit" className="button button-sm" disabled={busy}>
              Salvar
            </button>
          </form>
        ) : (
          <>
            <div className="module-title">
              <span>
                Módulo {index + 1} · {stepCount === 1 ? '1 passo' : `${stepCount} passos`}
              </span>
              <h3>{module.title}</h3>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="icon-action"
                aria-label={`Subir módulo ${module.title}`}
                disabled={busy || index === 0}
                onClick={() => onMove(-1)}
              >
                <ArrowUpIcon />
              </button>
              <button
                type="button"
                className="icon-action"
                aria-label={`Descer módulo ${module.title}`}
                disabled={busy || index === total - 1}
                onClick={() => onMove(1)}
              >
                <ArrowDownIcon />
              </button>
              <button type="button" className="icon-action" aria-label="Renomear" onClick={() => setRenaming(module.title)}>
                <PencilIcon />
              </button>
              <ConfirmButton
                icon
                label="Excluir"
                confirmLabel="Excluir módulo"
                title={`Excluir o módulo "${module.title}"?`}
                description={
                  stepCount === 0
                    ? 'O módulo está vazio, nenhum passo será apagado.'
                    : stepCount === 1
                      ? 'O passo dentro dele também será apagado, junto com o progresso das pessoas.'
                      : `Os ${stepCount} passos dentro dele também serão apagados, junto com o progresso das pessoas.`
                }
                disabled={busy}
                onConfirm={() => void run(() => trailsApi.removeModule(module.id))}
              />
            </div>
          </>
        )}
      </header>

      {stepCount ? (
        <ol className="step-list">
          {module.steps.map((step, stepIndex) =>
            editingStep === step.id ? (
              <li key={step.id} className="step-item editing">
                <StepForm step={step} onSave={(input) => saveStep(input, step)} onCancel={() => setEditingStep(null)} />
              </li>
            ) : (
              <li key={step.id} className="step-item">
                <span className="step-number">
                  {index + 1}.{stepIndex + 1}
                </span>
                <span className={`step-kind-icon kind-${step.kind}`} aria-hidden="true">
                  <KindIcon kind={step.kind} />
                </span>
                <div className="step-info">
                  <span className="step-title">{step.title}</span>
                  <span className="step-detail">{stepDetail(step)}</span>
                </div>
                <span className="step-kind-label">{stepKindLabels[step.kind]}</span>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-action"
                    aria-label={`Subir passo ${step.title}`}
                    disabled={busy || stepIndex === 0}
                    onClick={() => moveStep(stepIndex, -1)}
                  >
                    <ArrowUpIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-action"
                    aria-label={`Descer passo ${step.title}`}
                    disabled={busy || stepIndex === stepCount - 1}
                    onClick={() => moveStep(stepIndex, 1)}
                  >
                    <ArrowDownIcon />
                  </button>
                  <button type="button" className="icon-action" aria-label="Editar" onClick={() => setEditingStep(step.id)}>
                    <PencilIcon />
                  </button>
                  <ConfirmButton
                    icon
                    label="Excluir"
                    confirmLabel="Excluir passo"
                    title={`Excluir o passo "${step.title}"?`}
                    description="O progresso de quem já concluiu este passo também será apagado."
                    disabled={busy}
                    onConfirm={() => void run(() => trailsApi.removeStep(step.id))}
                  />
                </div>
              </li>
            ),
          )}
        </ol>
      ) : (
        <p className="module-empty">Nenhum passo neste módulo ainda.</p>
      )}

      {editingStep === 'new' ? (
        <div className="step-item editing is-new">
          <StepForm onSave={(input) => saveStep(input)} onCancel={() => setEditingStep(null)} />
        </div>
      ) : (
        <button type="button" className="add-step" onClick={() => setEditingStep('new')}>
          <PlusIcon />
          Novo passo
        </button>
      )}
    </section>
  );
}
