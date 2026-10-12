import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

async function scenario() {
  const { master } = await newCompany(app, 'Restaurante');
  const caixa = (await master.post('/job-roles', { name: 'Caixa' })).body.jobRole;
  const cozinha = (await master.post('/job-roles', { name: 'Cozinha' })).body.jobRole;
  const ana = await addMember(app, master, 'colaborador', caixa.id);
  const beto = await addMember(app, master, 'colaborador', cozinha.id);

  const trail = (await master.post('/trails', { title: 'Onboarding do caixa' })).body.trail;
  const basico = (await master.post(`/trails/${trail.id}/modules`, { title: 'Básico' })).body.module;
  const fechamento = (await master.post(`/trails/${trail.id}/modules`, { title: 'Fechamento' })).body.module;
  const steps = [
    (await master.post(`/modules/${basico.id}/steps`, { title: 'Abrir o caixa', kind: 'text', body: '...' })).body.step,
    (await master.post(`/modules/${basico.id}/steps`, { title: 'Registrar venda', kind: 'text', body: '...' })).body.step,
    (await master.post(`/modules/${fechamento.id}/steps`, { title: 'Fechar o caixa', kind: 'text', body: '...' })).body.step,
  ];
  await master.put(`/trails/${trail.id}/job-roles`, { jobRoleIds: [caixa.id] });

  return { master, caixa, ana, beto, trail, steps };
}

describe('o colaborador vê só trilhas publicadas do seu cargo (H06, H07, H08)', () => {
  it('rascunho não aparece; depois de publicada, aparece só para o cargo atribuído', async () => {
    const { master, ana, beto, trail } = await scenario();

    expect((await ana.member.get('/my/trails')).body.trails).toHaveLength(0);
    expect((await ana.member.get(`/my/trails/${trail.id}`)).status).toBe(404);

    await master.post(`/trails/${trail.id}/publish`);

    const list = (await ana.member.get('/my/trails')).body.trails;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: 'Onboarding do caixa', totalSteps: 3, completedSteps: 0, percent: 0, completed: false });

    expect((await beto.member.get('/my/trails')).body.trails).toHaveLength(0);
    expect((await beto.member.get(`/my/trails/${trail.id}`)).status).toBe(404);
  });

  it('despublicar esconde a trilha de novo', async () => {
    const { master, ana, trail } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);

    await master.post(`/trails/${trail.id}/unpublish`);

    expect((await ana.member.get(`/my/trails/${trail.id}`)).status).toBe(404);
  });

  it('mudar o cargo da pessoa muda as trilhas que ela vê', async () => {
    const { master, beto, caixa, trail } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);

    await master.patch(`/members/${beto.memberId}`, { jobRoleId: caixa.id });

    expect((await beto.member.get('/my/trails')).body.trails).toHaveLength(1);
  });

  it('pessoa sem cargo não vê nenhuma trilha', async () => {
    const { master, trail } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);
    const semCargo = await addMember(app, master, 'colaborador');

    expect((await semCargo.member.get('/my/trails')).body.trails).toEqual([]);
  });

  it('abre a trilha com os módulos e passos em ordem, sem expor dados de gestão', async () => {
    const { master, ana, trail } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);

    const res = await ana.member.get(`/my/trails/${trail.id}`);

    expect(res.status).toBe(200);
    expect(res.body.trail.modules.map((m: { title: string }) => m.title)).toEqual(['Básico', 'Fechamento']);
    expect(res.body.trail.modules[0].steps[0]).toMatchObject({ title: 'Abrir o caixa', completedAt: null });
    expect(res.body.trail.jobRoleIds).toBeUndefined();
  });
});

describe('progresso e retomada (H09, H10)', () => {
  it('marca passos, atualiza o percentual e retoma no primeiro passo não concluído', async () => {
    const { master, ana, trail, steps } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);

    expect((await ana.member.get(`/my/trails/${trail.id}`)).body.resumeStepId).toBe(steps[0].id);

    let res = await ana.member.post(`/my/steps/${steps[0].id}/complete`);
    expect(res.body.progress).toMatchObject({ completedSteps: 1, totalSteps: 3, percent: 33, completed: false, nextStepId: steps[1].id });

    res = await ana.member.post(`/my/steps/${steps[0].id}/complete`);
    expect(res.body.progress.completedSteps).toBe(1);

    await ana.member.post(`/my/steps/${steps[2].id}/complete`);
    const view = (await ana.member.get(`/my/trails/${trail.id}`)).body;
    expect(view.resumeStepId).toBe(steps[1].id);
    expect(view.progress.percent).toBe(67);
    expect(view.trail.modules[0].steps[0].completedAt).not.toBeNull();
    expect(view.trail.modules[0].steps[1].completedAt).toBeNull();

    res = await ana.member.post(`/my/steps/${steps[1].id}/complete`);
    expect(res.body.progress).toMatchObject({ percent: 100, completed: true, nextStepId: null });

    const list = (await ana.member.get('/my/trails')).body.trails;
    expect(list[0]).toMatchObject({ percent: 100, completed: true });
    expect(list[0].lastActivityAt).not.toBeNull();
  });

  it('com a trilha concluída, a retomada volta para o primeiro passo', async () => {
    const { master, ana, trail, steps } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);
    for (const step of steps) await ana.member.post(`/my/steps/${step.id}/complete`);

    expect((await ana.member.get(`/my/trails/${trail.id}`)).body.resumeStepId).toBe(steps[0].id);
  });

  it('desmarca um passo concluído', async () => {
    const { master, ana, trail, steps } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);
    await ana.member.post(`/my/steps/${steps[0].id}/complete`);

    const res = await ana.member.delete(`/my/steps/${steps[0].id}/complete`);

    expect(res.body.progress).toMatchObject({ completedSteps: 0, percent: 0, nextStepId: steps[0].id });
  });

  it('o progresso de uma pessoa não aparece para outra', async () => {
    const { master, ana, caixa, trail, steps } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);
    const carla = await addMember(app, master, 'colaborador', caixa.id);
    await ana.member.post(`/my/steps/${steps[0].id}/complete`);

    expect((await carla.member.get('/my/trails')).body.trails[0].completedSteps).toBe(0);
  });

  it('não registra progresso em trilha que a pessoa não pode ver', async () => {
    const { master, beto, trail, steps } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);

    expect((await beto.member.post(`/my/steps/${steps[0].id}/complete`)).status).toBe(404);
    expect((await beto.member.delete(`/my/steps/${steps[0].id}/complete`)).status).toBe(404);
  });

  it('não registra progresso em trilha de outra empresa', async () => {
    const { master, trail, steps } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);
    const other = await newCompany(app, 'Outra empresa');

    expect((await other.master.post(`/my/steps/${steps[0].id}/complete`)).status).toBe(404);
    expect((await other.master.get(`/my/trails/${trail.id}`)).status).toBe(404);
  });

  it('excluir um passo tira ele do progresso', async () => {
    const { master, ana, trail, steps } = await scenario();
    await master.post(`/trails/${trail.id}/publish`);
    await ana.member.post(`/my/steps/${steps[0].id}/complete`);

    await master.delete(`/steps/${steps[0].id}`);

    expect((await ana.member.get('/my/trails')).body.trails[0]).toMatchObject({ totalSteps: 2, completedSteps: 0 });
  });

  it('exige login', async () => {
    expect((await request(app).get('/my/trails')).status).toBe(401);
  });
});
