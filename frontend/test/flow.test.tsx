import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType, ReactNode } from 'react';
import { tokenStorage } from '../src/api/client';
import type { TrailTree } from '../src/api/trails';
import { buildFlow } from '../src/pages/trails/flow/layout';
import { mockFetch, session, type Routes } from './support/fetch';
import { renderApp } from './support/render';

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({
    nodes,
    nodeTypes,
    children,
  }: {
    nodes: { id: string; type: string; data: unknown }[];
    nodeTypes: Record<string, ComponentType<{ data: unknown }>>;
    children: ReactNode;
  }) => (
    <div>
      {nodes.map((node) => {
        const Node = nodeTypes[node.type]!;
        return <Node key={node.id} data={node.data} />;
      })}
      {children}
    </div>
  ),
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

vi.mock('@xyflow/react/dist/style.css', () => ({}));

function makeTrail(): TrailTree {
  return {
    id: 't1',
    title: 'Vendas',
    description: '',
    status: 'draft',
    publishedAt: null,
    moduleCount: 2,
    stepCount: 3,
    jobRoleIds: [],
    createdAt: '',
    updatedAt: '',
    modules: [
      {
        id: 'm1',
        title: 'Boas-vindas',
        position: 0,
        steps: [
          { id: 's1', moduleId: 'm1', title: 'Conheça a loja', kind: 'text', body: 'Oi', url: null, position: 0 },
          { id: 's2', moduleId: 'm1', title: 'Vídeo', kind: 'video', body: null, url: 'https://youtu.be/x', position: 1 },
        ],
      },
      { id: 'm2', title: 'Sistema', position: 1, steps: [{ id: 's3', moduleId: 'm2', title: 'PDV', kind: 'link', body: null, url: 'https://pdv', position: 0 }] },
    ],
  };
}

describe('buildFlow', () => {
  it('liga início, módulos, passos e fim em sequência', () => {
    const { nodes, edges } = buildFlow(makeTrail());
    expect(nodes.map((node) => node.id)).toEqual([
      'start',
      'module-m1',
      'step-s1',
      'step-s2',
      'add-m1',
      'module-m2',
      'step-s3',
      'add-m2',
      'end',
      'add-module',
    ]);
    expect(edges.map((edge) => `${edge.source}>${edge.target}`)).toEqual([
      'start>module-m1',
      'module-m1>step-s1',
      'step-s1>step-s2',
      'step-s2>module-m2',
      'module-m2>step-s3',
      'step-s3>end',
    ]);
    expect(nodes.find((node) => node.id === 'step-s3')!.data).toMatchObject({ number: 3 });
    expect(nodes.find((node) => node.id === 'module-m2')!.position.x).toBeGreaterThan(nodes.find((node) => node.id === 'module-m1')!.position.x);
  });

  it('funciona com trilha vazia', () => {
    const { nodes, edges } = buildFlow({ ...makeTrail(), modules: [] });
    expect(nodes.map((node) => node.id)).toEqual(['start', 'end', 'add-module']);
    expect(edges).toHaveLength(1);
  });
});

