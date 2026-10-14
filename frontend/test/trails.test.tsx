import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import type { TrailTree } from '../src/api/trails';
import { moveItem } from '../src/api/trails';
import { mockFetch, session, type Routes } from './support/fetch';
import { renderApp } from './support/render';

const suporte = { id: 'j1', name: 'Suporte', memberCount: 1, createdAt: '' };
const vendas = { id: 'j2', name: 'Vendas', memberCount: 0, createdAt: '' };

function makeTrail(overrides: Partial<TrailTree> = {}): TrailTree {
  return {
    id: 't1',
    title: 'Boas-vindas',
    description: 'Primeira semana',
    status: 'draft',
    publishedAt: null,
    moduleCount: 0,
    stepCount: 0,
    jobRoleIds: [],
    createdAt: '',
    updatedAt: '',
    modules: [],
    ...overrides,
  };
}

function asMaster(routes: Routes) {
  tokenStorage.set('tok');
  return mockFetch({ 'GET /auth/me': { body: session }, 'GET /job-roles': { body: { jobRoles: [suporte, vendas] } }, ...routes });
}

describe('moveItem', () => {
  it('troca posições e ignora movimentos para fora da lista', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

describe('lista de trilhas', () => {
  it('mostra as trilhas com status, contagens e cargos', async () => {
    asMaster({
      'GET /trails': {
        body: {
          trails: [
            makeTrail({ moduleCount: 2, stepCount: 5, jobRoleIds: ['j1'] }),
            makeTrail({ id: 't2', title: 'Ferramentas', status: 'published', moduleCount: 1, stepCount: 1 }),
          ],
        },
      },
    });
    renderApp('/trilhas');

    expect(await screen.findByRole('link', { name: 'Boas-vindas' })).toHaveAttribute('href', '/trilhas/t1');
    expect(screen.getByText('2 módulos · 5 passos')).toBeInTheDocument();
    expect(await screen.findByText('Cargos: Suporte')).toBeInTheDocument();
    expect(screen.getByText('1 módulo · 1 passo')).toBeInTheDocument();
    expect(screen.getByText('Publicada')).toBeInTheDocument();
    expect(screen.getByText('Nenhum cargo atribuído')).toBeInTheDocument();
  });

  it('cria uma trilha e abre o editor', async () => {
    const { calls } = asMaster({
      'GET /trails': { body: { trails: [] } },
      'POST /trails': { status: 201, body: { trail: makeTrail({ title: 'Nova' }) } },
      'GET /trails/t1': { body: { trail: makeTrail({ title: 'Nova' }) } },
    });
    renderApp('/trilhas');

    expect(await screen.findByText('Nenhuma trilha ainda')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nova trilha'), 'Nova');
    await userEvent.click(screen.getByRole('button', { name: 'Criar trilha' }));

    expect(await screen.findByRole('heading', { name: 'Nova' })).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ title: 'Nova', description: '' });
  });

  it('duplica e exclui trilhas', async () => {
    const { calls } = asMaster({
      'GET /trails': { body: { trails: [makeTrail()] } },
      'POST /trails/t1/duplicate': { status: 201, body: { trail: makeTrail({ id: 't9', title: 'Boas-vindas (cópia)' }) } },
      'DELETE /trails/t1': { status: 204 },
    });
    renderApp('/trilhas');

    await userEvent.click(await screen.findByRole('button', { name: 'Duplicar' }));
    expect(await screen.findByText('Boas-vindas (cópia)')).toBeInTheDocument();

    const card = screen.getByRole('link', { name: 'Boas-vindas' }).closest('li')!;
    await userEvent.click(within(card).getByRole('button', { name: 'Excluir' }));
    await userEvent.click(within(card).getByRole('button', { name: 'Confirmar exclusão' }));

    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/trails/t1' });
    expect(screen.queryByRole('link', { name: 'Boas-vindas' })).not.toBeInTheDocument();
  });

  it('colaborador não acessa as trilhas de gestão', async () => {
    tokenStorage.set('tok');
    mockFetch({ 'GET /auth/me': { body: { ...session, user: { ...session.user, role: 'colaborador' } } } });
    renderApp('/trilhas');
    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
  });
});

describe('editor de trilha', () => {
  function fakeBackend(initial: TrailTree) {
    let tree = structuredClone(initial);
    let nextId = 1;
    const recount = () => {
      tree.moduleCount = tree.modules.length;
      tree.stepCount = tree.modules.reduce((sum, module) => sum + module.steps.length, 0);
    };
    const routes: Routes = {
      'GET /trails/t1': () => ({ body: { trail: tree } }),
      'PATCH /trails/t1': (body) => {
        tree = { ...tree, ...(body as object) };
        return { body: { trail: tree } };
      },
      'POST /trails/t1/publish': () => {
        if (tree.stepCount === 0) {
          return { status: 400, body: { error: { code: 'trail_empty', message: 'Adicione pelo menos um passo antes de publicar.' } } };
        }
        tree.status = 'published';
        return {
          body: {
            trail: tree,
            warnings: tree.jobRoleIds.length ? [] : ['A trilha não está atribuída a nenhum cargo, então nenhum colaborador vai vê-la.'],
          },
        };
      },
      'POST /trails/t1/unpublish': () => {
        tree.status = 'draft';
        return { body: { trail: tree } };
      },
      'PUT /trails/t1/job-roles': (body) => {
        tree.jobRoleIds = (body as { jobRoleIds: string[] }).jobRoleIds;
        return { body: { jobRoleIds: tree.jobRoleIds } };
      },
      'POST /trails/t1/modules': (body) => {
        const module = { id: `m${nextId++}`, title: (body as { title: string }).title, position: tree.modules.length, steps: [] };
        tree.modules.push(module);
        recount();
        return { status: 201, body: { module } };
      },
      'PUT /trails/t1/modules/order': (body) => {
        const ids = (body as { moduleIds: string[] }).moduleIds;
        tree.modules = ids.map((id) => tree.modules.find((module) => module.id === id)!);
        return { body: { moduleIds: ids } };
      },
    };
    return { routes, get: () => tree, set: (next: TrailTree) => (tree = next) };
  }

  it('edita título e descrição', async () => {
    const backend = fakeBackend(makeTrail());
    const { calls } = asMaster(backend.routes);
    renderApp('/trilhas/t1');

    const title = await screen.findByLabelText('Título');
    expect(screen.getByRole('button', { name: 'Salvar informações' })).toBeDisabled();
    await userEvent.clear(title);
    await userEvent.type(title, 'Boas-vindas ao time');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar informações' }));

    expect(await screen.findByRole('heading', { name: 'Boas-vindas ao time' })).toBeInTheDocument();
    expect(screen.getByText('Salvo')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')!.body).toEqual({
      title: 'Boas-vindas ao time',
      description: 'Primeira semana',
    });
  });

  it('não publica trilha vazia e avisa quando falta cargo', async () => {
    const backend = fakeBackend(makeTrail());
    asMaster(backend.routes);
    renderApp('/trilhas/t1');

    await userEvent.click(await screen.findByRole('button', { name: 'Publicar trilha' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Adicione pelo menos um passo antes de publicar.');

    backend.get().stepCount = 1;
    await userEvent.click(screen.getByRole('button', { name: 'Publicar trilha' }));
    expect(await screen.findByText(/nenhum colaborador vai vê-la/)).toBeInTheDocument();
    expect(screen.getByText('Publicada')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Suporte' }));
    expect(screen.queryByText(/nenhum colaborador vai vê-la/)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Suporte' })).toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar para rascunho' }));
    expect(await screen.findByText('Rascunho')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Suporte' }));
    expect(backend.get().jobRoleIds).toEqual([]);
  });

  it('adiciona e reordena módulos', async () => {
    const backend = fakeBackend(makeTrail());
    const { calls } = asMaster(backend.routes);
    renderApp('/trilhas/t1');

    expect(await screen.findByText('Nenhum módulo ainda')).toBeInTheDocument();
    for (const title of ['Primeiros passos', 'Ferramentas']) {
      await userEvent.type(screen.getByLabelText('Novo módulo'), title);
      await userEvent.click(screen.getByRole('button', { name: 'Adicionar módulo' }));
      await screen.findByRole('heading', { name: title });
    }
    expect(screen.getByLabelText('Novo módulo')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Subir módulo Primeiros passos' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Descer módulo Primeiros passos' }));
    expect(calls.at(-2)).toMatchObject({ method: 'PUT', body: { moduleIds: ['m2', 'm1'] } });
    const headings = await screen.findAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Ferramentas', 'Primeiros passos']);
  });

  it('adiciona, edita, reordena e exclui passos dentro de um módulo', async () => {
    const backend = fakeBackend(
      makeTrail({ modules: [{ id: 'm1', title: 'Primeiros passos', position: 0, steps: [] }], moduleCount: 1 }),
    );
    const steps = () => backend.get().modules[0]!.steps;
    const { calls } = asMaster({
      ...backend.routes,
      'POST /modules/m1/steps': (body) => {
        const input = body as { title: string; kind: 'text'; body: string | null; url: string | null };
        if (input.kind === 'text' && !input.body) {
          return { status: 400, body: { error: { code: 'step_content', message: 'Passo de texto precisa de conteúdo.' } } };
        }
        const step = { id: `s${steps().length + 1}`, moduleId: 'm1', position: steps().length, ...input };
        steps().push(step);
        return { status: 201, body: { step } };
      },
      'PATCH /steps/s1': (body) => {
        const step = steps().find((item) => item.id === 's1')!;
        Object.assign(step, body);
        return { body: { step } };
      },
      'PUT /modules/m1/steps/order': (body) => {
        const ids = (body as { stepIds: string[] }).stepIds;
        backend.get().modules[0]!.steps = ids.map((id) => steps().find((step) => step.id === id)!);
        return { body: { stepIds: ids } };
      },
      'DELETE /steps/s1': () => {
        backend.get().modules[0]!.steps = steps().filter((step) => step.id !== 's1');
        return { status: 204 };
      },
      'PATCH /modules/m1': (body) => {
        backend.get().modules[0]!.title = (body as { title: string }).title;
        return { body: { module: backend.get().modules[0] } };
      },
    });
    renderApp('/trilhas/t1');

    await userEvent.click(await screen.findByRole('button', { name: '+ Adicionar passo' }));
    await userEvent.type(screen.getByLabelText('Título do passo'), 'Leia o manual');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar passo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Passo de texto precisa de conteúdo.');

    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Bem-vindo!');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar passo' }));
    expect(await screen.findByText('Leia o manual')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '+ Adicionar passo' }));
    await userEvent.type(screen.getByLabelText('Título do passo'), 'Vídeo do CEO');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'video');
    expect(screen.getByLabelText('Explicação (opcional)')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('URL'), 'https://youtu.be/abc');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar passo' }));
    expect(await screen.findByText('Vídeo do CEO')).toBeInTheDocument();
    expect(calls.filter((call) => call.path === '/modules/m1/steps').at(-1)!.body).toEqual({
      title: 'Vídeo do CEO',
      kind: 'video',
      body: null,
      url: 'https://youtu.be/abc',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Descer passo Leia o manual' }));
    expect(calls.find((call) => call.path === '/modules/m1/steps/order')!.body).toEqual({ stepIds: ['s2', 's1'] });

    const item = (await screen.findByText('Leia o manual')).closest('li')!;
    await userEvent.click(within(item).getByRole('button', { name: 'Editar' }));
    const stepTitle = screen.getByLabelText('Título do passo');
    expect(screen.getByLabelText('Conteúdo')).toHaveValue('Bem-vindo!');
    await userEvent.clear(stepTitle);
    await userEvent.type(stepTitle, 'Leia o manual do sistema');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar passo' }));
    expect(await screen.findByText('Leia o manual do sistema')).toBeInTheDocument();

    const edited = screen.getByText('Leia o manual do sistema').closest('li')!;
    await userEvent.click(within(edited).getByRole('button', { name: 'Excluir' }));
    await userEvent.click(within(edited).getByRole('button', { name: 'Excluir passo' }));
    await vi.waitFor(() => expect(screen.queryByText('Leia o manual do sistema')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Renomear' }));
    const moduleName = screen.getByLabelText('Nome do módulo');
    await userEvent.clear(moduleName);
    await userEvent.type(moduleName, 'Semana 1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('heading', { name: 'Semana 1' })).toBeInTheDocument();
  });

  it('mostra erro quando a trilha não existe', async () => {
    asMaster({ 'GET /trails/t404': { status: 404, body: { error: { code: 'not_found', message: 'Trilha não encontrada.' } } } });
    renderApp('/trilhas/t404');
    expect(await screen.findByRole('alert')).toHaveTextContent('Trilha não encontrada.');
    expect(screen.getByRole('link', { name: 'Voltar para as trilhas' })).toBeInTheDocument();
  });
});
