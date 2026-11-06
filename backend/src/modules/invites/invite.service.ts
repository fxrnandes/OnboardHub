import { createHash, randomBytes } from 'node:crypto';
import type pg from 'pg';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../http/errors.js';
import { hashPassword } from '../auth/password.js';
import type { TokenService } from '../auth/token.js';
import { JobRoleRepository } from '../job-roles/job-role.repository.js';
import type { Mailer } from '../mail/mailer.js';
import { UserRepository, type User } from '../users/user.repository.js';
import { inviteEmail } from './invite-email.js';
import { InviteRepository, type Invite, type InviteRole } from './invite.repository.js';

const VALID_DAYS = 7;
const UNIQUE_VIOLATION = '23505';

export interface CreateInviteInput {
  companyId: string;
  createdBy: string;
  email?: string | null;
  role: InviteRole;
  jobRoleId?: string | null;
}

export interface AcceptInviteInput {
  name: string;
  email?: string;
  password: string;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function ensureUsable(invite: Invite | null): Invite {
  if (!invite) throw new AppError(404, 'not_found', 'Convite não encontrado.');
  const problems: Record<Exclude<Invite['status'], 'pending'>, string> = {
    accepted: 'Este convite já foi utilizado.',
    revoked: 'Este convite foi cancelado.',
    expired: 'Este convite expirou.',
  };
  if (invite.status !== 'pending') {
    throw new AppError(410, `invite_${invite.status}`, problems[invite.status]);
  }
  return invite;
}

export class InviteService {
  constructor(
    private readonly pool: pg.Pool,
    private readonly tokens: TokenService,
    private readonly appUrl: string,
    private readonly mailer: Mailer,
  ) {}

  async create(input: CreateInviteInput): Promise<{ invite: Invite; link: string; emailSent: boolean }> {
    if (input.jobRoleId && !(await new JobRoleRepository(this.pool).find(input.companyId, input.jobRoleId))) {
      throw new AppError(400, 'job_role_not_found', 'Cargo não encontrado.');
    }

    const token = randomBytes(32).toString('base64url');
    const invite = await new InviteRepository(this.pool).create({
      companyId: input.companyId,
      tokenHash: hashToken(token),
      email: input.email?.trim().toLowerCase() || null,
      role: input.role,
      jobRoleId: input.jobRoleId ?? null,
      createdBy: input.createdBy,
      expiresAt: new Date(Date.now() + VALID_DAYS * 24 * 60 * 60 * 1000),
    });

    const link = `${this.appUrl.replace(/\/$/, '')}/convite/${token}`;
    return { invite, link, emailSent: await this.sendEmail(invite, input.createdBy, link) };
  }

  private async sendEmail(invite: Invite, inviterId: string, link: string): Promise<boolean> {
    if (!invite.email) return false;
    try {
      const inviter = await new UserRepository(this.pool).findById(inviterId);
      await this.mailer.send({ to: invite.email, ...inviteEmail(invite, inviter?.name ?? null, link, VALID_DAYS) });
      return true;
    } catch (error) {
      console.error('Falha ao enviar o e-mail de convite', error);
      return false;
    }
  }

  async preview(token: string): Promise<Invite> {
    return ensureUsable(await new InviteRepository(this.pool).findByTokenHash(hashToken(token)));
  }

  async accept(token: string, input: AcceptInviteInput): Promise<{ token: string; user: User }> {
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await withTransaction(this.pool, async (client) => {
        const invites = new InviteRepository(client);
        const invite = ensureUsable(await invites.findByTokenHash(hashToken(token), { lock: true }));

        const email = invite.email ?? input.email;
        if (!email) throw new AppError(400, 'email_required', 'Informe seu e-mail.');

        const user = await new UserRepository(client).create({
          companyId: invite.companyId,
          name: input.name,
          email,
          passwordHash,
          role: invite.role,
          jobRoleId: invite.jobRoleId,
        });
        await invites.markAccepted(invite.id, user.id);
        return user;
      });

      return {
        token: this.tokens.sign({ sub: user.id, companyId: user.companyId, role: user.role }),
        user,
      };
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new AppError(409, 'email_already_registered', 'Já existe uma conta com este e-mail.');
      }
      throw error;
    }
  }
}
