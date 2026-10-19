import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { client, createTestApp, uniqueEmail } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

let email: string;
let token: string;

beforeEach(async () => {
  email = uniqueEmail('perfil');
  const res = await request(app)
    .post('/auth/signup')
    .send({ companyName: 'Padaria Central', name: 'Bia Souza', email, password: 'senha-antiga-123' });
  token = res.body.token;
});

describe('PATCH /auth/me', () => {
  it('altera o próprio nome', async () => {
    const res = await client(app, token).patch('/auth/me', { name: '  Beatriz Souza  ' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Beatriz Souza', email });
    const me = await client(app, token).get('/auth/me');
    expect(me.body.user.name).toBe('Beatriz Souza');
  });

  it('valida o nome', async () => {
    const res = await client(app, token).patch('/auth/me', { name: 'B' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('name');
  });

  it('exige login', async () => {
    const res = await request(app).patch('/auth/me').send({ name: 'Alguém' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /auth/password', () => {
  it('troca a senha, devolve um token novo e encerra as sessões antigas', async () => {
    const otherSession = (await request(app).post('/auth/login').send({ email, password: 'senha-antiga-123' })).body.token;

    const res = await client(app, token).put('/auth/password', {
      currentPassword: 'senha-antiga-123',
      newPassword: 'senha-nova-456',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));

    expect((await client(app, token).get('/auth/me')).status).toBe(401);
    expect((await client(app, otherSession).get('/auth/me')).status).toBe(401);
    expect((await client(app, res.body.token).get('/auth/me')).status).toBe(200);

    const oldLogin = await request(app).post('/auth/login').send({ email, password: 'senha-antiga-123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/auth/login').send({ email, password: 'senha-nova-456' });
    expect(newLogin.status).toBe(200);
    expect((await client(app, newLogin.body.token).get('/auth/me')).status).toBe(200);
  });

  it('recusa quando a senha atual está errada', async () => {
    const res = await client(app, token).put('/auth/password', {
      currentPassword: 'errada-123',
      newPassword: 'senha-nova-456',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('wrong_password');
    expect((await client(app, token).get('/auth/me')).status).toBe(200);
  });

  it('valida a nova senha', async () => {
    const res = await client(app, token).put('/auth/password', { currentPassword: 'senha-antiga-123', newPassword: 'curta' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('newPassword');
  });

  it('recusa nova senha igual à atual', async () => {
    const res = await client(app, token).put('/auth/password', {
      currentPassword: 'senha-antiga-123',
      newPassword: 'senha-antiga-123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('same_password');
  });
});
