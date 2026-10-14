import { useState } from 'react';
import { moveItem, stepKindLabels, trailsApi, type Step, type StepInput, type TrailModule } from '../../api/trails';
import { ConfirmButton } from '../../components/ConfirmButton';
import { StepForm } from './StepForm';

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
            <button type="submit" className="button" disabled={busy}>
              Salvar
            </button>
            <button type="button" className="button-ghost" onClick={() => setRenaming(null)}>
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <h3>{module.title}</h3>
            <div className="cell-actions">
              <button
                type="button"
                className="button-ghost icon"
                aria-label={`Subir módulo ${module.title}`}
                disabled={busy || index === 0}
                onClick={() => onMove(-1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="button-ghost icon"
                aria-label={`Descer módulo ${module.title}`}
                disabled={busy || index === total - 1}
                onClick={() => onMove(1)}
              >
                ↓
              </button>
              <button type="button" className="button-ghost" onClick={() => setRenaming(module.title)}>
                Renomear
              </button>
              <ConfirmButton
                label="Excluir"
                confirmLabel="Excluir módulo"
                disabled={busy}
                onConfirm={() => void run(() => trailsApi.removeModule(module.id))}
              />
            </div>
          </>
        )}
      </header>

      {module.steps.length ? (
        <ol className="step-list">
          {module.steps.map((step, stepIndex) =>
            editingStep === step.id ? (
              <li key={step.id} className="step-item editing">
                <StepForm step={step} onSave={(input) => saveStep(input, step)} onCancel={() => setEditingStep(null)} />
              </li>
            ) : (
              <li key={step.id} className="step-item">
                <span className={`step-kind kind-${step.kind}`}>{stepKindLabels[step.kind]}</span>
                <span className="step-title">{step.title}</span>
                <div className="cell-actions">
                  <button
                    type="button"
                    className="button-ghost icon"
                    aria-label={`Subir passo ${step.title}`}
                    disabled={busy || stepIndex === 0}
                    onClick={() => moveStep(stepIndex, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="button-ghost icon"
                    aria-label={`Descer passo ${step.title}`}
                    disabled={busy || stepIndex === module.steps.length - 1}
                    onClick={() => moveStep(stepIndex, 1)}
                  >
                    ↓
                  </button>
                  <button type="button" className="button-ghost" onClick={() => setEditingStep(step.id)}>
                    Editar
                  </button>
                  <ConfirmButton
                    label="Excluir"
                    confirmLabel="Excluir passo"
                    disabled={busy}
                    onConfirm={() => void run(() => trailsApi.removeStep(step.id))}
                  />
                </div>
              </li>
            ),
          )}
        </ol>
      ) : (
        <p className="muted small module-empty">Nenhum passo neste módulo.</p>
      )}

      {editingStep === 'new' ? (
        <div className="step-item editing">
          <StepForm onSave={(input) => saveStep(input)} onCancel={() => setEditingStep(null)} />
        </div>
      ) : (
        <button type="button" className="button-ghost add-step" onClick={() => setEditingStep('new')}>
          + Adicionar passo
        </button>
      )}
    </section>
  );
}
