import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { TEST_JWT_SECRET, uniqueEmail, validCnpj } from '../support/app.js';
import { createTestPool } from '../support/db.js';

const pool = createTestPool();
afterAll(() => pool.end());

const small = { windowMs: 60_000, max: 3 };
const app = createApp({
  pool,
  jwtSecret: TEST_JWT_SECRET,
  appUrl: 'http://app.teste',
  rateLimits: { login: small, signup: small, passwordReset: small, token: small },
});

const fromIp = (ip: string) => ({ 'X-Forwarded-For': ip });

describe('limite de tentativas', () => {
  it('bloqueia o login depois de várias tentativas para o mesmo e-mail e IP', async () => {
    const email = uniqueEmail('alvo');
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/auth/login').set(fromIp('10.0.0.1')).send({ email, password: 'errada-123' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app).post('/auth/login').set(fromIp('10.0.0.1')).send({ email, password: 'errada-123' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('too_many_requests');
    expect(blocked.body.error.message).toBe('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('conta o e-mail sem diferenciar maiúsculas e não bloqueia outra pessoa no mesmo IP', async () => {
    const email = uniqueEmail('caixa');
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/auth/login')
        .set(fromIp('10.0.0.2'))
        .send({ email: i % 2 ? email.toUpperCase() : email, password: 'x' });
    }

    const login = (ip: string, address: string) => request(app).post('/auth/login').set(fromIp(ip)).send({ email: address, password: 'x' });
    expect((await login('10.0.0.2', email)).status).toBe(429);
    expect((await login('10.0.0.2', uniqueEmail('outra'))).status).toBe(401);
    expect((await login('10.0.0.3', email)).status).toBe(401);
  });

  it('limita pedidos de nova senha', async () => {
    const email = uniqueEmail('reset');
    const ask = () => request(app).post('/auth/password-resets').set(fromIp('10.0.0.4')).send({ email });
    for (let i = 0; i < 3; i++) expect((await ask()).status).toBe(202);
    expect((await ask()).status).toBe(429);
  });

  it('limita cadastros vindos do mesmo IP', async () => {
    const signup = () =>
      request(app)
        .post('/auth/signup')
        .set(fromIp('10.0.0.5'))
        .send({ companyName: 'Empresa', cnpj: validCnpj(), name: 'Ana', email: uniqueEmail('ana'), password: 'senha-forte-123' });
    for (let i = 0; i < 3; i++) expect((await signup()).status).toBe(201);
    expect((await signup()).status).toBe(429);
  });

  it('limita tentativas com tokens de convite e de nova senha', async () => {
    for (let i = 0; i < 3; i++) {
      expect((await request(app).get(`/invites/token/token-${i}`).set(fromIp('10.0.0.6'))).status).toBe(404);
    }
    expect((await request(app).get('/auth/password-resets/qualquer').set(fromIp('10.0.0.6'))).status).toBe(429);
    expect((await request(app).post('/invites/token/x/accept').set(fromIp('10.0.0.6')).send({})).status).toBe(429);
  });

  it('não expõe a tecnologia do servidor', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
