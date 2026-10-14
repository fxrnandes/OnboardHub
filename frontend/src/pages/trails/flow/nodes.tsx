import { Handle, Position, type NodeProps } from '@xyflow/react';
import { createContext, useContext } from 'react';
import { stepKindLabels } from '../../../api/trails';
import type { FlowNode } from './layout';

export type Selection =
  | { type: 'step'; stepId: string }
  | { type: 'newStep'; moduleId: string }
  | { type: 'module'; moduleId: string }
  | { type: 'newModule' }
  | null;

interface FlowActions {
  selection: Selection;
  select: (selection: Selection) => void;
}

export const FlowContext = createContext<FlowActions>({ selection: null, select: () => undefined });

const useFlow = () => useContext(FlowContext);

function StartNode({ data }: NodeProps<FlowNode>) {
  if (data.kind !== 'start') return null;
  return (
    <div className="flow-node flow-start">
      <span className="flow-node-label">Início</span>
      <strong>{data.title}</strong>
      <span className="flow-node-meta">{data.stepCount === 1 ? '1 passo' : `${data.stepCount} passos`}</span>
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
}

function ModuleNode({ data }: NodeProps<FlowNode>) {
  const { selection, select } = useFlow();
  if (data.kind !== 'module') return null;
  const selected = selection?.type === 'module' && selection.moduleId === data.module.id;
  return (
    <button
      type="button"
      className={selected ? 'flow-node flow-module selected' : 'flow-node flow-module'}
      aria-label={`Módulo ${data.index + 1}: ${data.module.title}`}
      onClick={() => select({ type: 'module', moduleId: data.module.id })}
    >
      <Handle type="target" position={Position.Left} id="left" />
      <span className="flow-node-label">Módulo {data.index + 1}</span>
      <strong>{data.module.title}</strong>
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
    </button>
  );
}

function StepNode({ data }: NodeProps<FlowNode>) {
  const { selection, select } = useFlow();
  if (data.kind !== 'step') return null;
  const selected = selection?.type === 'step' && selection.stepId === data.step.id;
  return (
    <button
      type="button"
      className={selected ? 'flow-node flow-step selected' : 'flow-node flow-step'}
      aria-label={`Passo ${data.number}: ${data.step.title}`}
      onClick={() => select({ type: 'step', stepId: data.step.id })}
    >
      <Handle type="target" position={Position.Top} id="top" />
      <span className={`step-kind kind-${data.step.kind}`}>{stepKindLabels[data.step.kind]}</span>
      <span className="flow-step-title">{data.step.title}</span>
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Right} id="right" />
    </button>
  );
}

function AddStepNode({ data }: NodeProps<FlowNode>) {
  const { select } = useFlow();
  if (data.kind !== 'addStep') return null;
  return (
    <button type="button" className="flow-add" onClick={() => select({ type: 'newStep', moduleId: data.moduleId })}>
      + Passo
    </button>
  );
}

function AddModuleNode() {
  const { select } = useFlow();
  return (
    <button type="button" className="flow-add flow-add-module" onClick={() => select({ type: 'newModule' })}>
      + Módulo
    </button>
  );
}

function EndNode() {
  return (
    <div className="flow-node flow-end">
      <Handle type="target" position={Position.Left} id="left" />
      <span className="flow-node-label">Fim</span>
      <strong>Trilha concluída</strong>
    </div>
  );
}

export const nodeTypes = {
  start: StartNode,
  module: ModuleNode,
  step: StepNode,
  addStep: AddStepNode,
  addModule: AddModuleNode,
  end: EndNode,
};
