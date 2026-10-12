import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany, uniqueEmail } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

const tokenFrom = (link: string) => link.split('/convite/')[1]!;
const preview = (token: string) => request(app).get(`/invites/token/${token}`);
const accept = (token: string, body: object) => request(app).post(`/invites/token/${token}/accept`).send(body);

describe('convites por link (H02)', () => {
  it('fluxo completo: master convida, a pessoa cria a senha e entra na empresa com o cargo', async () => {
    const { master, companyId } = await newCompany(app, 'Oficina do Zé');
    const jobRole = (await master.post('/job-roles', { name: 'Mecânico' })).body.jobRole;
    const email = uniqueEmail('joao');

    const created = await master.post('/invites', { email, role: 'colaborador', jobRoleId: jobRole.id });
    expect(created.status).toBe(201);
    expect(created.body.link).toMatch(/^http:\/\/app\.teste\/convite\/[\w-]{20,}$/);
    const token = tokenFrom(created.body.link);

    const info = await preview(token);
    expect(info.body.invite).toMatchObject({ companyName: 'Oficina do Zé', email, role: 'colaborador', jobRoleName: 'Mecânico' });

    const joined = await accept(token, { name: 'João Silva', password: 'senha-do-joao' });
    expect(joined.status).toBe(201);
    expect(joined.body.user).toMatchObject({ email, role: 'colaborador', jobRoleId: jobRole.id });

    const login = await request(app).post('/auth/login').send({ email, password: 'senha-do-joao' });
    expect(login.status).toBe(200);

    const { rows } = await pool.query('select company_id from users where id = $1', [joined.body.user.id]);
    expect(rows[0].company_id).toBe(companyId);

    expect((await master.get('/invites')).body.invites[0].status).toBe('accepted');
  });

  it('o token do convite não fica salvo no banco, só um resumo (hash) dele', async () => {
    const { master } = await newCompany(app);
    const created = await master.post('/invites', {});
    const token = tokenFrom(created.body.link);

    const { rows } = await pool.query('select token_hash from invites where id = $1', [created.body.invite.id]);

    expect(rows[0].token_hash).not.toBe(token);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('convite sem e-mail pede que a pessoa informe o próprio', async () => {
    const { master } = await newCompany(app);
    const token = tokenFrom((await master.post('/invites', { role: 'gestor' })).body.link);

    const without = await accept(token, { name: 'Fulano', password: 'senha-forte-123' });
    expect(without.status).toBe(400);
    expect(without.body.error.code).toBe('email_required');

    const email = uniqueEmail('livre');
    const ok = await accept(token, { name: 'Fulano', password: 'senha-forte-123', email });
    expect(ok.status).toBe(201);
    expect(ok.body.user).toMatchObject({ email, role: 'gestor' });
  });

  it('cada convite só pode ser usado uma vez', async () => {
    const { master } = await newCompany(app);
    const token = tokenFrom((await master.post('/invites', { email: uniqueEmail() })).body.link);
    await accept(token, { name: 'Pessoa', password: 'senha-forte-123' });

    const again = await accept(token, { name: 'Pessoa', password: 'senha-forte-123' });

    expect(again.status).toBe(410);
    expect(again.body.error.message).toBe('Este convite já foi utilizado.');
  });

  it('convite cancelado não funciona mais', async () => {
    const { master } = await newCompany(app);
    const created = await master.post('/invites', {});

    expect((await master.delete(`/invites/${created.body.invite.id}`)).status).toBe(204);

    const res = await preview(tokenFrom(created.body.link));
    expect(res.status).toBe(410);
    expect(res.body.error.message).toBe('Este convite foi cancelado.');
    expect((await master.delete(`/invites/${created.body.invite.id}`)).status).toBe(404);
  });

  it('convite vence depois de 7 dias', async () => {
    const { master } = await newCompany(app);
    const created = await master.post('/invites', {});
    const expiresAt = new Date(created.body.invite.expiresAt).getTime();
    expect(expiresAt - Date.now()).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);

    await pool.query("update invites set expires_at = now() - interval '1 minute' where id = $1", [
      created.body.invite.id,
    ]);

    const res = await preview(tokenFrom(created.body.link));
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('invite_expired');
  });

  it('link inexistente responde 404', async () => {
    expect((await preview('link-que-nao-existe')).status).toBe(404);
  });

  it('recusa aceitar com e-mail que já tem conta', async () => {
    const { master } = await newCompany(app);
    const { email } = await addMember(app, master, 'colaborador');
    const token = tokenFrom((await master.post('/invites', {})).body.link);

    const res = await accept(token, { name: 'Pessoa', password: 'senha-forte-123', email });

    expect(res.status).toBe(409);
  });

  it('não aceita convidar alguém como master', async () => {
    const { master } = await newCompany(app);

    expect((await master.post('/invites', { role: 'master' })).status).toBe(400);
  });

  it('não aceita cargo que não existe', async () => {
    const { master } = await newCompany(app);

    const res = await master.post('/invites', { jobRoleId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('job_role_not_found');
  });

  it('só o master convida e vê os convites', async () => {
    const { master } = await newCompany(app);
    const { member: gestor } = await addMember(app, master, 'gestor');

    expect((await gestor.post('/invites', {})).status).toBe(403);
    expect((await gestor.get('/invites')).status).toBe(403);
  });

  it('valida os dados de quem aceita', async () => {
    const { master } = await newCompany(app);
    const token = tokenFrom((await master.post('/invites', {})).body.link);

    const res = await accept(token, { name: 'A', password: '123' });

    expect(res.status).toBe(400);
  });
});
