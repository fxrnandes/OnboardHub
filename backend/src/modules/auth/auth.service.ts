import type pg from 'pg';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../http/errors.js';
import { CompanyRepository, type Company } from '../companies/company.repository.js';
import { UserRepository, withoutPassword, type User } from '../users/user.repository.js';
import { hashPassword, verifyPassword } from './password.js';
import type { TokenService } from './token.js';

export interface SignupInput {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

const UNIQUE_VIOLATION = '23505';

export class AuthService {
  constructor(
    private readonly pool: pg.Pool,
    private readonly tokens: TokenService,
  ) {}

  async signup(input: SignupInput): Promise<{ token: string; user: User; company: Company }> {
    const passwordHash = await hashPassword(input.password);

    try {
      const { user, company } = await withTransaction(this.pool, async (client) => {
        const company = await new CompanyRepository(client).create(input.companyName);
        const user = await new UserRepository(client).create({
          companyId: company.id,
          name: input.name,
          email: input.email,
          passwordHash,
          role: 'master',
        });
        return { user, company };
      });
      return { token: this.issueToken(user), user, company };
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new AppError(409, 'email_already_registered', 'Já existe uma conta com este e-mail.');
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<{ token: string; user: User }> {
    const found = await new UserRepository(this.pool).findByEmail(input.email);
    if (!found || !(await verifyPassword(input.password, found.passwordHash))) {
      throw new AppError(401, 'invalid_credentials', 'E-mail ou senha incorretos.');
    }
    const user = withoutPassword(found);
    return { token: this.issueToken(user), user };
  }

  async me(userId: string): Promise<{ user: User; company: Company }> {
    const user = await new UserRepository(this.pool).findById(userId);
    if (!user) {
      throw new AppError(401, 'unauthorized', 'Sessão inválida ou expirada.');
    }
    const company = (await new CompanyRepository(this.pool).findById(user.companyId))!;
    return { user, company };
  }

  async rename(userId: string, name: string): Promise<User> {
    return new UserRepository(this.pool).rename(userId, name);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<string> {
    const users = new UserRepository(this.pool);
    const found = await users.findByIdWithPassword(userId);
    if (!found || !(await verifyPassword(currentPassword, found.passwordHash))) {
      throw new AppError(400, 'wrong_password', 'A senha atual está incorreta.');
    }
    if (currentPassword === newPassword) {
      throw new AppError(400, 'same_password', 'A nova senha precisa ser diferente da atual.');
    }
    const user = await users.changePassword(userId, await hashPassword(newPassword));
    return this.issueToken(user);
  }

  private issueToken(user: User): string {
    return this.tokens.sign({ sub: user.id, companyId: user.companyId, role: user.role, ver: user.sessionVersion });
  }
}
