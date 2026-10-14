import type { Edge, Node } from '@xyflow/react';
import type { Step, TrailModule, TrailTree } from '../../../api/trails';

export const COLUMN_WIDTH = 300;
export const HEADER_GAP = 130;
export const ROW_HEIGHT = 100;

export type FlowNodeData =
  | { kind: 'start'; title: string; stepCount: number }
  | { kind: 'module'; module: TrailModule; index: number }
  | { kind: 'step'; step: Step; number: number }
  | { kind: 'addStep'; moduleId: string }
  | { kind: 'addModule' }
  | { kind: 'end' };

export type FlowNode = Node<FlowNodeData>;

const edge = (source: string, target: string, vertical = false): Edge => ({
  id: `${source}->${target}`,
  source,
  target,
  sourceHandle: vertical ? 'bottom' : 'right',
  targetHandle: vertical ? 'top' : 'left',
  type: vertical ? 'straight' : 'smoothstep',
  className: vertical ? 'flow-edge-step' : 'flow-edge-module',
});

export function buildFlow(trail: TrailTree): { nodes: FlowNode[]; edges: Edge[] } {
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];
  const stepCount = trail.modules.reduce((sum, module) => sum + module.steps.length, 0);

  nodes.push({ id: 'start', type: 'start', position: { x: 0, y: 0 }, data: { kind: 'start', title: trail.title, stepCount } });

  let previous = 'start';
  let number = 0;

  trail.modules.forEach((module, index) => {
    const x = (index + 1) * COLUMN_WIDTH;
    const moduleId = `module-${module.id}`;
    nodes.push({ id: moduleId, type: 'module', position: { x, y: 0 }, data: { kind: 'module', module, index } });
    edges.push(edge(previous, moduleId));

    let last = moduleId;
    module.steps.forEach((step, stepIndex) => {
      number += 1;
      const stepId = `step-${step.id}`;
      nodes.push({
        id: stepId,
        type: 'step',
        position: { x, y: HEADER_GAP + stepIndex * ROW_HEIGHT },
        data: { kind: 'step', step, number },
      });
      edges.push(edge(last, stepId, true));
      last = stepId;
    });

    nodes.push({
      id: `add-${module.id}`,
      type: 'addStep',
      position: { x, y: HEADER_GAP + module.steps.length * ROW_HEIGHT },
      data: { kind: 'addStep', moduleId: module.id },
    });

    previous = last;
  });

  const endX = (trail.modules.length + 1) * COLUMN_WIDTH;
  nodes.push({ id: 'end', type: 'end', position: { x: endX, y: 0 }, data: { kind: 'end' } });
  edges.push(edge(previous, 'end'));
  nodes.push({ id: 'add-module', type: 'addModule', position: { x: endX, y: HEADER_GAP }, data: { kind: 'addModule' } });

  return { nodes, edges };
}
