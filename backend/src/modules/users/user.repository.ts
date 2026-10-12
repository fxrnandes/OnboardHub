import type { Queryable } from '../../db/pool.js';

export type Role = 'master' | 'gestor' | 'colaborador';

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
  jobRoleId: string | null;
  createdAt: Date;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface NewUser {
  companyId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  jobRoleId?: string | null;
}

export interface MemberChanges {
  role?: Role;
  jobRoleId?: string | null;
}

interface UserRow {
  id: string;
  company_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  job_role_id: string | null;
  created_at: Date;
}

const columns = 'id, company_id, name, email, password_hash, role, job_role_id, created_at';

const toUser = (row: UserRow): UserWithPassword => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  email: row.email,
  role: row.role,
  jobRoleId: row.job_role_id,
  createdAt: row.created_at,
  passwordHash: row.password_hash,
});

export const withoutPassword = ({ passwordHash: _, ...user }: UserWithPassword): User => user;

export class UserRepository {
  constructor(private readonly db: Queryable) {}

  async create(data: NewUser): Promise<User> {
    const { rows } = await this.db.query<UserRow>(
      `insert into users (company_id, name, email, password_hash, role, job_role_id)
       values ($1, $2, $3, $4, $5, $6)
       returning ${columns}`,
      [
        data.companyId,
        data.name.trim(),
        data.email.trim().toLowerCase(),
        data.passwordHash,
        data.role,
        data.jobRoleId ?? null,
      ],
    );
    return withoutPassword(toUser(rows[0]!));
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const { rows } = await this.db.query<UserRow>(
      `select ${columns} from users where lower(email) = lower($1)`,
      [email.trim()],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>(`select ${columns} from users where id = $1`, [id]);
    return rows[0] ? withoutPassword(toUser(rows[0])) : null;
  }

  async findInCompany(companyId: string, id: string): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>(
      `select ${columns} from users where company_id = $1 and id = $2`,
      [companyId, id],
    );
    return rows[0] ? withoutPassword(toUser(rows[0])) : null;
  }

  async listByCompany(companyId: string): Promise<User[]> {
    const { rows } = await this.db.query<UserRow>(
      `select ${columns} from users where company_id = $1 order by lower(name)`,
      [companyId],
    );
    return rows.map((row) => withoutPassword(toUser(row)));
  }

  async countMasters(companyId: string): Promise<number> {
    const { rows } = await this.db.query<{ total: number }>(
      "select count(*)::int as total from users where company_id = $1 and role = 'master'",
      [companyId],
    );
    return rows[0]!.total;
  }

  async update(companyId: string, id: string, changes: MemberChanges): Promise<User> {
    const { rows } = await this.db.query<UserRow>(
      `update users set
         role = coalesce($3, role),
         job_role_id = case when $4::boolean then $5::uuid else job_role_id end
       where company_id = $1 and id = $2
       returning ${columns}`,
      [companyId, id, changes.role ?? null, changes.jobRoleId !== undefined, changes.jobRoleId ?? null],
    );
    return withoutPassword(toUser(rows[0]!));
  }

  async delete(companyId: string, id: string): Promise<void> {
    await this.db.query('delete from users where company_id = $1 and id = $2', [companyId, id]);
  }
}
