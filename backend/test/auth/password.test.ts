import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password.js';

describe('senhas', () => {
  it('nunca guarda a senha como texto puro', async () => {
    const hash = await hashPassword('minha-senha-123');

    expect(hash).not.toContain('minha-senha-123');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('confere a senha correta e recusa a errada', async () => {
    const hash = await hashPassword('minha-senha-123');

    expect(await verifyPassword('minha-senha-123', hash)).toBe(true);
    expect(await verifyPassword('outra-senha', hash)).toBe(false);
  });
});
