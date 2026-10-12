import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

const email = uniqueEmail('login');
const password = 'senha-forte-123';

beforeAll(async () => {
  await request(app).post('/auth/signup').send({ companyName: 'Oficina', name: 'Zé', email, password });
});

const login = (body: object) => request(app).post('/auth/login').send(body);

describe('POST /auth/login', () => {
  it('entra com e-mail e senha corretos e recebe o token', async () => {
    const res = await login({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email, role: 'master' });
  });

  it('aceita o e-mail com letras maiúsculas', async () => {
    const res = await login({ email: email.toUpperCase(), password });

    expect(res.status).toBe(200);
  });

  it('recusa senha errada', async () => {
    const res = await login({ email, password: 'senha-errada' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('E-mail ou senha incorretos.');
  });

  it('dá a mesma resposta para e-mail que não existe, sem revelar quem tem conta', async () => {
    const res = await login({ email: uniqueEmail('ninguem'), password });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('E-mail ou senha incorretos.');
  });

  it('exige e-mail e senha', async () => {
    const res = await login({});

    expect(res.status).toBe(400);
  });
});
