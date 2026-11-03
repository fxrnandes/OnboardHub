import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail, validCnpj } from '../support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

const signup = (body: object) => request(app).post('/auth/signup').send({ cnpj: validCnpj(), ...body });

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

  it('guarda o CNPJ só com letras e números, aceitando a máscara', async () => {
    const cnpj = validCnpj();
    const masked = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
    const res = await signup({ companyName: 'Com Máscara', cnpj: masked, name: 'Pessoa', email: uniqueEmail(), password: 'senha-forte-123' });

    expect(res.status).toBe(201);
    expect(res.body.company.cnpj).toBe(cnpj);
  });

  it('aceita o CNPJ alfanumérico', async () => {
    const cnpj = validCnpj(`${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X')}BC${`${Date.now()}`.slice(-6)}`);
    const res = await signup({ companyName: 'Nova Empresa', cnpj: cnpj.toLowerCase(), name: 'Pessoa', email: uniqueEmail(), password: 'senha-forte-123' });

    expect(res.status).toBe(201);
    expect(res.body.company.cnpj).toBe(cnpj);
  });

  it.each([
    ['ausente', undefined, 'Informe o CNPJ da empresa.'],
    ['vazio', ' ', 'Informe o CNPJ da empresa.'],
    ['com dígito errado', '11222333000182', 'CNPJ inválido.'],
    ['curto', '1122233300018', 'CNPJ inválido.'],
    ['com todos iguais', '00000000000000', 'CNPJ inválido.'],
  ])('recusa CNPJ %s', async (_caso, cnpj, message) => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ companyName: 'Empresa', cnpj, name: 'Pessoa', email: uniqueEmail(), password: 'senha-forte-123' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'cnpj', message }]);
  });

  it('recusa CNPJ que já tem empresa cadastrada', async () => {
    const cnpj = validCnpj();
    await signup({ companyName: 'Primeira', cnpj, name: 'Pessoa', email: uniqueEmail(), password: 'senha-forte-123' });

    const res = await signup({ companyName: 'Segunda', cnpj, name: 'Outra', email: uniqueEmail(), password: 'senha-forte-123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('cnpj_already_registered');
  });

  it('responde 400 quando o corpo não é um JSON válido', async () => {
    const res = await request(app).post('/auth/signup').set('Content-Type', 'application/json').send('{ quebrado');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
  });
});
