import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

describe('público da trilha', () => {
  it('conta quem tem acesso à trilha e quem já começou', async () => {
    const { master } = await newCompany(app);
    const caixa = (await master.post('/job-roles', { name: 'Caixa' })).body.jobRole;
    const outro = (await master.post('/job-roles', { name: 'Estoque' })).body.jobRole;
    const trail = (await master.post('/trails', { title: 'Boas-vindas' })).body.trail;
    const module = (await master.post(`/trails/${trail.id}/modules`, { title: 'Início' })).body.module;
    const step = (await master.post(`/modules/${module.id}/steps`, { title: 'Leia', kind: 'text', body: 'Olá' })).body.step;
    await master.put(`/trails/${trail.id}/job-roles`, { jobRoleIds: [caixa.id] });
    await master.post(`/trails/${trail.id}/publish`);
    const { member: ana } = await addMember(app, master, 'colaborador', caixa.id);
    await addMember(app, master, 'colaborador', caixa.id);
    await addMember(app, master, 'colaborador', outro.id);
    await ana.post(`/my/steps/${step.id}/complete`);

    const res = await master.get(`/trails/${trail.id}/audience`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ people: 2, started: 1 });
  });

  it('trilha de outra empresa não existe', async () => {
    const a = await newCompany(app);
    const b = await newCompany(app);
    const trail = (await a.master.post('/trails', { title: 'Privada' })).body.trail;
    expect((await b.master.get(`/trails/${trail.id}/audience`)).status).toBe(404);
  });
});
