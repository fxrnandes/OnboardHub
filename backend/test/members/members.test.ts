import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

describe('pessoas da empresa (RF03)', () => {
  it('master e gestor veem a equipe; colaborador não', async () => {
    const { master } = await newCompany(app);
    const { member: gestor } = await addMember(app, master, 'gestor');
    const { member: colaborador } = await addMember(app, master, 'colaborador');

    const list = await gestor.get('/members');
    expect(list.status).toBe(200);
    expect(list.body.members).toHaveLength(3);
    expect(JSON.stringify(list.body)).not.toMatch(/password/i);

    expect((await colaborador.get('/members')).status).toBe(403);
  });

  it('master muda o papel e o cargo de uma pessoa', async () => {
    const { master } = await newCompany(app);
    const jobRole = (await master.post('/job-roles', { name: 'Vendas' })).body.jobRole;
    const { memberId } = await addMember(app, master, 'colaborador');

    const res = await master.patch(`/members/${memberId}`, { role: 'gestor', jobRoleId: jobRole.id });

    expect(res.status).toBe(200);
    expect(res.body.member).toMatchObject({ role: 'gestor', jobRoleId: jobRole.id });
  });

  it('mudar o papel vale na hora, sem precisar de novo login', async () => {
    const { master } = await newCompany(app);
    const { member, memberId } = await addMember(app, master, 'colaborador');
    expect((await member.get('/members')).status).toBe(403);

    await master.patch(`/members/${memberId}`, { role: 'gestor' });

    expect((await member.get('/members')).status).toBe(200);
  });

  it('master tira o cargo de uma pessoa', async () => {
    const { master } = await newCompany(app);
    const jobRole = (await master.post('/job-roles', { name: 'Vendas' })).body.jobRole;
    const { memberId } = await addMember(app, master, 'colaborador', jobRole.id);

    const res = await master.patch(`/members/${memberId}`, { jobRoleId: null });

    expect(res.body.member.jobRoleId).toBeNull();
  });

  it('não deixa a empresa sem nenhum master', async () => {
    const { master, masterId } = await newCompany(app);

    const res = await master.patch(`/members/${masterId}`, { role: 'gestor' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('last_master');
  });

  it('com dois masters, um deles pode deixar de ser master', async () => {
    const { master, masterId } = await newCompany(app);
    const { memberId } = await addMember(app, master, 'gestor');
    await master.patch(`/members/${memberId}`, { role: 'master' });

    const res = await master.patch(`/members/${masterId}`, { role: 'gestor' });

    expect(res.status).toBe(200);
  });

  it('não aceita cargo que não existe', async () => {
    const { master } = await newCompany(app);
    const { memberId } = await addMember(app, master, 'colaborador');

    const res = await master.patch(`/members/${memberId}`, { jobRoleId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('job_role_not_found');
  });

  it('exige ao menos uma alteração', async () => {
    const { master } = await newCompany(app);
    const { memberId } = await addMember(app, master, 'colaborador');

    expect((await master.patch(`/members/${memberId}`, {})).status).toBe(400);
  });

  it('só o master altera pessoas', async () => {
    const { master } = await newCompany(app);
    const { member: gestor } = await addMember(app, master, 'gestor');
    const { memberId } = await addMember(app, master, 'colaborador');

    expect((await gestor.patch(`/members/${memberId}`, { role: 'gestor' })).status).toBe(403);
    expect((await gestor.delete(`/members/${memberId}`)).status).toBe(403);
  });

  it('master remove uma pessoa, que perde o acesso na hora', async () => {
    const { master } = await newCompany(app);
    const { member, memberId } = await addMember(app, master, 'colaborador');

    expect((await master.delete(`/members/${memberId}`)).status).toBe(204);
    expect((await member.get('/auth/me')).status).toBe(401);
  });

  it('master não remove a si mesmo', async () => {
    const { master, masterId } = await newCompany(app);

    const res = await master.delete(`/members/${masterId}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('cannot_remove_self');
  });

  it('responde 404 para pessoa inexistente', async () => {
    const { master } = await newCompany(app);
    const missing = '00000000-0000-0000-0000-000000000000';

    expect((await master.patch(`/members/${missing}`, { role: 'gestor' })).status).toBe(404);
    expect((await master.delete(`/members/${missing}`)).status).toBe(404);
  });
});
