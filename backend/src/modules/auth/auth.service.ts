import type pg from 'pg';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../http/errors.js';
import { CompanyRepository, type Company } from '../companies/company.repository.js';
import type { MediaService } from '../media/media.service.js';
import { UserRepository, withoutPassword, type User } from '../users/user.repository.js';
import { hashPassword, verifyPassword } from './password.js';
import type { TokenService } from './token.js';

export interface SignupInput {
  companyName: string;
  cnpj: string;
  name: string;
  email: string;
  password: string;
}

export interface AccountDeletion {
  deletesCompany: boolean;
  otherMembers: number;
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
    private readonly media?: MediaService,
  ) {}

  async signup(input: SignupInput): Promise<{ token: string; user: User; company: Company }> {
    const passwordHash = await hashPassword(input.password);

    try {
      const { user, company } = await withTransaction(this.pool, async (client) => {
        const company = await new CompanyRepository(client).create(input.companyName, input.cnpj);
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
      const { code, constraint } = error as { code?: string; constraint?: string };
      if (code === UNIQUE_VIOLATION && constraint === 'companies_cnpj_unique') {
        throw new AppError(409, 'cnpj_already_registered', 'Já existe uma empresa cadastrada com este CNPJ.');
      }
      if (code === UNIQUE_VIOLATION) {
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
    const user = await this.currentUser(userId);
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

  async accountDeletion(userId: string): Promise<AccountDeletion> {
    const user = await this.currentUser(userId);
    const users = new UserRepository(this.pool);
    const deletesCompany = user.role === 'master' && (await users.countMasters(user.companyId)) <= 1;
    return { deletesCompany, otherMembers: await users.countOthers(user.companyId, user.id) };
  }

  async deleteAccount(userId: string, password: string, deleteCompany: boolean): Promise<void> {
    const found = await new UserRepository(this.pool).findByIdWithPassword(userId);
    if (!found || !(await verifyPassword(password, found.passwordHash))) {
      throw new AppError(400, 'wrong_password', 'A senha está incorreta.');
    }
    const { deletesCompany } = await this.accountDeletion(userId);
    if (!deletesCompany) {
      await new UserRepository(this.pool).delete(found.companyId, found.id);
      return;
    }
    if (!deleteCompany) {
      throw new AppError(
        409,
        'company_deletion_required',
        'Você é o único master. Promova outra pessoa a master ou exclua a empresa junto com a sua conta.',
      );
    }
    const keys = (await this.media?.keysOf(found.companyId)) ?? [];
    await withTransaction(this.pool, (client) => new CompanyRepository(client).delete(found.companyId));
    await this.media?.discard(keys);
  }

  private async currentUser(userId: string): Promise<User> {
    const user = await new UserRepository(this.pool).findById(userId);
    if (!user) {
      throw new AppError(401, 'unauthorized', 'Sessão inválida ou expirada.');
    }
    return user;
  }

  private issueToken(user: User): string {
    return this.tokens.sign({ sub: user.id, companyId: user.companyId, role: user.role, ver: user.sessionVersion });
  }
}
