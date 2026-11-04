import type { Queryable } from '../../db/pool.js';

export interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  createdAt: Date;
}

interface CompanyRow {
  id: string;
  name: string;
  cnpj: string | null;
  created_at: Date;
}

const toCompany = (row: CompanyRow): Company => ({
  id: row.id,
  name: row.name,
  cnpj: row.cnpj,
  createdAt: row.created_at,
});

export class CompanyRepository {
  constructor(private readonly db: Queryable) {}

  async create(name: string, cnpj: string): Promise<Company> {
    const { rows } = await this.db.query<CompanyRow>(
      'insert into companies (name, cnpj) values ($1, $2) returning id, name, cnpj, created_at',
      [name.trim(), cnpj],
    );
    return toCompany(rows[0]!);
  }

  async findById(id: string): Promise<Company | null> {
    const { rows } = await this.db.query<CompanyRow>(
      'select id, name, cnpj, created_at from companies where id = $1',
      [id],
    );
    return rows[0] ? toCompany(rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.query('delete from trails where company_id = $1', [id]);
    await this.db.query('delete from companies where id = $1', [id]);
  }
}
