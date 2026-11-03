import { describe, expect, it } from 'vitest';
import { formatCnpj, isValidCnpj, normalizeCnpj } from '../../src/modules/companies/cnpj.js';

describe('CNPJ', () => {
  it('valida os dígitos verificadores do CNPJ numérico', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('11222333000182')).toBe(false);
  });

  it('valida o CNPJ alfanumérico do exemplo da Receita Federal', () => {
    expect(isValidCnpj('12ABC34501DE35')).toBe(true);
    expect(isValidCnpj('12ABC34501DE36')).toBe(false);
  });

  it('recusa tamanho errado, letras nos dígitos finais e sequências repetidas', () => {
    expect(isValidCnpj('1122233300018')).toBe(false);
    expect(isValidCnpj('12ABC34501DEA5')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('remove a máscara e deixa as letras maiúsculas', () => {
    expect(normalizeCnpj(' 12.abc.345/01de-35 ')).toBe('12ABC34501DE35');
  });

  it('formata com a máscara oficial', () => {
    expect(formatCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });
});
