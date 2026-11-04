import { existsSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { LocalDiskStorage } from '../../src/modules/media/storage.js';
import { TEST_JWT_SECRET, addMember, createTestApp, newCompany } from '../support/app.js';

const root = await mkdtemp(join(tmpdir(), 'onboardhub-account-test-'));
const { app, pool } = createTestApp({ storage: new LocalDiskStorage(root, TEST_JWT_SECRET, '/api') });
afterAll(() => pool.end());

const PASSWORD = 'senha-forte-123';

const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(120, 7)]);

const count = async (sql: string, params: unknown[]) => (await pool.query<{ total: number }>(sql, params)).rows[0]!.total;

async function tokenOf(company: Awaited<ReturnType<typeof newCompany>>) {
  const res = await company.master.get('/auth/me');
  return res.request.getHeader('Authorization').replace('Bearer ', '') as string;
}

describe('excluir a própria conta (RNF10)', () => {
  it('mostra o que vai acontecer antes de excluir', async () => {
    const { master } = await newCompany(app);
    const { member } = await addMember(app, master, 'colaborador');

    const forMaster = await master.get('/auth/account-deletion');
    expect(forMaster.status).toBe(200);
    expect(forMaster.body).toEqual({ deletesCompany: true, otherMembers: 1 });

    const forMember = await member.get('/auth/account-deletion');
    expect(forMember.body).toEqual({ deletesCompany: false, otherMembers: 1 });
  });

  it('colaborador exclui a conta: some o acesso e o progresso, a empresa continua', async () => {
    const { master, companyId } = await newCompany(app);
    const jobRole = (await master.post('/job-roles', { name: 'Caixa' })).body.jobRole;
    const trail = (await master.post('/trails', { title: 'Boas-vindas' })).body.trail;
    const module = (await master.post(`/trails/${trail.id}/modules`, { title: 'Início' })).body.module;
    const step = (await master.post(`/modules/${module.id}/steps`, { title: 'Leia', kind: 'text', body: 'Olá' })).body.step;
    await master.put(`/trails/${trail.id}/job-roles`, { jobRoleIds: [jobRole.id] });
    await master.post(`/trails/${trail.id}/publish`);
    const { member, memberId, email } = await addMember(app, master, 'colaborador', jobRole.id);
    await member.post(`/my/steps/${step.id}/complete`);
    expect(await count('select count(*)::int as total from step_progress where user_id = $1', [memberId])).toBe(1);

    const res = await member.delete('/auth/me', { password: PASSWORD });

    expect(res.status).toBe(204);
    expect((await member.get('/auth/me')).status).toBe(401);
    expect((await request(app).post('/auth/login').send({ email, password: PASSWORD })).status).toBe(401);
    expect(await count('select count(*)::int as total from users where id = $1', [memberId])).toBe(0);
    expect(await count('select count(*)::int as total from step_progress where user_id = $1', [memberId])).toBe(0);
    expect(await count('select count(*)::int as total from companies where id = $1', [companyId])).toBe(1);
    expect((await master.get('/members')).body.members).toHaveLength(1);
  });

  it('pede a senha certa', async () => {
    const { master } = await newCompany(app);
    const { member } = await addMember(app, master, 'gestor');

    const wrong = await member.delete('/auth/me', { password: 'errada-123' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('wrong_password');

    const missing = await member.delete('/auth/me', {});
    expect(missing.status).toBe(400);
    expect(missing.body.error.details[0].field).toBe('password');

    expect((await member.get('/auth/me')).status).toBe(200);
  });

  it('o único master só exclui a conta junto com a empresa', async () => {
    const { master } = await newCompany(app);

    const res = await master.delete('/auth/me', { password: PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('company_deletion_required');
    expect((await master.get('/auth/me')).status).toBe(200);
  });

  it('o único master exclui a empresa inteira, com pessoas, trilhas e arquivos', async () => {
    const company = await newCompany(app);
    const { master, companyId } = company;
    const { member } = await addMember(app, master, 'colaborador');
    const upload = await request(app)
      .post('/media')
      .set('Authorization', `Bearer ${await tokenOf(company)}`)
      .attach('file', png(), 'foto.png');
    const trail = (await master.post('/trails', { title: 'Com imagem' })).body.trail;
    const module = (await master.post(`/trails/${trail.id}/modules`, { title: 'Módulo' })).body.module;
    await master.post(`/modules/${module.id}/steps`, { title: 'Foto', kind: 'image', mediaId: upload.body.media.id });
    const { rows } = await pool.query<{ storage_key: string }>('select storage_key from media where company_id = $1', [companyId]);
    const file = join(root, rows[0]!.storage_key);
    expect(existsSync(file)).toBe(true);

    const res = await master.delete('/auth/me', { password: PASSWORD, deleteCompany: true });

    expect(res.status).toBe(204);
    expect(await count('select count(*)::int as total from companies where id = $1', [companyId])).toBe(0);
    expect(await count('select count(*)::int as total from users where company_id = $1', [companyId])).toBe(0);
    expect(await count('select count(*)::int as total from trails where company_id = $1', [companyId])).toBe(0);
    expect(await count('select count(*)::int as total from media where company_id = $1', [companyId])).toBe(0);
    expect(existsSync(file)).toBe(false);
    expect((await master.get('/auth/me')).status).toBe(401);
    expect((await member.get('/auth/me')).status).toBe(401);
  });

  it('com outro master na empresa, exclui só a própria conta', async () => {
    const { master, masterId, companyId } = await newCompany(app);
    const { member: other, memberId } = await addMember(app, master, 'gestor');
    await master.patch(`/members/${memberId}`, { role: 'master' });

    expect((await master.get('/auth/account-deletion')).body.deletesCompany).toBe(false);
    const res = await master.delete('/auth/me', { password: PASSWORD, deleteCompany: true });

    expect(res.status).toBe(204);
    expect(await count('select count(*)::int as total from users where id = $1', [masterId])).toBe(0);
    expect(await count('select count(*)::int as total from companies where id = $1', [companyId])).toBe(1);
    expect((await other.get('/auth/me')).status).toBe(200);
  });

  it('exige login', async () => {
    expect((await request(app).delete('/auth/me').send({ password: PASSWORD })).status).toBe(401);
    expect((await request(app).get('/auth/account-deletion')).status).toBe(401);
  });
});
