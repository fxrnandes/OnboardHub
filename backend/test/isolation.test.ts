import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany } from './support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

let a: Awaited<ReturnType<typeof build>>;
let b: Awaited<ReturnType<typeof build>>;

async function build(name: string) {
  const company = await newCompany(app, name);
  const jobRole = (await company.master.post('/job-roles', { name: 'Cargo' })).body.jobRole;
  const { memberId } = await addMember(app, company.master, 'colaborador', jobRole.id);
  const invite = (await company.master.post('/invites', {})).body.invite;
  return { ...company, jobRole, memberId, invite };
}

beforeAll(async () => {
  a = await build('Empresa A');
  b = await build('Empresa B');
});

describe('uma empresa não enxerga nem altera dados de outra (RNF02)', () => {
  it('as listas mostram só os dados da própria empresa', async () => {
    const lists = await Promise.all([b.master.get('/job-roles'), b.master.get('/members'), b.master.get('/invites')]);
    const visible = JSON.stringify(lists.map((list) => list.body));

    for (const id of [a.jobRole.id, a.memberId, a.masterId, a.invite.id]) {
      expect(visible).not.toContain(id);
    }
  });

  it('não altera nem apaga cargos, pessoas ou convites de outra empresa', async () => {
    expect((await b.master.patch(`/job-roles/${a.jobRole.id}`, { name: 'Invadido' })).status).toBe(404);
    expect((await b.master.delete(`/job-roles/${a.jobRole.id}`)).status).toBe(404);
    expect((await b.master.patch(`/members/${a.memberId}`, { role: 'gestor' })).status).toBe(404);
    expect((await b.master.delete(`/members/${a.memberId}`)).status).toBe(404);
    expect((await b.master.delete(`/invites/${a.invite.id}`)).status).toBe(404);

    const jobRoles = await a.master.get('/job-roles');
    expect(jobRoles.body.jobRoles[0].name).toBe('Cargo');
  });

  it('não usa o cargo de outra empresa', async () => {
    expect((await b.master.patch(`/members/${b.memberId}`, { jobRoleId: a.jobRole.id })).status).toBe(400);
    expect((await b.master.post('/invites', { jobRoleId: a.jobRole.id })).status).toBe(400);
  });

  it('o banco impede ligar uma pessoa a um cargo de outra empresa', async () => {
    await expect(
      pool.query('update users set job_role_id = $1 where id = $2', [a.jobRole.id, b.memberId]),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
