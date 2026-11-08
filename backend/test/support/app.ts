import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp, type AppDependencies } from '../../src/app.js';
import type { MailMessage, Mailer } from '../../src/modules/mail/mailer.js';
import { createTestPool } from './db.js';

export const TEST_JWT_SECRET = 'segredo-dos-testes';

export class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  failNext = false;

  async send(message: MailMessage): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SMTP indisponível');
    }
    this.sent.push(message);
  }

  lastTo(to: string): MailMessage | undefined {
    return this.sent.filter((message) => message.to === to).at(-1);
  }
}

export function createTestApp(options: Pick<AppDependencies, 'storage' | 'mediaLimits'> = {}) {
  const pool = createTestPool();
  const mailer = new MemoryMailer();
  const app = createApp({ pool, jwtSecret: TEST_JWT_SECRET, appUrl: 'http://app.teste', mailer, rateLimits: false, ...options });
  return { app, pool, mailer };
}

const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function checkDigit(base: string): number {
  const weights = CNPJ_WEIGHTS.slice(CNPJ_WEIGHTS.length - base.length);
  const sum = [...base].reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index]!, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function validCnpj(base = `${Math.floor(Math.random() * 1e8)}`.padStart(8, '0') + '0001'): string {
  const first = checkDigit(base);
  return `${base}${first}${checkDigit(`${base}${first}`)}`;
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
    delete: (path: string, body?: object) => request(app).delete(path).set(auth).send(body),
  };
}

export async function newCompany(app: App, companyName = 'Empresa Teste') {
  const res = await request(app)
    .post('/auth/signup')
    .send({ companyName, cnpj: validCnpj(), name: 'Maria Master', email: uniqueEmail('master'), password: 'senha-forte-123' });
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
