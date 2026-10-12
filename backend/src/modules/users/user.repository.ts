import type { Queryable } from '../../db/pool.js';

export type Role = 'master' | 'gestor' | 'colaborador';

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
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
}

interface UserRow {
  id: string;
  company_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: Date;
}

const columns = 'id, company_id, name, email, password_hash, role, created_at';

const toUser = (row: UserRow): UserWithPassword => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
  passwordHash: row.password_hash,
});

export const withoutPassword = ({ passwordHash: _, ...user }: UserWithPassword): User => user;

export class UserRepository {
  constructor(private readonly db: Queryable) {}

  async create(data: NewUser): Promise<User> {
    const { rows } = await this.db.query<UserRow>(
      `insert into users (company_id, name, email, password_hash, role)
       values ($1, $2, $3, $4, $5)
       returning ${columns}`,
      [data.companyId, data.name.trim(), data.email.trim().toLowerCase(), data.passwordHash, data.role],
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
}
