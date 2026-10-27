import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { client, createTestApp, uniqueEmail } from '../support/app.js';

const { app, pool, mailer } = createTestApp();
afterAll(() => pool.end());

let email: string;
let sessionToken: string;

beforeEach(async () => {
  email = uniqueEmail('esqueci');
  const res = await request(app)
    .post('/auth/signup')
    .send({ companyName: 'Padaria Central', name: 'Bia Souza', email, password: 'senha-antiga-123' });
  sessionToken = res.body.token;
});

async function requestReset(target = email) {
  return request(app).post('/auth/password-resets').send({ email: target });
}

function resetTokenFor(target = email) {
  const message = mailer.lastTo(target);
  const match = message?.text.match(/\/redefinir-senha\/([\w-]+)/);
  return match?.[1];
}

describe('POST /auth/password-resets', () => {
  it('envia por e-mail um link para criar uma nova senha', async () => {
    const res = await requestReset(`  ${email.toUpperCase()} `);

    expect(res.status).toBe(202);
    const message = mailer.lastTo(email);
    expect(message?.subject).toBe('Redefina sua senha do OnboardHub');
    expect(message?.text).toContain('Olá, Bia');
    expect(message?.text).toMatch(/http:\/\/app\.teste\/redefinir-senha\/[\w-]{40,}/);
    expect(message?.html).toContain('href="http://app.teste/redefinir-senha/');
  });

  it('responde igual para e-mail sem conta, sem enviar nada', async () => {
    const before = mailer.sent.length;
    const res = await requestReset(uniqueEmail('ninguem'));

    expect(res.status).toBe(202);
    expect(mailer.sent).toHaveLength(before);
  });

  it('não revela falha no envio do e-mail e registra o erro', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mailer.failNext = true;
    const res = await requestReset();

    expect(res.status).toBe(202);
    expect(log).toHaveBeenCalledWith('Falha ao enviar o e-mail de redefinição de senha', expect.any(Error));
    log.mockRestore();
  });

  it('valida o e-mail', async () => {
    const res = await requestReset('nao-e-email');

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('email');
  });
});

describe('GET /auth/password-resets/:token', () => {
  it('mostra para qual e-mail é o link', async () => {
    await requestReset();
    const res = await request(app).get(`/auth/password-resets/${resetTokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email });
  });

  it('recusa link inexistente', async () => {
    const res = await request(app).get('/auth/password-resets/inexistente');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('reset_not_found');
  });
});

describe('POST /auth/password-resets/:token', () => {
  it('troca a senha, entra direto e encerra as sessões antigas', async () => {
    await requestReset();
    const res = await request(app).post(`/auth/password-resets/${resetTokenFor()}`).send({ password: 'senha-nova-456' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email, name: 'Bia Souza' });
    expect((await client(app, res.body.token).get('/auth/me')).status).toBe(200);
    expect((await client(app, sessionToken).get('/auth/me')).status).toBe(401);

    const oldLogin = await request(app).post('/auth/login').send({ email, password: 'senha-antiga-123' });
    const newLogin = await request(app).post('/auth/login').send({ email, password: 'senha-nova-456' });
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  it('só pode ser usado uma vez', async () => {
    await requestReset();
    const token = resetTokenFor();
    await request(app).post(`/auth/password-resets/${token}`).send({ password: 'senha-nova-456' });
    const again = await request(app).post(`/auth/password-resets/${token}`).send({ password: 'outra-senha-789' });

    expect(again.status).toBe(410);
    expect(again.body.error.code).toBe('reset_used');
  });

  it('invalida o link anterior quando outro é pedido', async () => {
    await requestReset();
    const first = resetTokenFor();
    await requestReset();
    const second = resetTokenFor();

    expect(second).not.toBe(first);
    const old = await request(app).post(`/auth/password-resets/${first}`).send({ password: 'senha-nova-456' });
    expect(old.status).toBe(410);
    expect(old.body.error.code).toBe('reset_used');
    const current = await request(app).post(`/auth/password-resets/${second}`).send({ password: 'senha-nova-456' });
    expect(current.status).toBe(200);
  });

  it('recusa link vencido', async () => {
    await requestReset();
    const token = resetTokenFor();
    await pool.query(
      `update password_resets set expires_at = now() - interval '1 minute'
        where user_id = (select id from users where email = $1)`,
      [email],
    );

    const preview = await request(app).get(`/auth/password-resets/${token}`);
    const res = await request(app).post(`/auth/password-resets/${token}`).send({ password: 'senha-nova-456' });
    expect(preview.status).toBe(410);
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('reset_expired');
  });

  it('valida a nova senha', async () => {
    await requestReset();
    const res = await request(app).post(`/auth/password-resets/${resetTokenFor()}`).send({ password: 'curta' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toEqual({
      field: 'password',
      message: 'A senha precisa ter pelo menos 8 caracteres.',
    });
  });
});
