import { describe, expect, it } from 'vitest';
import { requireEnv } from '../../src/config/env.js';

describe('requireEnv', () => {
  it('devolve o valor da variável quando ela existe', () => {
    expect(requireEnv('PORTA', { PORTA: '3333' })).toBe('3333');
  });

  it('falha com mensagem clara quando a variável não existe', () => {
    expect(() => requireEnv('DATABASE_URL', {})).toThrow(
      'Variável de ambiente obrigatória não definida: DATABASE_URL',
    );
  });
});
