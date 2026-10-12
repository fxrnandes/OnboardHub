import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenService } from '../../src/modules/auth/token.js';
import { createTestApp, TEST_JWT_SECRET, uniqueEmail } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

let token: string;

beforeAll(async () => {
  const res = await request(app)
    .post('/auth/signup')
    .send({ companyName: 'Mercado Central', name: 'Bia', email: uniqueEmail('bia'), password: 'senha-forte-123' });
  token = res.body.token;
});

describe('GET /auth/me', () => {
  it('devolve o usuário e a empresa de quem está logado', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Bia', role: 'master' });
    expect(res.body.company.name).toBe('Mercado Central');
  });

  it('exige login', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Faça login para continuar.');
  });

  it('recusa token inválido', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer token-falso');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Sessão inválida ou expirada.');
  });

  it('recusa token de usuário que não existe mais', async () => {
    const orphan = new TokenService(TEST_JWT_SECRET).sign({
      sub: '00000000-0000-0000-0000-000000000000',
      companyId: '00000000-0000-0000-0000-000000000000',
      role: 'master',
    });

    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${orphan}`);

    expect(res.status).toBe(401);
  });
});
