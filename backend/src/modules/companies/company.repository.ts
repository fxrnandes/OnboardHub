import type { Queryable } from '../../db/pool.js';

export interface Company {
  id: string;
  name: string;
  createdAt: Date;
}

interface CompanyRow {
  id: string;
  name: string;
  created_at: Date;
}

const toCompany = (row: CompanyRow): Company => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
});

export class CompanyRepository {
  constructor(private readonly db: Queryable) {}

  async create(name: string): Promise<Company> {
    const { rows } = await this.db.query<CompanyRow>(
      'insert into companies (name) values ($1) returning id, name, created_at',
      [name.trim()],
    );
    return toCompany(rows[0]!);
  }

  async findById(id: string): Promise<Company | null> {
    const { rows } = await this.db.query<CompanyRow>(
      'select id, name, created_at from companies where id = $1',
      [id],
    );
    return rows[0] ? toCompany(rows[0]) : null;
  }
}
