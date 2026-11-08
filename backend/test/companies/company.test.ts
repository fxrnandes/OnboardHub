import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { addMember, createTestApp, newCompany } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

describe('dados da empresa', () => {
  it('qualquer pessoa da empresa vê nome e CNPJ', async () => {
    const { master } = await newCompany(app, 'Padaria Central');
    const { member } = await addMember(app, master, 'gestor');

    const res = await member.get('/company');

    expect(res.status).toBe(200);
    expect(res.body.company.name).toBe('Padaria Central');
    expect(res.body.company.cnpj).toMatch(/^\d{14}$/);
  });

  it('o master corrige o nome da empresa', async () => {
    const { master } = await newCompany(app, 'Catolica SC');

    const res = await master.patch('/company', { name: '  Católica SC (exemplo) ' });

    expect(res.status).toBe(200);
    expect(res.body.company.name).toBe('Católica SC (exemplo)');
    expect((await master.get('/auth/me')).body.company.name).toBe('Católica SC (exemplo)');
  });

  it('valida o nome', async () => {
    const { master } = await newCompany(app);
    const res = await master.patch('/company', { name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('name');
  });

  it('só o master altera, e só a própria empresa', async () => {
    const { master } = await newCompany(app, 'Empresa A');
    const other = await newCompany(app, 'Empresa B');
    const { member } = await addMember(app, master, 'gestor');

    expect((await member.patch('/company', { name: 'Outro nome' })).status).toBe(403);
    await other.master.patch('/company', { name: 'Empresa B renomeada' });
    expect((await master.get('/company')).body.company.name).toBe('Empresa A');
    expect((await request(app).get('/company')).status).toBe(401);
  });
});
