import jwt from 'jsonwebtoken';
import type { Role } from '../users/user.repository.js';

export interface TokenPayload {
  sub: string;
  companyId: string;
  role: Role;
  ver?: number;
}

export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: jwt.SignOptions['expiresIn'] = '1d',
  ) {}

  sign(payload: TokenPayload): string {
    return jwt.sign({ companyId: payload.companyId, role: payload.role, ver: payload.ver ?? 0 }, this.secret, {
      subject: payload.sub,
      expiresIn: this.expiresIn,
    });
  }

  verify(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload;
    return { sub: decoded.sub!, companyId: decoded.companyId, role: decoded.role, ver: decoded.ver ?? 0 };
  }
}
