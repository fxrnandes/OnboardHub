import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany, uniqueEmail } from '../support/app.js';

const { app, pool, mailer } = createTestApp();
afterAll(() => pool.end());

const tokenFrom = (link: string) => link.split('/convite/')[1]!;

async function companyWithRole() {
  const company = await newCompany(app);
  const jobRole = (await company.master.post('/job-roles', { name: 'Caixa' })).body.jobRole;
  return { ...company, jobRoleId: jobRole.id as string };
}

describe('regras dos convites', () => {
  it('colaborador precisa de cargo; gestor não', async () => {
    const { master, jobRoleId } = await companyWithRole();

    const missing = await master.post('/invites', { role: 'colaborador' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.details[0]).toEqual({
      field: 'jobRoleId',
      message: 'Escolha o cargo: é por ele que a pessoa vê as trilhas.',
    });

    expect((await master.post('/invites', { role: 'colaborador', jobRoleId })).status).toBe(201);
    expect((await master.post('/invites', { role: 'gestor' })).status).toBe(201);
  });

  it('não convida um e-mail que já tem conta', async () => {
    const { master, jobRoleId } = await companyWithRole();
    const { email } = await addMember(app, master, 'colaborador', jobRoleId);
    const sentBefore = mailer.sent.length;

    const res = await master.post('/invites', { email: email.toUpperCase(), role: 'colaborador', jobRoleId });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('email_already_registered');
    expect(mailer.sent).toHaveLength(sentBefore);
  });

  it('não cria dois convites pendentes para o mesmo e-mail', async () => {
    const { master, jobRoleId } = await companyWithRole();
    const email = uniqueEmail('dup');
    const first = await master.post('/invites', { email, role: 'colaborador', jobRoleId });

    const again = await master.post('/invites', { email, role: 'colaborador', jobRoleId });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('invite_already_pending');

    await master.delete(`/invites/${first.body.invite.id}`);
    expect((await master.post('/invites', { email, role: 'colaborador', jobRoleId })).status).toBe(201);
  });

  it('reenviar gera um link novo, invalida o antigo e renova a validade', async () => {
    const { master, jobRoleId } = await companyWithRole();
    const email = uniqueEmail('reenvio');
    const created = await master.post('/invites', { email, role: 'colaborador', jobRoleId });
    const oldToken = tokenFrom(created.body.link);
    await pool.query("update invites set expires_at = now() - interval '1 day' where id = $1", [created.body.invite.id]);

    const res = await master.post(`/invites/${created.body.invite.id}/resend`);

    expect(res.status).toBe(200);
    expect(res.body.emailSent).toBe(true);
    expect(res.body.invite.status).toBe('pending');
    expect(new Date(res.body.invite.expiresAt).getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000);
    expect(tokenFrom(res.body.link)).not.toBe(oldToken);
    expect(mailer.lastTo(email)!.text).toContain(res.body.link);
    expect((await request(app).get(`/invites/token/${oldToken}`)).status).toBe(404);
    expect((await request(app).get(`/invites/token/${tokenFrom(res.body.link)}`)).status).toBe(200);
  });

  it('não reenvia convite aceito ou revogado', async () => {
    const { master, jobRoleId } = await companyWithRole();
    const revoked = (await master.post('/invites', { role: 'gestor' })).body.invite;
    await master.delete(`/invites/${revoked.id}`);
    expect((await master.post(`/invites/${revoked.id}/resend`)).status).toBe(404);

    await addMember(app, master, 'colaborador', jobRoleId);
    const accepted = (await master.get('/invites')).body.invites.find((i: { status: string }) => i.status === 'accepted');
    expect((await master.post(`/invites/${accepted.id}/resend`)).status).toBe(404);
  });

  it('mostra quando e por quem o convite foi aceito', async () => {
    const { master, jobRoleId } = await companyWithRole();
    await addMember(app, master, 'colaborador', jobRoleId);

    const [invite] = (await master.get('/invites')).body.invites;

    expect(invite.status).toBe('accepted');
    expect(invite.acceptedByName).toBe('Pessoa colaborador');
    expect(new Date(invite.acceptedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('gestor convida, reenvia e revoga só colaboradores', async () => {
    const { master, jobRoleId } = await companyWithRole();
    const { member: gestor } = await addMember(app, master, 'gestor');

    const created = await gestor.post('/invites', { role: 'colaborador', jobRoleId });
    expect(created.status).toBe(201);
    expect((await gestor.post(`/invites/${created.body.invite.id}/resend`)).status).toBe(200);
    expect((await gestor.delete(`/invites/${created.body.invite.id}`)).status).toBe(204);

    const forbidden = await gestor.post('/invites', { role: 'gestor' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.message).toBe('Gestores convidam só colaboradores.');

    const fromMaster = (await master.post('/invites', { role: 'gestor' })).body.invite;
    expect((await gestor.delete(`/invites/${fromMaster.id}`)).status).toBe(403);
    expect((await gestor.post(`/invites/${fromMaster.id}/resend`)).status).toBe(403);
    expect((await gestor.get('/invites')).status).toBe(200);
  });

  it('colaborador não acessa convites', async () => {
    const { master, jobRoleId } = await companyWithRole();
    const { member } = await addMember(app, master, 'colaborador', jobRoleId);
    expect((await member.get('/invites')).status).toBe(403);
    expect((await member.post('/invites', { role: 'colaborador', jobRoleId })).status).toBe(403);
  });
});
