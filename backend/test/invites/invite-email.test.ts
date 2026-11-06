import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp, newCompany, uniqueEmail } from '../support/app.js';

const { app, pool, mailer } = createTestApp();
afterAll(() => pool.end());

describe('convite enviado por e-mail', () => {
  it('com e-mail informado, a pessoa recebe o link do convite', async () => {
    const { master } = await newCompany(app, 'Padaria Central');
    const jobRole = (await master.post('/job-roles', { name: 'Atendente' })).body.jobRole;
    const email = uniqueEmail('maria');

    const res = await master.post('/invites', { email: `  ${email.toUpperCase()} `, role: 'colaborador', jobRoleId: jobRole.id });

    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(true);
    const message = mailer.lastTo(email)!;
    expect(message.subject).toBe('Você foi convidado para a Padaria Central no OnboardHub');
    expect(message.text).toContain(res.body.link);
    expect(message.text).toContain('Atendente');
    expect(message.text).toContain('7 dias');
    expect(message.html).toContain(`href="${res.body.link}"`);
  });

  it('protege o HTML do e-mail contra nomes com tags', async () => {
    const { master } = await newCompany(app, 'Loja <b>Teste</b>');
    const email = uniqueEmail('html');

    await master.post('/invites', { email, role: 'gestor' });

    const message = mailer.lastTo(email)!;
    expect(message.html).toContain('Loja &lt;b&gt;Teste&lt;/b&gt;');
    expect(message.html).not.toContain('<b>Teste</b>');
  });

  it('sem e-mail, só gera o link para copiar', async () => {
    const { master } = await newCompany(app);
    const before = mailer.sent.length;

    const res = await master.post('/invites', { role: 'colaborador' });

    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(false);
    expect(mailer.sent).toHaveLength(before);
  });

  it('se o e-mail falhar, o convite continua criado e o link aparece para copiar', async () => {
    const { master } = await newCompany(app);
    mailer.failNext = true;

    const res = await master.post('/invites', { email: uniqueEmail('falha'), role: 'colaborador' });

    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(false);
    expect(res.body.link).toContain('/convite/');
    expect((await master.get('/invites')).body.invites[0].status).toBe('pending');
  });
});
