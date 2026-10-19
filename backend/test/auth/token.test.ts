import { describe, expect, it } from 'vitest';
import { TokenService } from '../../src/modules/auth/token.js';

const payload = { sub: 'usuario-1', companyId: 'empresa-1', role: 'master' as const };

describe('TokenService', () => {
  it('gera um token e lê de volta os mesmos dados', () => {
    const tokens = new TokenService('segredo');

    expect(tokens.verify(tokens.sign(payload))).toEqual({ ...payload, ver: 0 });
    expect(tokens.verify(tokens.sign({ ...payload, ver: 3 })).ver).toBe(3);
  });

  it('recusa token assinado com outro segredo', () => {
    const token = new TokenService('segredo-a').sign(payload);

    expect(() => new TokenService('segredo-b').verify(token)).toThrow();
  });

  it('recusa token expirado', () => {
    const token = new TokenService('segredo', -1).sign(payload);

    expect(() => new TokenService('segredo').verify(token)).toThrow();
  });
});
