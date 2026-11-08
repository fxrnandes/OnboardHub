import type { Queryable } from '../../db/pool.js';

export type InviteRole = 'gestor' | 'colaborador';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invite {
  id: string;
  companyId: string;
  companyName: string;
  email: string | null;
  role: InviteRole;
  jobRoleId: string | null;
  jobRoleName: string | null;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  acceptedByName: string | null;
}

export interface NewInvite {
  companyId: string;
  tokenHash: string;
  email: string | null;
  role: InviteRole;
  jobRoleId: string | null;
  createdBy: string;
  expiresAt: Date;
}

interface InviteRow {
  id: string;
  company_id: string;
  company_name: string;
  email: string | null;
  role: InviteRole;
  job_role_id: string | null;
  job_role_name: string | null;
  status: InviteStatus;
  expires_at: Date;
  created_at: Date;
  accepted_at: Date | null;
  accepted_by_name: string | null;
}

const toInvite = (row: InviteRow): Invite => ({
  id: row.id,
  companyId: row.company_id,
  companyName: row.company_name,
  email: row.email,
  role: row.role,
  jobRoleId: row.job_role_id,
  jobRoleName: row.job_role_name,
  status: row.status,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  acceptedAt: row.accepted_at,
  acceptedByName: row.accepted_by_name,
});

const select = `
  select i.id, i.company_id, c.name as company_name, i.email, i.role, i.job_role_id,
         jr.name as job_role_name, i.expires_at, i.created_at, i.accepted_at, ua.name as accepted_by_name,
         case
           when i.accepted_at is not null then 'accepted'
           when i.revoked_at is not null then 'revoked'
           when i.expires_at <= now() then 'expired'
           else 'pending'
         end as status
  from invites i
  join companies c on c.id = i.company_id
  left join job_roles jr on jr.id = i.job_role_id
  left join users ua on ua.id = i.accepted_by`;

export class InviteRepository {
  constructor(private readonly db: Queryable) {}

  async create(data: NewInvite): Promise<Invite> {
    const { rows } = await this.db.query<{ id: string }>(
      `insert into invites (company_id, token_hash, email, role, job_role_id, created_by, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [data.companyId, data.tokenHash, data.email, data.role, data.jobRoleId, data.createdBy, data.expiresAt],
    );
    return (await this.findInCompany(data.companyId, rows[0]!.id))!;
  }

  async findInCompany(companyId: string, id: string): Promise<Invite | null> {
    const { rows } = await this.db.query<InviteRow>(`${select} where i.company_id = $1 and i.id = $2`, [companyId, id]);
    return rows[0] ? toInvite(rows[0]) : null;
  }

  async list(companyId: string): Promise<Invite[]> {
    const { rows } = await this.db.query<InviteRow>(`${select} where i.company_id = $1 order by i.created_at desc`, [
      companyId,
    ]);
    return rows.map(toInvite);
  }

  async findByTokenHash(tokenHash: string, options: { lock?: boolean } = {}): Promise<Invite | null> {
    const { rows } = await this.db.query<InviteRow>(
      `${select} where i.token_hash = $1 ${options.lock ? 'for update of i' : ''}`,
      [tokenHash],
    );
    return rows[0] ? toInvite(rows[0]) : null;
  }

  async revoke(companyId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `update invites set revoked_at = now()
       where company_id = $1 and id = $2 and accepted_at is null and revoked_at is null`,
      [companyId, id],
    );
    return rowCount === 1;
  }

  async hasPendingFor(companyId: string, email: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `select 1 from invites
       where company_id = $1 and email = $2 and accepted_at is null and revoked_at is null and expires_at > now()`,
      [companyId, email],
    );
    return (rowCount ?? 0) > 0;
  }

  async renew(companyId: string, id: string, tokenHash: string, expiresAt: Date): Promise<Invite | null> {
    const { rowCount } = await this.db.query(
      `update invites set token_hash = $3, expires_at = $4
       where company_id = $1 and id = $2 and accepted_at is null and revoked_at is null`,
      [companyId, id, tokenHash, expiresAt],
    );
    return rowCount === 1 ? this.findInCompany(companyId, id) : null;
  }

  async markAccepted(id: string, userId: string): Promise<void> {
    await this.db.query('update invites set accepted_at = now(), accepted_by = $2 where id = $1', [id, userId]);
  }
}
