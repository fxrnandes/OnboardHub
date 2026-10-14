import { Background, Controls, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo, useState } from 'react';
import { moveItem, trailsApi, type StepInput, type TrailTree } from '../../../api/trails';
import { ConfirmButton } from '../../../components/ConfirmButton';
import { Field } from '../../../components/Field';
import { useSubmit } from '../../../components/useSubmit';
import { StepForm } from '../StepForm';
import { buildFlow } from './layout';
import { FlowContext, nodeTypes, type Selection } from './nodes';

interface FlowViewProps {
  trail: TrailTree;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}

export function FlowView({ trail, busy, run }: FlowViewProps) {
  const [selection, setSelection] = useState<Selection>(null);
  const { nodes, edges } = useMemo(() => buildFlow(trail), [trail]);
  const context = useMemo(() => ({ selection, select: setSelection }), [selection]);

  return (
    <FlowContext.Provider value={context}>
      <div className="flow-shell">
        <div className="flow-canvas" data-testid="flow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.3}
            onPaneClick={() => setSelection(null)}
          >
            <Background gap={20} size={1.5} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        {selection ? (
          <aside className="flow-panel" aria-label="Edição">
            <SelectionPanel trail={trail} selection={selection} busy={busy} run={run} close={() => setSelection(null)} />
          </aside>
        ) : (
          <aside className="flow-panel flow-panel-hint">
            <strong>Como usar</strong>
            <p>Clique em um módulo ou passo para editar. Use “+ Passo” e “+ Módulo” para montar a trilha.</p>
            <p>Arraste o quadro para navegar e use a roda do mouse para dar zoom.</p>
          </aside>
        )}
      </div>
    </FlowContext.Provider>
  );
}

interface PanelProps {
  trail: TrailTree;
  selection: NonNullable<Selection>;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
  close: () => void;
}

function SelectionPanel({ trail, selection, busy, run, close }: PanelProps) {
  if (selection.type === 'newModule') return <NewModulePanel trail={trail} run={run} close={close} />;

  if (selection.type === 'module') {
    const index = trail.modules.findIndex((module) => module.id === selection.moduleId);
    const module = trail.modules[index];
    if (!module) return null;
    return <ModulePanel key={module.id} trail={trail} index={index} busy={busy} run={run} close={close} />;
  }

  const module =
    selection.type === 'newStep'
      ? trail.modules.find((item) => item.id === selection.moduleId)
      : trail.modules.find((item) => item.steps.some((step) => step.id === selection.stepId));
  if (!module) return null;

  const stepIndex = selection.type === 'step' ? module.steps.findIndex((step) => step.id === selection.stepId) : -1;
  const step = module.steps[stepIndex];

  async function save(input: StepInput) {
    await (step ? trailsApi.updateStep(step.id, input) : trailsApi.addStep(module!.id, input));
    await run(async () => undefined);
    close();
  }

  function move(offset: -1 | 1) {
    const ids = moveItem(
      module!.steps.map((item) => item.id),
      stepIndex,
      offset,
    );
    void run(() => trailsApi.reorderSteps(module!.id, ids));
  }

  return (
    <div className="flow-panel-body">
      <header className="flow-panel-head">
        <span className="muted small">{module.title}</span>
        <h3>{step ? 'Editar passo' : 'Novo passo'}</h3>
      </header>
      {step ? (
        <div className="flow-panel-actions">
          <button type="button" className="button-ghost" disabled={busy || stepIndex === 0} onClick={() => move(-1)}>
            ↑ Subir
          </button>
          <button
            type="button"
            className="button-ghost"
            disabled={busy || stepIndex === module.steps.length - 1}
            onClick={() => move(1)}
          >
            ↓ Descer
          </button>
          <ConfirmButton
            label="Excluir"
            confirmLabel="Excluir passo"
            disabled={busy}
            onConfirm={() => void run(() => trailsApi.removeStep(step.id)).then((ok) => ok && close())}
          />
        </div>
      ) : null}
      <StepForm key={step?.id ?? `new-${module.id}`} step={step} onSave={save} onCancel={close} />
    </div>
  );
}

function ModulePanel({ trail, index, busy, run, close }: { trail: TrailTree; index: number } & Omit<PanelProps, 'selection' | 'trail'>) {
  const module = trail.modules[index]!;
  const [title, setTitle] = useState(module.title);

  const rename = useSubmit(async () => {
    await trailsApi.renameModule(module.id, title);
    await run(async () => undefined);
  });

  function move(offset: -1 | 1) {
    const ids = moveItem(
      trail.modules.map((item) => item.id),
      index,
      offset,
    );
    void run(() => trailsApi.reorderModules(trail.id, ids));
  }

  return (
    <div className="flow-panel-body">
      <header className="flow-panel-head">
        <span className="muted small">Módulo {index + 1}</span>
        <h3>{module.title}</h3>
      </header>
      <form onSubmit={rename.onSubmit} noValidate>
        <Field
          label="Nome do módulo"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={rename.fieldError('title') ?? rename.formError ?? undefined}
        />
        <button type="submit" className="button" disabled={rename.pending || title === module.title}>
          Salvar nome
        </button>
      </form>
      <div className="flow-panel-actions">
        <button type="button" className="button-ghost" disabled={busy || index === 0} onClick={() => move(-1)}>
          ← Antes
        </button>
        <button
          type="button"
          className="button-ghost"
          disabled={busy || index === trail.modules.length - 1}
          onClick={() => move(1)}
        >
          Depois →
        </button>
        <ConfirmButton
          label="Excluir"
          confirmLabel="Excluir módulo"
          disabled={busy}
          onConfirm={() => void run(() => trailsApi.removeModule(module.id)).then((ok) => ok && close())}
        />
      </div>
      <p className="muted small">Excluir o módulo apaga também os passos dele.</p>
    </div>
  );
}

function NewModulePanel({ trail, run, close }: Pick<PanelProps, 'trail' | 'run' | 'close'>) {
  const [title, setTitle] = useState('');
  const create = useSubmit(async () => {
    await trailsApi.addModule(trail.id, title);
    await run(async () => undefined);
    close();
  });

  return (
    <div className="flow-panel-body">
      <header className="flow-panel-head">
        <h3>Novo módulo</h3>
      </header>
      <form onSubmit={create.onSubmit} noValidate>
        <Field
          label="Nome do módulo"
          placeholder="Ex.: Primeiros passos"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={create.fieldError('title') ?? create.formError ?? undefined}
          autoFocus
        />
        <div className="form-actions">
          <button type="submit" className="button" disabled={create.pending}>
            Adicionar módulo
          </button>
          <button type="button" className="button button-secondary" onClick={close}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
