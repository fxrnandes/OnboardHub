import type pg from 'pg';

type Queryable = pg.Pool | pg.PoolClient;

export interface PasswordReset {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

interface PasswordResetRow {
  id: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
}

const toReset = (row: PasswordResetRow): PasswordReset => ({
  id: row.id,
  userId: row.user_id,
  expiresAt: row.expires_at,
  usedAt: row.used_at,
});

export class PasswordResetRepository {
  constructor(private readonly db: Queryable) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.query('insert into password_resets (user_id, token_hash, expires_at) values ($1, $2, $3)', [
      userId,
      tokenHash,
      expiresAt,
    ]);
  }

  async invalidatePending(userId: string): Promise<void> {
    await this.db.query('update password_resets set used_at = now() where user_id = $1 and used_at is null', [userId]);
  }

  async findByTokenHash(tokenHash: string, { lock = false } = {}): Promise<PasswordReset | null> {
    const { rows } = await this.db.query<PasswordResetRow>(
      `select id, user_id, expires_at, used_at from password_resets where token_hash = $1${lock ? ' for update' : ''}`,
      [tokenHash],
    );
    return rows[0] ? toReset(rows[0]) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.db.query('update password_resets set used_at = now() where id = $1', [id]);
  }
}
