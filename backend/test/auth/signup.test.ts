import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

const signup = (body: object) => request(app).post('/auth/signup').send(body);

describe('POST /auth/signup (H01)', () => {
  it('cria a empresa e o usuário master, já devolvendo o token de acesso', async () => {
    const email = uniqueEmail('ana');
    const res = await signup({ companyName: 'Padaria da Ana', name: 'Ana Souza', email, password: 'senha-forte-123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Ana Souza', email, role: 'master' });
    expect(res.body.company.name).toBe('Padaria da Ana');
  });

  it('não devolve a senha nem o hash da senha', async () => {
    const res = await signup({ companyName: 'Empresa', name: 'Pessoa', email: uniqueEmail(), password: 'senha-forte-123' });

    expect(JSON.stringify(res.body)).not.toMatch(/senha-forte-123|password/i);
  });

  it('guarda o e-mail em minúsculas', async () => {
    const email = uniqueEmail('maiusculas');
    const res = await signup({ companyName: 'Empresa', name: 'Pessoa', email: email.toUpperCase(), password: 'senha-forte-123' });

    expect(res.body.user.email).toBe(email);
  });

  it('recusa e-mail já cadastrado, mesmo com letras maiúsculas', async () => {
    const email = uniqueEmail('repetido');
    await signup({ companyName: 'Primeira', name: 'Pessoa', email, password: 'senha-forte-123' });

    const res = await signup({ companyName: 'Segunda', name: 'Pessoa', email: email.toUpperCase(), password: 'senha-forte-123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('email_already_registered');
  });

  it('não deixa empresa sem dono quando o cadastro falha', async () => {
    const email = uniqueEmail('orfa');
    await signup({ companyName: 'Original', name: 'Pessoa', email, password: 'senha-forte-123' });

    await signup({ companyName: 'Empresa Que Nao Deve Existir', name: 'Pessoa', email, password: 'senha-forte-123' });

    const { rowCount } = await pool.query("select 1 from companies where name = 'Empresa Que Nao Deve Existir'");
    expect(rowCount).toBe(0);
  });

  it('valida os campos e explica cada problema', async () => {
    const res = await signup({ companyName: 'A', name: '', email: 'nao-e-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(
      ['companyName', 'email', 'name', 'password'],
    );
  });

  it('responde 400 quando o corpo não é um JSON válido', async () => {
    const res = await request(app).post('/auth/signup').set('Content-Type', 'application/json').send('{ quebrado');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
  });
});
