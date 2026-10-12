import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

type Client = Awaited<ReturnType<typeof newCompany>>['master'];

async function trailWithSteps(user: Client) {
  const trail = (await user.post('/trails', { title: 'Boas-vindas', description: 'Primeiros passos' })).body.trail;
  const intro = (await user.post(`/trails/${trail.id}/modules`, { title: 'Introdução' })).body.module;
  const cadastro = (await user.post(`/trails/${trail.id}/modules`, { title: 'Cadastro de clientes' })).body.module;
  const s1 = (await user.post(`/modules/${intro.id}/steps`, { title: 'Bem-vindo', kind: 'text', body: 'Olá!' })).body.step;
  const s2 = (await user.post(`/modules/${intro.id}/steps`, { title: 'Manual', kind: 'link', url: 'https://exemplo.com/manual' })).body.step;
  const s3 = (await user.post(`/modules/${cadastro.id}/steps`, { title: 'Vídeo', kind: 'video', url: 'https://youtu.be/abc' })).body.step;
  return { trail, intro, cadastro, steps: [s1, s2, s3] };
}

const titles = (items: { title: string }[]) => items.map((item) => item.title);

describe('trilhas com módulos e passos (H04)', () => {
  it('gestor monta uma trilha e a ordem de módulos e passos é preservada', async () => {
    const { master } = await newCompany(app);
    const { member: gestor } = await addMember(app, master, 'gestor');
    const { trail } = await trailWithSteps(gestor);

    const res = await gestor.get(`/trails/${trail.id}`);

    expect(res.status).toBe(200);
    expect(res.body.trail).toMatchObject({ title: 'Boas-vindas', description: 'Primeiros passos', status: 'draft' });
    expect(titles(res.body.trail.modules)).toEqual(['Introdução', 'Cadastro de clientes']);
    expect(titles(res.body.trail.modules[0].steps)).toEqual(['Bem-vindo', 'Manual']);
    expect(res.body.trail.modules[0].steps.map((s: { position: number }) => s.position)).toEqual([0, 1]);
  });

  it('lista as trilhas com a contagem de módulos, passos e cargos', async () => {
    const { master } = await newCompany(app);
    await trailWithSteps(master);

    const res = await master.get('/trails');

    expect(res.body.trails).toHaveLength(1);
    expect(res.body.trails[0]).toMatchObject({ moduleCount: 2, stepCount: 3, jobRoleIds: [] });
  });

  it('edita título e descrição da trilha', async () => {
    const { master } = await newCompany(app);
    const trail = (await master.post('/trails', { title: 'Antigo' })).body.trail;

    const res = await master.patch(`/trails/${trail.id}`, { title: 'Novo', description: 'Nova descrição' });

    expect(res.body.trail).toMatchObject({ title: 'Novo', description: 'Nova descrição' });
  });

  it('reordena módulos e passos', async () => {
    const { master } = await newCompany(app);
    const { trail, intro, cadastro, steps } = await trailWithSteps(master);

    expect((await master.put(`/trails/${trail.id}/modules/order`, { moduleIds: [cadastro.id, intro.id] })).status).toBe(200);
    expect((await master.put(`/modules/${intro.id}/steps/order`, { stepIds: [steps[1].id, steps[0].id] })).status).toBe(200);

    const tree = (await master.get(`/trails/${trail.id}`)).body.trail;
    expect(titles(tree.modules)).toEqual(['Cadastro de clientes', 'Introdução']);
    expect(titles(tree.modules[1].steps)).toEqual(['Manual', 'Bem-vindo']);
  });

  it('recusa reordenação com itens faltando ou repetidos', async () => {
    const { master } = await newCompany(app);
    const { trail, intro, steps } = await trailWithSteps(master);

    expect((await master.put(`/trails/${trail.id}/modules/order`, { moduleIds: [intro.id] })).status).toBe(400);
    expect((await master.put(`/modules/${intro.id}/steps/order`, { stepIds: [steps[0].id, steps[0].id] })).status).toBe(400);
  });

  it('excluir módulo ou passo reorganiza as posições', async () => {
    const { master } = await newCompany(app);
    const { trail, intro, steps } = await trailWithSteps(master);

    expect((await master.delete(`/steps/${steps[0].id}`)).status).toBe(204);
    expect((await master.delete(`/modules/${intro.id}`)).status).toBe(204);

    const tree = (await master.get(`/trails/${trail.id}`)).body.trail;
    expect(tree.modules.map((m: { title: string; position: number }) => [m.title, m.position])).toEqual([
      ['Cadastro de clientes', 0],
    ]);
  });

  it('renomeia módulo', async () => {
    const { master } = await newCompany(app);
    const { intro } = await trailWithSteps(master);

    const res = await master.patch(`/modules/${intro.id}`, { title: 'Começo' });

    expect(res.body.module.title).toBe('Começo');
  });

  it('edita um passo e troca o tipo dele', async () => {
    const { master } = await newCompany(app);
    const { steps } = await trailWithSteps(master);

    const res = await master.patch(`/steps/${steps[1].id}`, { kind: 'text', body: 'Agora é texto' });

    expect(res.body.step).toMatchObject({ kind: 'text', body: 'Agora é texto', url: null, title: 'Manual' });
  });

  it('valida o conteúdo de acordo com o tipo do passo', async () => {
    const { master } = await newCompany(app);
    const { intro } = await trailWithSteps(master);
    const add = (body: object) => master.post(`/modules/${intro.id}/steps`, { title: 'Passo', ...body });

    expect((await add({ kind: 'text' })).body.error.message).toBe('Passo de texto precisa de conteúdo.');
    expect((await add({ kind: 'text', body: '   ' })).status).toBe(400);
    expect((await add({ kind: 'link' })).body.error.message).toBe('Passo de link precisa de uma URL.');
    expect((await add({ kind: 'video' })).body.error.message).toBe('Passo de vídeo precisa da URL do vídeo.');
    expect((await add({ kind: 'image', url: 'javascript:alert(1)' })).status).toBe(400);
    expect((await add({ kind: 'image', url: 'https://exemplo.com/foto.png' })).status).toBe(201);
  });

  it('exclui a trilha com tudo o que há nela', async () => {
    const { master } = await newCompany(app);
    const { trail } = await trailWithSteps(master);

    expect((await master.delete(`/trails/${trail.id}`)).status).toBe(204);

    expect((await master.get(`/trails/${trail.id}`)).status).toBe(404);
    const { rowCount } = await pool.query('select 1 from trail_steps where trail_id = $1', [trail.id]);
    expect(rowCount).toBe(0);
  });

  it('duplica a trilha com módulos, passos e cargos, como rascunho (RF06)', async () => {
    const { master } = await newCompany(app);
    const jobRole = (await master.post('/job-roles', { name: 'Vendas' })).body.jobRole;
    const { trail, intro } = await trailWithSteps(master);
    await master.put(`/trails/${trail.id}/job-roles`, { jobRoleIds: [jobRole.id] });
    await master.post(`/trails/${trail.id}/publish`);

    const res = await master.post(`/trails/${trail.id}/duplicate`);

    expect(res.status).toBe(201);
    expect(res.body.trail).toMatchObject({ title: 'Boas-vindas (cópia)', status: 'draft', jobRoleIds: [jobRole.id] });
    expect(titles(res.body.trail.modules[0].steps)).toEqual(['Bem-vindo', 'Manual']);
    expect(res.body.trail.modules[0].id).not.toBe(intro.id);
  });

  it('valida os dados da trilha', async () => {
    const { master } = await newCompany(app);

    expect((await master.post('/trails', { title: '' })).status).toBe(400);
    expect((await master.patch('/trails/00000000-0000-0000-0000-000000000000', {})).status).toBe(400);
  });

  it('colaborador não gerencia trilhas', async () => {
    const { master } = await newCompany(app);
    const { member: colaborador } = await addMember(app, master, 'colaborador');
    const { trail } = await trailWithSteps(master);

    expect((await colaborador.get('/trails')).status).toBe(403);
    expect((await colaborador.post('/trails', { title: 'X' })).status).toBe(403);
    expect((await colaborador.delete(`/trails/${trail.id}`)).status).toBe(403);
  });

  it('responde 404 para trilha, módulo ou passo inexistente', async () => {
    const { master } = await newCompany(app);
    const missing = '00000000-0000-0000-0000-000000000000';

    expect((await master.get(`/trails/${missing}`)).status).toBe(404);
    expect((await master.patch(`/trails/${missing}`, { title: 'X' })).status).toBe(404);
    expect((await master.delete(`/trails/${missing}`)).status).toBe(404);
    expect((await master.post(`/trails/${missing}/modules`, { title: 'X' })).status).toBe(404);
    expect((await master.patch(`/modules/${missing}`, { title: 'X' })).status).toBe(404);
    expect((await master.delete(`/modules/${missing}`)).status).toBe(404);
    expect((await master.post(`/modules/${missing}/steps`, { title: 'X', kind: 'text', body: 'x' })).status).toBe(404);
    expect((await master.put(`/modules/${missing}/steps/order`, { stepIds: [] })).status).toBe(404);
    expect((await master.patch(`/steps/${missing}`, { title: 'X' })).status).toBe(404);
    expect((await master.delete(`/steps/${missing}`)).status).toBe(404);
  });
});

