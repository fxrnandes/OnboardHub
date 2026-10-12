import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

describe('cargos (H03)', () => {
  it('master cria, renomeia, lista e exclui cargos', async () => {
    const { master } = await newCompany(app);

    const created = await master.post('/job-roles', { name: 'Atendente' });
    expect(created.status).toBe(201);
    const id = created.body.jobRole.id;

    const renamed = await master.patch(`/job-roles/${id}`, { name: 'Atendente de balcão' });
    expect(renamed.body.jobRole.name).toBe('Atendente de balcão');

    const list = await master.get('/job-roles');
    expect(list.body.jobRoles.map((jr: { name: string }) => jr.name)).toEqual(['Atendente de balcão']);

    expect((await master.delete(`/job-roles/${id}`)).status).toBe(204);
    expect((await master.get('/job-roles')).body.jobRoles).toHaveLength(0);
  });

  it('não aceita dois cargos com o mesmo nome, ignorando maiúsculas e espaços', async () => {
    const { master } = await newCompany(app);
    await master.post('/job-roles', { name: 'Caixa' });

    const duplicated = await master.post('/job-roles', { name: '  caixa ' });

    expect(duplicated.status).toBe(409);
    expect(duplicated.body.error.message).toBe('Já existe um cargo com esse nome.');
  });

  it('não deixa renomear para um nome que já existe', async () => {
    const { master } = await newCompany(app);
    await master.post('/job-roles', { name: 'Caixa' });
    const other = await master.post('/job-roles', { name: 'Estoque' });

    const res = await master.patch(`/job-roles/${other.body.jobRole.id}`, { name: 'CAIXA' });

    expect(res.status).toBe(409);
  });

  it('empresas diferentes podem ter cargos com o mesmo nome', async () => {
    const a = await newCompany(app);
    const b = await newCompany(app);

    expect((await a.master.post('/job-roles', { name: 'Vendas' })).status).toBe(201);
    expect((await b.master.post('/job-roles', { name: 'Vendas' })).status).toBe(201);
  });

  it('conta quantas pessoas estão em cada cargo', async () => {
    const { master } = await newCompany(app);
    const jobRole = (await master.post('/job-roles', { name: 'Cozinha' })).body.jobRole;
    await addMember(app, master, 'colaborador', jobRole.id);
    await addMember(app, master, 'colaborador', jobRole.id);

    const list = await master.get('/job-roles');

    expect(list.body.jobRoles[0].memberCount).toBe(2);
  });

  it('excluir um cargo deixa as pessoas dele sem cargo', async () => {
    const { master } = await newCompany(app);
    const jobRole = (await master.post('/job-roles', { name: 'Cozinha' })).body.jobRole;
    const { member } = await addMember(app, master, 'colaborador', jobRole.id);

    await master.delete(`/job-roles/${jobRole.id}`);

    expect((await member.get('/auth/me')).body.user.jobRoleId).toBeNull();
  });

  it('gestor e colaborador podem ver os cargos, mas não alterar', async () => {
    const { master } = await newCompany(app);
    const jobRole = (await master.post('/job-roles', { name: 'Caixa' })).body.jobRole;
    const { member: gestor } = await addMember(app, master, 'gestor');
    const { member: colaborador } = await addMember(app, master, 'colaborador');

    expect((await gestor.get('/job-roles')).status).toBe(200);
    expect((await colaborador.post('/job-roles', { name: 'X' })).status).toBe(403);
    expect((await gestor.patch(`/job-roles/${jobRole.id}`, { name: 'X' })).status).toBe(403);
    expect((await gestor.delete(`/job-roles/${jobRole.id}`)).status).toBe(403);
  });

  it('valida o nome do cargo', async () => {
    const { master } = await newCompany(app);

    const res = await master.post('/job-roles', { name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toBe('Informe o nome do cargo.');
  });

  it('responde 404 para cargo inexistente ou id inválido', async () => {
    const { master } = await newCompany(app);

    expect((await master.patch('/job-roles/00000000-0000-0000-0000-000000000000', { name: 'X' })).status).toBe(404);
    expect((await master.delete('/job-roles/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    expect((await master.delete('/job-roles/nao-e-um-id')).status).toBe(404);
  });
});
