import type { RequestHandler } from 'express';
import type { Queryable } from '../db/pool.js';
import type { TokenService } from '../modules/auth/token.js';
import { UserRepository, type Role } from '../modules/users/user.repository.js';
import { AppError } from './errors.js';

export interface AuthContext {
  userId: string;
  companyId: string;
  role: Role;
  jobRoleId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const invalidSession = () => new AppError(401, 'unauthorized', 'Sessão inválida ou expirada.');

export const requireAuth =
  (tokens: TokenService, db: Queryable): RequestHandler =>
  async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'unauthorized', 'Faça login para continuar.');
    }

    let userId: string;
    try {
      userId = tokens.verify(token).sub;
    } catch {
      throw invalidSession();
    }

    const user = await new UserRepository(db).findById(userId);
    if (!user) throw invalidSession();

    req.auth = { userId: user.id, companyId: user.companyId, role: user.role, jobRoleId: user.jobRoleId };
    next();
  };

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new AppError(403, 'forbidden', 'Você não tem permissão para esta ação.');
    }
    next();
  };
