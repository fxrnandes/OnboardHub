import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

async function scenario() {
  const { master } = await newCompany(app, 'Restaurante');
  const caixa = (await master.post('/job-roles', { name: 'Caixa' })).body.jobRole;
  const cozinha = (await master.post('/job-roles', { name: 'Cozinha' })).body.jobRole;
  const ana = await addMember(app, master, 'colaborador', caixa.id);
  const carla = await addMember(app, master, 'colaborador', caixa.id);
  const beto = await addMember(app, master, 'colaborador', cozinha.id);

  const trail = (await master.post('/trails', { title: 'Onboarding do caixa' })).body.trail;
  const module = (await master.post(`/trails/${trail.id}/modules`, { title: 'Básico' })).body.module;
  const steps = [];
  for (const title of ['Abrir', 'Vender', 'Fechar']) {
    steps.push((await master.post(`/modules/${module.id}/steps`, { title, kind: 'text', body: '...' })).body.step);
  }
  await master.put(`/trails/${trail.id}/job-roles`, { jobRoleIds: [caixa.id] });
  await master.post(`/trails/${trail.id}/publish`);

  return { master, ana, carla, beto, trail, steps };
}

describe('painel de progresso do gestor (H11, RF16)', () => {
  it('lista cada pessoa do cargo com percentual e última atividade, e resume por trilha', async () => {
    const { master, ana, carla, trail, steps } = await scenario();
    for (const step of steps) await ana.member.post(`/my/steps/${step.id}/complete`);
    await carla.member.post(`/my/steps/${steps[0].id}/complete`);

    const res = await master.get('/reports/progress');

    expect(res.status).toBe(200);
    expect(res.body.trails).toEqual([
      { trailId: trail.id, title: 'Onboarding do caixa', assigned: 2, completed: 1, averagePercent: 67 },
    ]);
    const byEmail = Object.fromEntries(res.body.rows.map((row: { email: string }) => [row.email, row]));
    expect(byEmail[ana.email]).toMatchObject({ percent: 100, completed: true, jobRoleName: 'Caixa' });
    expect(byEmail[carla.email]).toMatchObject({ percent: 33, completed: false });
    expect(byEmail[carla.email].lastActivityAt).not.toBeNull();
  });

  it('não lista quem não tem o cargo da trilha nem trilhas em rascunho', async () => {
    const { master, beto } = await scenario();
    await master.post('/trails', { title: 'Rascunho' });

    const res = await master.get('/reports/progress');

    expect(res.body.rows.map((row: { email: string }) => row.email)).not.toContain(beto.email);
    expect(res.body.trails).toHaveLength(1);
  });

  it('quem ainda não começou aparece com 0% e sem última atividade', async () => {
    const { master, ana } = await scenario();

    const res = await master.get('/reports/progress');
    const row = res.body.rows.find((r: { email: string }) => r.email === ana.email);

    expect(row).toMatchObject({ percent: 0, completedSteps: 0, lastActivityAt: null });
  });

  it('filtra por trilha', async () => {
    const { master, trail } = await scenario();
    const other = (await master.post('/trails', { title: 'Outra' })).body.trail;

    expect((await master.get(`/reports/progress?trailId=${trail.id}`)).body.rows).toHaveLength(2);
    expect((await master.get(`/reports/progress?trailId=${other.id}`)).body.rows).toHaveLength(0);
    expect((await master.get('/reports/progress?trailId=nao-e-id')).status).toBe(400);
  });

  it('exporta o mesmo conteúdo em CSV (RF17)', async () => {
    const { master, ana, steps } = await scenario();
    await ana.member.post(`/my/steps/${steps[0].id}/complete`);

    const res = await master.get('/reports/progress.csv');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('progresso-onboarding.csv');
    const lines = res.text.replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toBe(
      'Trilha;Nome;E-mail;Cargo;Passos concluídos;Total de passos;Percentual;Concluída;Última atividade',
    );
    expect(lines.find((line) => line.includes(ana.email))).toContain(`Onboarding do caixa;Pessoa colaborador;${ana.email};Caixa;1;3;33%;Não;`);
  });

  it('gestor também vê o painel; colaborador não', async () => {
    const { master, ana } = await scenario();
    const gestor = await addMember(app, master, 'gestor');

    expect((await gestor.member.get('/reports/progress')).status).toBe(200);
    expect((await ana.member.get('/reports/progress')).status).toBe(403);
    expect((await ana.member.get('/reports/progress.csv')).status).toBe(403);
  });

  it('o painel de uma empresa não mostra dados de outra', async () => {
    const { trail } = await scenario();
    const other = await newCompany(app, 'Outra empresa');

    const res = await other.master.get('/reports/progress');
    expect(res.body.rows).toEqual([]);
    expect((await other.master.get(`/reports/progress?trailId=${trail.id}`)).body.rows).toEqual([]);
  });
});
