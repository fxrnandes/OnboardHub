import type { Queryable } from '../../db/pool.js';

export interface JobRole {
  id: string;
  name: string;
  memberCount: number;
  createdAt: Date;
}

interface JobRoleRow {
  id: string;
  name: string;
  member_count: number;
  created_at: Date;
}

const toJobRole = (row: JobRoleRow): JobRole => ({
  id: row.id,
  name: row.name,
  memberCount: row.member_count,
  createdAt: row.created_at,
});

const select = `
  select jr.id, jr.name, jr.created_at,
         (select count(*)::int from users u where u.job_role_id = jr.id) as member_count
  from job_roles jr`;

export class JobRoleRepository {
  constructor(private readonly db: Queryable) {}

  async list(companyId: string): Promise<JobRole[]> {
    const { rows } = await this.db.query<JobRoleRow>(
      `${select} where jr.company_id = $1 order by lower(jr.name)`,
      [companyId],
    );
    return rows.map(toJobRole);
  }

  async find(companyId: string, id: string): Promise<JobRole | null> {
    const { rows } = await this.db.query<JobRoleRow>(`${select} where jr.company_id = $1 and jr.id = $2`, [
      companyId,
      id,
    ]);
    return rows[0] ? toJobRole(rows[0]) : null;
  }

  async create(companyId: string, name: string): Promise<JobRole> {
    const { rows } = await this.db.query<{ id: string }>(
      'insert into job_roles (company_id, name) values ($1, $2) returning id',
      [companyId, name.trim()],
    );
    return (await this.find(companyId, rows[0]!.id))!;
  }

  async rename(companyId: string, id: string, name: string): Promise<JobRole | null> {
    const { rowCount } = await this.db.query('update job_roles set name = $3 where company_id = $1 and id = $2', [
      companyId,
      id,
      name.trim(),
    ]);
    return rowCount ? this.find(companyId, id) : null;
  }

  async delete(companyId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('delete from job_roles where company_id = $1 and id = $2', [
      companyId,
      id,
    ]);
    return rowCount === 1;
  }
}