describe('publicar e atribuir a cargos (H06, H07)', () => {
  it('não publica trilha sem nenhum passo', async () => {
    const { master } = await newCompany(app);
    const trail = (await master.post('/trails', { title: 'Vazia' })).body.trail;

    const res = await master.post(`/trails/${trail.id}/publish`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('trail_empty');
  });

  it('publica avisando quando a trilha não tem cargo, e despublica', async () => {
    const { master } = await newCompany(app);
    const { trail } = await trailWithSteps(master);

    const published = await master.post(`/trails/${trail.id}/publish`);
    expect(published.body.trail.status).toBe('published');
    expect(published.body.trail.publishedAt).not.toBeNull();
    expect(published.body.warnings).toHaveLength(1);

    const unpublished = await master.post(`/trails/${trail.id}/unpublish`);
    expect(unpublished.body.trail).toMatchObject({ status: 'draft', publishedAt: null });
  });

  it('atribui a trilha a cargos e substitui a lista quando muda', async () => {
    const { master } = await newCompany(app);
    const caixa = (await master.post('/job-roles', { name: 'Caixa' })).body.jobRole;
    const cozinha = (await master.post('/job-roles', { name: 'Cozinha' })).body.jobRole;
    const { trail } = await trailWithSteps(master);

    await master.put(`/trails/${trail.id}/job-roles`, { jobRoleIds: [caixa.id, cozinha.id, caixa.id] });
    expect((await master.get(`/trails/${trail.id}`)).body.trail.jobRoleIds).toEqual([caixa.id, cozinha.id].sort());

    await master.put(`/trails/${trail.id}/job-roles`, { jobRoleIds: [cozinha.id] });
    expect((await master.get(`/trails/${trail.id}`)).body.trail.jobRoleIds).toEqual([cozinha.id]);

    const published = await master.post(`/trails/${trail.id}/publish`);
    expect(published.body.warnings).toEqual([]);
  });

  it('não atribui a cargo inexistente', async () => {
    const { master } = await newCompany(app);
    const { trail } = await trailWithSteps(master);

    const res = await master.put(`/trails/${trail.id}/job-roles`, {
      jobRoleIds: ['00000000-0000-0000-0000-000000000000'],
    });

    expect(res.status).toBe(400);
  });
});

describe('isolamento das trilhas entre empresas', () => {
  it('uma empresa não vê nem altera trilhas, módulos e passos de outra', async () => {
    const a = await newCompany(app, 'Empresa A');
    const b = await newCompany(app, 'Empresa B');
    const { trail, intro, steps } = await trailWithSteps(a.master);
    const jobRoleA = (await a.master.post('/job-roles', { name: 'Cargo A' })).body.jobRole;
    const trailB = (await b.master.post('/trails', { title: 'Trilha B' })).body.trail;

    expect(JSON.stringify((await b.master.get('/trails')).body)).not.toContain(trail.id);
    expect((await b.master.get(`/trails/${trail.id}`)).status).toBe(404);
    expect((await b.master.patch(`/trails/${trail.id}`, { title: 'Invadida' })).status).toBe(404);
    expect((await b.master.post(`/trails/${trail.id}/publish`)).status).toBe(404);
    expect((await b.master.post(`/trails/${trail.id}/duplicate`)).status).toBe(404);
    expect((await b.master.post(`/modules/${intro.id}/steps`, { title: 'X', kind: 'text', body: 'x' })).status).toBe(404);
    expect((await b.master.patch(`/steps/${steps[0].id}`, { title: 'Invadido' })).status).toBe(404);
    expect((await b.master.put(`/trails/${trailB.id}/job-roles`, { jobRoleIds: [jobRoleA.id] })).status).toBe(400);

    expect((await a.master.get(`/trails/${trail.id}`)).body.trail.title).toBe('Boas-vindas');
  });
});