describe('modo fluxo do editor', () => {
  function setup(extra: Routes = {}) {
    tokenStorage.set('tok');
    localStorage.setItem('onboardhub.editorView.t1', 'flow');
    return mockFetch({
      'GET /auth/me': { body: session },
      'GET /job-roles': { body: { jobRoles: [] } },
      'GET /trails/t1': { body: { trail: makeTrail() } },
      ...extra,
    });
  }

  it('lembra o modo escolhido e alterna para lista', async () => {
    setup();
    renderApp('/trilhas/t1');

    expect(await screen.findByRole('button', { name: 'Passo 1: Conheça a loja' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fluxo', pressed: true })).toBeInTheDocument();
    expect(screen.getByText('Como usar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('heading', { name: 'Boas-vindas' })).toBeInTheDocument();
    expect(localStorage.getItem('onboardhub.editorView.t1')).toBe('list');
  });

  it('edita, reordena e exclui um passo pelo painel', async () => {
    const { calls } = setup({
      'PATCH /steps/s2': (body) => ({ body: { step: { ...makeTrail().modules[0]!.steps[1], ...(body as object) } } }),
      'PUT /modules/m1/steps/order': (body) => ({ body }),
      'DELETE /steps/s2': { status: 204 },
    });
    renderApp('/trilhas/t1');

    await userEvent.click(await screen.findByRole('button', { name: 'Passo 2: Vídeo' }));
    expect(screen.getByRole('heading', { name: 'Editar passo' })).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toHaveValue('https://youtu.be/x');
    expect(screen.getByRole('button', { name: '↓ Descer' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: '↑ Subir' }));
    await userEvent.clear(screen.getByLabelText('Título do passo'));
    await userEvent.type(screen.getByLabelText('Título do passo'), 'Vídeo do fundador');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar passo' }));
    expect(await screen.findByText('Como usar')).toBeInTheDocument();
    expect(calls.find((call) => call.path === '/modules/m1/steps/order')!.body).toEqual({ stepIds: ['s2', 's1'] });
    expect(calls.find((call) => call.method === 'PATCH')!.body).toMatchObject({ title: 'Vídeo do fundador', kind: 'video' });

    await userEvent.click(screen.getByRole('button', { name: 'Passo 2: Vídeo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir passo' }));
    expect(await screen.findByText('Como usar')).toBeInTheDocument();
  });

  it('cria passo e módulo pelos botões de adicionar', async () => {
    const { calls } = setup({
      'POST /modules/m2/steps': (body) => ({ status: 201, body: { step: { id: 's9', moduleId: 'm2', position: 1, ...(body as object) } } }),
      'POST /trails/t1/modules': (body) => ({ status: 201, body: { module: { id: 'm9', position: 2, steps: [], ...(body as object) } } }),
    });
    renderApp('/trilhas/t1');

    const addButtons = await screen.findAllByRole('button', { name: '+ Passo' });
    await userEvent.click(addButtons[1]!);
    expect(screen.getByRole('heading', { name: 'Novo passo' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Título do passo'), 'Emitir nota');
    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Passo a passo');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar passo' }));
    await screen.findByText('Como usar');
    expect(calls.find((call) => call.path === '/modules/m2/steps')!.body).toMatchObject({ title: 'Emitir nota', kind: 'text' });

    await userEvent.click(screen.getByRole('button', { name: '+ Módulo' }));
    await userEvent.type(screen.getByLabelText('Nome do módulo'), 'Primeira semana');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar módulo' }));
    await screen.findByText('Como usar');
    expect(calls.find((call) => call.path === '/trails/t1/modules')!.body).toEqual({ title: 'Primeira semana' });
  });

  it('renomeia, move e exclui módulo pelo painel', async () => {
    const { calls } = setup({
      'PATCH /modules/m2': { body: { module: { id: 'm2', title: 'PDV', position: 1 } } },
      'PUT /trails/t1/modules/order': (body) => ({ body }),
      'DELETE /modules/m2': { status: 204 },
    });
    renderApp('/trilhas/t1');

    await userEvent.click(await screen.findByRole('button', { name: 'Módulo 2: Sistema' }));
    expect(screen.getByRole('button', { name: 'Depois →' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar nome' })).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Nome do módulo'));
    await userEvent.type(screen.getByLabelText('Nome do módulo'), 'PDV');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    await vi.waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true));

    await userEvent.click(screen.getByRole('button', { name: '← Antes' }));
    expect(calls.find((call) => call.path === '/trails/t1/modules/order')!.body).toEqual({ moduleIds: ['m2', 'm1'] });

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir módulo' }));
    expect(await screen.findByText('Como usar')).toBeInTheDocument();
  });
});
