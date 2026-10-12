import type { RequestHandler } from 'express';
import type { TokenPayload, TokenService } from '../modules/auth/token.js';
import { AppError } from './errors.js';

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

export const requireAuth =
  (tokens: TokenService): RequestHandler =>
  (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'unauthorized', 'Faça login para continuar.');
    }
    try {
      req.auth = tokens.verify(token);
    } catch {
      throw new AppError(401, 'unauthorized', 'Sessão inválida ou expirada.');
    }
    next();
  };
