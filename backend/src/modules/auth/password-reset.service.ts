import { createHash, randomBytes } from 'node:crypto';
import type pg from 'pg';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../http/errors.js';
import type { Mailer } from '../mail/mailer.js';
import { UserRepository, type User } from '../users/user.repository.js';
import { hashPassword } from './password.js';
import { PasswordResetRepository, type PasswordReset } from './password-reset.repository.js';
import type { TokenService } from './token.js';

const VALID_MINUTES = 60;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function ensureUsable(reset: PasswordReset | null): PasswordReset {
  if (!reset) throw new AppError(404, 'reset_not_found', 'Este link de redefinição não existe.');
  if (reset.usedAt) throw new AppError(410, 'reset_used', 'Este link já foi usado. Peça um novo.');
  if (reset.expiresAt.getTime() <= Date.now()) {
    throw new AppError(410, 'reset_expired', 'Este link expirou. Peça um novo.');
  }
  return reset;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function resetEmail(name: string, link: string) {
  const firstName = name.split(' ')[0] ?? name;
  const text = [
    `Olá, ${firstName}!`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta no OnboardHub.',
    `Para criar uma nova senha, acesse o link abaixo. Ele vale por ${VALID_MINUTES} minutos e só pode ser usado uma vez.`,
    '',
    link,
    '',
    'Se não foi você, ignore este e-mail. Sua senha atual continua valendo.',
  ].join('\n');

  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#0a0a0a;font-size:15px;line-height:1.6;max-width:480px">
<p>Olá, ${escapeHtml(firstName)}!</p>
<p>Recebemos um pedido para redefinir a senha da sua conta no OnboardHub.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#0a0a0a;color:#ffffff;text-decoration:none;font-weight:600">Criar nova senha</a></p>
<p style="color:#5c5c5c;font-size:13px">O link vale por ${VALID_MINUTES} minutos e só pode ser usado uma vez. Se não foi você, ignore este e-mail.</p>
</div>`;

  return { subject: 'Redefina sua senha do OnboardHub', text, html };
}

export class PasswordResetService {
  constructor(
    private readonly pool: pg.Pool,
    private readonly tokens: TokenService,
    private readonly mailer: Mailer,
    private readonly appUrl: string,
  ) {}

  async request(email: string): Promise<void> {
    const user = await new UserRepository(this.pool).findByEmail(email);
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    await withTransaction(this.pool, async (client) => {
      const resets = new PasswordResetRepository(client);
      await resets.invalidatePending(user.id);
      await resets.create(user.id, hashToken(token), new Date(Date.now() + VALID_MINUTES * 60 * 1000));
    });

    const link = `${this.appUrl.replace(/\/$/, '')}/redefinir-senha/${token}`;
    try {
      await this.mailer.send({ to: user.email, ...resetEmail(user.name, link) });
    } catch (error) {
      console.error('Falha ao enviar o e-mail de redefinição de senha', error);
    }
  }

  async preview(token: string): Promise<{ email: string }> {
    const reset = ensureUsable(await new PasswordResetRepository(this.pool).findByTokenHash(hashToken(token)));
    const user = await new UserRepository(this.pool).findById(reset.userId);
    return { email: user!.email };
  }

  async reset(token: string, password: string): Promise<{ token: string; user: User }> {
    const passwordHash = await hashPassword(password);
    const user = await withTransaction(this.pool, async (client) => {
      const resets = new PasswordResetRepository(client);
      const reset = ensureUsable(await resets.findByTokenHash(hashToken(token), { lock: true }));
      await resets.markUsed(reset.id);
      return new UserRepository(client).changePassword(reset.userId, passwordHash);
    });
    const sessionToken = this.tokens.sign({
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      ver: user.sessionVersion,
    });
    return { token: sessionToken, user };
  }
}
