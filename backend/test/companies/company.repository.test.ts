import { afterAll, describe, expect, it } from 'vitest';
import { CompanyRepository } from '../../src/modules/companies/company.repository.js';
import { createTestPool } from '../support/db.js';

const pool = createTestPool();
const companies = new CompanyRepository(pool);
afterAll(() => pool.end());

describe('CompanyRepository', () => {
  it('cria uma empresa e devolve o id gerado pelo banco', async () => {
    const company = await companies.create('Padaria da Ana');

    expect(company.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(company.name).toBe('Padaria da Ana');
    expect(company.createdAt).toBeInstanceOf(Date);
  });

  it('remove espaços sobrando no começo e no fim do nome', async () => {
    const company = await companies.create('   Oficina do Zé   ');
    expect(company.name).toBe('Oficina do Zé');
  });

  it('não aceita nome com menos de 2 caracteres (regra garantida pelo banco)', async () => {
    await expect(companies.create(' A ')).rejects.toMatchObject({ code: '23514' });
  });

  it('encontra a empresa pelo id', async () => {
    const created = await companies.create('Mercado Central');
    const found = await companies.findById(created.id);

    expect(found).toEqual(created);
  });

  it('devolve null quando a empresa não existe', async () => {
    const found = await companies.findById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });
});
