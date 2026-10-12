import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createTestPool } from './db.js';

export const TEST_JWT_SECRET = 'segredo-dos-testes';

export function createTestApp() {
  const pool = createTestPool();
  const app = createApp({ pool, jwtSecret: TEST_JWT_SECRET, appUrl: 'http://app.teste' });
  return { app, pool };
}

export const uniqueEmail = (prefix = 'pessoa') => `${prefix}-${randomUUID().slice(0, 8)}@teste.com`;

type App = ReturnType<typeof createTestApp>['app'];

export function client(app: App, token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  return {
    get: (path: string) => request(app).get(path).set(auth),
    post: (path: string, body: object = {}) => request(app).post(path).set(auth).send(body),
    patch: (path: string, body: object) => request(app).patch(path).set(auth).send(body),
    put: (path: string, body: object) => request(app).put(path).set(auth).send(body),
    delete: (path: string) => request(app).delete(path).set(auth),
  };
}

export async function newCompany(app: App, companyName = 'Empresa Teste') {
  const res = await request(app)
    .post('/auth/signup')
    .send({ companyName, name: 'Maria Master', email: uniqueEmail('master'), password: 'senha-forte-123' });
  return { master: client(app, res.body.token), masterId: res.body.user.id as string, companyId: res.body.company.id as string };
}

export async function addMember(
  app: App,
  master: ReturnType<typeof client>,
  role: 'gestor' | 'colaborador',
  jobRoleId: string | null = null,
) {
  const email = uniqueEmail(role);
  const invite = await master.post('/invites', { email, role, jobRoleId });
  const token = invite.body.link.split('/convite/')[1];
  const accepted = await request(app)
    .post(`/invites/token/${token}/accept`)
    .send({ name: `Pessoa ${role}`, password: 'senha-forte-123' });
  return { member: client(app, accepted.body.token), memberId: accepted.body.user.id as string, email };
}
